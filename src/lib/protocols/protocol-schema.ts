/**
 * Protocol Engine JSON Schema Definition
 * Command Center V3.0 - Milestone 2.2
 * 
 * Defines the schema for deterministic state machines that guide agent behavior.
 * Protocols are the "DNA" of the autonomous agent system.
 */

export const PROTOCOL_SCHEMA = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://commandcenter.ai/schemas/protocol/v1",
    title: "Protocol Definition Schema",
    description: "JSON Schema for Command Center Protocol Engine",
    type: "object",
    required: ["metadata", "scaffold", "steps", "transitions"],
    additionalProperties: false,

    properties: {
        metadata: {
            type: "object",
            required: ["name", "version", "intent"],
            properties: {
                name: { type: "string", minLength: 1, maxLength: 100 },
                version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
                intent: { type: "string", description: "Human-readable purpose" },
                tags: { type: "array", items: { type: "string" } },
                author: { type: "string" },
                requires_approval: { type: "boolean", default: false }
            }
        },

        scaffold: {
            type: "object",
            description: "Context hydration specification",
            required: ["inputs", "context_sources"],
            properties: {
                inputs: {
                    type: "array",
                    items: {
                        type: "object",
                        required: ["name", "type"],
                        properties: {
                            name: { type: "string" },
                            type: { enum: ["string", "number", "boolean", "object", "array", "entity_id", "file"] },
                            required: { type: "boolean", default: true },
                            default: {},
                            validation: {
                                type: "object",
                                properties: {
                                    pattern: { type: "string" },
                                    min: { type: "number" },
                                    max: { type: "number" },
                                    enum: { type: "array" }
                                }
                            }
                        }
                    }
                },
                context_sources: {
                    type: "array",
                    items: {
                        type: "object",
                        required: ["source_type", "query"],
                        properties: {
                            source_type: {
                                enum: ["hybrid_search", "graph_query", "database", "api", "previous_step"]
                            },
                            query: { type: "string" },
                            params: { type: "object" },
                            output_key: { type: "string" },
                            max_tokens: { type: "integer", default: 2000 }
                        }
                    }
                },
                max_context_tokens: { type: "integer", default: 8000 }
            }
        },

        steps: {
            type: "array",
            minItems: 1,
            items: {
                type: "object",
                required: ["id", "type", "config"],
                properties: {
                    id: { type: "string", pattern: "^[a-z][a-z0-9_]*$" },
                    type: {
                        enum: ["llm_call", "tool_execution", "conditional", "parallel", "human_review", "wait"]
                    },
                    config: {
                        type: "object",
                        properties: {
                            // LLM Call config
                            model: { type: "string" },
                            system_prompt: { type: "string" },
                            user_prompt_template: { type: "string" },
                            output_schema: { type: "object" },
                            temperature: { type: "number", minimum: 0, maximum: 2 },
                            max_tokens: { type: "integer" },

                            // Tool execution config
                            tool_name: { type: "string" },
                            tool_params: { type: "object" },

                            // Conditional config
                            condition: { type: "string" },
                            if_true: { type: "string" },
                            if_false: { type: "string" },

                            // Parallel config
                            parallel_steps: { type: "array", items: { type: "string" } },

                            // Human review config
                            review_prompt: { type: "string" },
                            timeout_action: { enum: ["approve", "reject", "escalate"] },

                            // Wait config
                            wait_for: { enum: ["event", "time", "condition"] },
                            wait_config: { type: "object" }
                        }
                    },
                    retry: {
                        type: "object",
                        properties: {
                            max_attempts: { type: "integer", default: 3 },
                            backoff_ms: { type: "integer", default: 1000 }
                        }
                    },
                    timeout_seconds: { type: "integer", default: 60 }
                }
            }
        },

        transitions: {
            type: "object",
            description: "State machine transitions: step_id -> next_step_id or END",
            additionalProperties: {
                oneOf: [
                    { type: "string" },
                    {
                        type: "object",
                        properties: {
                            on_success: { type: "string" },
                            on_failure: { type: "string" },
                            on_condition: {
                                type: "array",
                                items: {
                                    type: "object",
                                    required: ["condition", "next"],
                                    properties: {
                                        condition: { type: "string" },
                                        next: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        },

        error_handling: {
            type: "object",
            properties: {
                global_fallback: { type: "string", description: "Step ID to jump to on unhandled error" },
                retry_policy: {
                    type: "object",
                    properties: {
                        max_retries: { type: "integer", default: 3 },
                        backoff_type: { enum: ["linear", "exponential"], default: "exponential" },
                        base_delay_ms: { type: "integer", default: 1000 }
                    }
                },
                notification: {
                    type: "object",
                    properties: {
                        on_failure: { type: "boolean", default: true },
                        channels: { type: "array", items: { enum: ["email", "slack", "webhook"] } }
                    }
                }
            }
        }
    }
} as const;

// =============================================================================
// TypeScript Types Derived from Schema
// =============================================================================

/** Protocol metadata - identification and configuration */
export interface ProtocolMetadata {
    name: string;
    version: string;
    intent: string;
    tags?: string[];
    author?: string;
    requires_approval?: boolean;
}

/** Scaffold input definition for protocol context */
export interface ScaffoldInput {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'entity_id' | 'file';
    required?: boolean;
    default?: unknown;
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        enum?: unknown[];
    };
}

/** Context source for scaffold hydration */
export interface ContextSource {
    source_type: 'hybrid_search' | 'graph_query' | 'database' | 'api' | 'previous_step';
    query: string;
    params?: Record<string, unknown>;
    output_key: string;
    max_tokens?: number;
}

/** Scaffold specification - inputs and context sources */
export interface ProtocolScaffold {
    inputs: ScaffoldInput[];
    context_sources: ContextSource[];
    max_context_tokens?: number;
}

/** Step types supported by the protocol engine */
export type StepType =
    | 'llm_call'
    | 'tool_execution'
    | 'conditional'
    | 'parallel'
    | 'human_review'
    | 'wait';

/** LLM Call step configuration */
export interface LLMCallConfig {
    model?: string;
    system_prompt?: string;
    user_prompt_template?: string;
    output_schema?: Record<string, unknown>;
    temperature?: number;
    max_tokens?: number;
}

/** Tool execution step configuration */
export interface ToolExecutionConfig {
    tool_name: string;
    tool_params?: Record<string, unknown>;
}

/** Conditional step configuration */
export interface ConditionalConfig {
    condition: string;
    if_true: string;
    if_false: string;
}

/** Parallel execution step configuration */
export interface ParallelConfig {
    parallel_steps: string[];
}

/** Human review step configuration */
export interface HumanReviewConfig {
    review_prompt: string;
    timeout_action?: 'approve' | 'reject' | 'escalate';
}

/** Wait step configuration */
export interface WaitConfig {
    wait_for: 'event' | 'time' | 'condition';
    wait_config?: Record<string, unknown>;
}

/** Union type for all step configurations */
export type StepConfig =
    | LLMCallConfig
    | ToolExecutionConfig
    | ConditionalConfig
    | ParallelConfig
    | HumanReviewConfig
    | WaitConfig
    | Record<string, unknown>;

/** Retry configuration for steps */
export interface RetryConfig {
    max_attempts?: number;
    backoff_ms?: number;
}

/** Protocol step definition */
export interface ProtocolStep {
    id: string;
    type: StepType;
    config: StepConfig;
    retry?: RetryConfig;
    timeout_seconds?: number;
}

/** Simple transition - direct step ID or END */
export type SimpleTransition = string;

/** Complex transition with success/failure/condition paths */
export interface ComplexTransition {
    on_success?: string;
    on_failure?: string;
    on_condition?: Array<{
        condition: string;
        next: string;
    }>;
}

/** Transition can be simple or complex */
export type ProtocolTransition = SimpleTransition | ComplexTransition;

/** Error handling configuration */
export interface ErrorHandling {
    global_fallback?: string;
    retry_policy?: {
        max_retries?: number;
        backoff_type?: 'linear' | 'exponential';
        base_delay_ms?: number;
    };
    notification?: {
        on_failure?: boolean;
        channels?: ('email' | 'slack' | 'webhook')[];
    };
}

/** Complete protocol definition */
export interface ProtocolDefinition {
    metadata: ProtocolMetadata;
    scaffold: ProtocolScaffold;
    steps: ProtocolStep[];
    transitions: Record<string, ProtocolTransition>;
    error_handling?: ErrorHandling;
}

// =============================================================================
// Execution State Types
// =============================================================================

/** Execution status enum */
export type ExecutionStatus =
    | 'pending'
    | 'running'
    | 'paused'
    | 'completed'
    | 'failed'
    | 'cancelled';

/** Protocol execution state tracking */
export interface ProtocolExecutionState {
    execution_id: string;
    protocol_id: string;
    current_step: string;
    steps_completed: string[];
    step_outputs: Record<string, unknown>;
    scaffold_data: Record<string, unknown>;
    status: ExecutionStatus;
    error?: string;
    llm_calls?: number;
    total_tokens?: number;
}

/** Trigger types for protocol execution */
export type TriggerType = 'manual' | 'scheduled' | 'event' | 'chained';

/** Protocol execution record (matches database schema) */
export interface ProtocolExecution {
    id: string;
    protocol_id: string;
    workspace_id: string;
    trigger_type: TriggerType;
    trigger_payload?: Record<string, unknown>;
    current_step: string | null;
    steps_completed: string[];
    step_outputs: Record<string, unknown>;
    scaffold: Record<string, unknown>;
    status: ExecutionStatus;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
    created_at: string;
    llm_calls: number;
    total_tokens: number;
}

// =============================================================================
// Database Record Types
// =============================================================================

/** Protocol type enum */
export type ProtocolType =
    | 'ingestion'
    | 'resolution'
    | 'error_handling'
    | 'workflow'
    | 'custom';

/** Protocol database record (matches database schema) */
export interface ProtocolRecord {
    id: string;
    workspace_id: string;
    name: string;
    version: string;
    description?: string;
    protocol_type: ProtocolType;
    definition: ProtocolDefinition;
    max_steps: number;
    timeout_seconds: number;
    retry_policy: {
        max_retries: number;
        backoff_ms: number;
    };
    is_active: boolean;
    is_system: boolean;
    created_at: string;
    updated_at: string;
    created_by?: string;
}
