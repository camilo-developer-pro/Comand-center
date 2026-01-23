/**
 * Meta-Agent Protocol Definition
 * Command Center V3.0 - Phase 3.1
 *
 * The self-correcting agent that diagnoses errors and patches protocols.
 * CRITICAL: This protocol has a recursion guard to prevent infinite loops.
 */

import { ProtocolDefinition } from './protocol-schema';

export const META_AGENT_PROTOCOL: ProtocolDefinition = {
    metadata: {
        name: "meta_agent_error_handler",
        version: "1.0.0",
        intent: "Diagnose protocol failures and generate self-correcting patches",
        tags: ["system", "meta", "self-repair", "autonomous"],
        author: "system",
        requires_approval: false  // Meta-Agent patches are auto-committed for high-confidence fixes
    },

    scaffold: {
        inputs: [
            { name: "error_id", type: "string", required: true },
            { name: "error_class", type: "string", required: true },
            { name: "protocol_id", type: "string", required: true },
            { name: "step_id", type: "string", required: true }
        ],
        context_sources: [
            {
                source_type: "database",
                query: `
                        SELECT e.*, p.definition as protocol_definition
                        FROM episodic_memory.error_logs e
                        JOIN procedural_memory.protocols p ON p.id = e.protocol_id
                        WHERE e.id = '{{inputs.error_id}}'::UUID
                    `,
                output_key: "error_details"
            },
            {
                source_type: "database",
                query: `
                        SELECT * FROM episodic_memory.error_patterns
                        WHERE fingerprint = (
                            SELECT fingerprint FROM episodic_memory.error_logs
                            WHERE id = '{{inputs.error_id}}'::UUID
                        )
                    `,
                output_key: "historical_patterns"
            },
            {
                source_type: "database",
                query: `
                        SELECT protocol_id, patch_version, diagnosis
                        FROM episodic_memory.error_logs
                        WHERE protocol_id = '{{inputs.protocol_id}}'::UUID
                          AND patched_at IS NOT NULL
                        ORDER BY patched_at DESC
                        LIMIT 5
                    `,
                output_key: "recent_patches"
            }
        ]
    },

    steps: [
        {
            id: "check_recursion_guard",
            type: "conditional",
            config: {
                conditions: [
                    {
                        // If the error occurred IN the Meta-Agent itself, escalate to human
                        expression: "{{context.error_details.protocol_id}} === 'meta_agent_error_handler'",
                        result: { next_step: "escalate_to_human" }
                    },
                    {
                        // If we've patched this same error 3+ times recently, escalate
                        expression: "{{context.historical_patterns.patched_count}} >= 3",
                        result: { next_step: "escalate_to_human" }
                    }
                ],
                default_result: { next_step: "run_database_diagnosis" }
            }
        },
        {
            id: "run_database_diagnosis",
            type: "tool_execution",
            config: {
                tool_name: "supabase_rpc",
                tool_params: {
                    function_name: "episodic_memory.diagnose_error",
                    params: { p_error_id: "{{inputs.error_id}}" }
                }
            },
            timeout_seconds: 10
        },
        {
            id: "evaluate_diagnosis",
            type: "conditional",
            config: {
                conditions: [
                    {
                        expression: "{{step_outputs.run_database_diagnosis.requires_human_review}} === true",
                        result: { next_step: "escalate_to_human" }
                    },
                    {
                        expression: "{{step_outputs.run_database_diagnosis.confidence}} < 0.7",
                        result: { next_step: "llm_enhanced_diagnosis" }
                    }
                ],
                default_result: { next_step: "generate_patch" }
            }
        },
        {
            id: "llm_enhanced_diagnosis",
            type: "llm_call",
            config: {
                model: "claude-sonnet-4-20250514",
                temperature: 0.2,
                max_tokens: 2000,
                system_prompt: `You are the Meta-Agent diagnostic specialist for Command Center V3.0.

Your task is to analyze protocol execution errors and generate precise patches.

CONTEXT:
- Error Class: {{inputs.error_class}}
- Step ID: {{inputs.step_id}}
- Database Diagnosis: {{step_outputs.run_database_diagnosis | json}}
- Protocol Definition: {{context.error_details.protocol_definition | json}}
- Historical Patterns: {{context.historical_patterns | json}}

OUTPUT FORMAT (strict JSON):
{
    "enhanced_hypothesis": "string - detailed root cause analysis",
    "patch_action": "UPDATE_PROTOCOL_SCHEMA | UPDATE_PROMPT_TEMPLATE | ADD_TRANSITION | INCREASE_TIMEOUT | ADD_FALLBACK_SOURCE | ADD_RETRY_CONFIG",
    "patch_path": "string - JSON path in protocol definition (e.g., 'steps.step_id.config.timeout_ms')",
    "patch_value": any - the new value to set,
    "confidence": number - 0.0 to 1.0,
    "reasoning": "string - explanation for the patch"
}`,
                user_prompt_template: `Analyze this error and generate a patch:

Error Message: {{context.error_details.error_message}}
Step Input: {{context.error_details.step_input | json}}
Step Output: {{context.error_details.step_output | json}}
Expected Schema: {{context.error_details.expected_schema | json}}
Actual Output: {{context.error_details.actual_output | json}}

Generate the most precise patch to fix this error.`,
                output_schema: {
                    type: "object",
                    required: ["patch_action", "patch_path", "patch_value", "confidence"],
                    properties: {
                        enhanced_hypothesis: { type: "string" },
                        patch_action: { type: "string" },
                        patch_path: { type: "string" },
                        patch_value: {},
                        confidence: { type: "number" },
                        reasoning: { type: "string" }
                    }
                }
            }
        },
        {
            id: "generate_patch",
            type: "tool_execution",
            config: {
                tool_name: "protocol_patch_generator",
                tool_params: {
                    protocol_id: "{{inputs.protocol_id}}",
                    diagnosis: "{{step_outputs.run_database_diagnosis}}",
                    llm_enhancement: "{{step_outputs.llm_enhanced_diagnosis}}"
                }
            }
        },
        {
            id: "validate_patch",
            type: "tool_execution",
            config: {
                tool_name: "protocol_schema_validator",
                tool_params: {
                    patched_protocol: "{{step_outputs.generate_patch.patched_protocol}}"
                }
            }
        },
        {
            id: "check_validation",
            type: "conditional",
            config: {
                conditions: [
                    {
                        expression: "{{step_outputs.validate_patch.valid}} === false",
                        result: { next_step: "escalate_to_human" }
                    }
                ],
                default_result: { next_step: "commit_patch" }
            }
        },
        {
            id: "commit_patch",
            type: "tool_execution",
            config: {
                tool_name: "protocol_version_committer",
                tool_params: {
                    protocol_id: "{{inputs.protocol_id}}",
                    new_definition: "{{step_outputs.generate_patch.patched_protocol}}",
                    patch_reason: "{{step_outputs.run_database_diagnosis.hypothesis}}",
                    error_id: "{{inputs.error_id}}"
                }
            }
        },
        {
            id: "log_success",
            type: "tool_execution",
            config: {
                tool_name: "supabase_rpc",
                tool_params: {
                    function_name: "episodic_memory.log_event",
                    params: {
                        category: "AGENT_ACTION",
                        event_type: "META_AGENT_PATCH_COMMITTED",
                        summary: "Protocol {{inputs.protocol_id}} patched successfully",
                        details: {
                            error_id: "{{inputs.error_id}}",
                            patch_version: "{{step_outputs.commit_patch.new_version}}"
                        }
                    }
                }
            }
        },
        {
            id: "escalate_to_human",
            type: "tool_execution",
            config: {
                tool_name: "create_review_task",
                tool_params: {
                    task_type: "PROTOCOL_ERROR_REVIEW",
                    priority: "high",
                    context: {
                        error_id: "{{inputs.error_id}}",
                        protocol_id: "{{inputs.protocol_id}}",
                        diagnosis: "{{step_outputs.run_database_diagnosis}}",
                        reason: "Meta-Agent could not auto-resolve this error"
                    }
                }
            }
        }
    ],

    transitions: {
        "check_recursion_guard": {
            on_success: "run_database_diagnosis"  // Overridden by conditional
        },
        "run_database_diagnosis": {
            on_success: "evaluate_diagnosis",
            on_failure: "escalate_to_human"
        },
        "evaluate_diagnosis": {
            on_success: "generate_patch"  // Overridden by conditional
        },
        "llm_enhanced_diagnosis": {
            on_success: "generate_patch",
            on_failure: "escalate_to_human"
        },
        "generate_patch": {
            on_success: "validate_patch",
            on_failure: "escalate_to_human"
        },
        "validate_patch": {
            on_success: "check_validation"
        },
        "check_validation": {
            on_success: "commit_patch"
        },
        "commit_patch": {
            on_success: "log_success",
            on_failure: "escalate_to_human"
        },
        "log_success": {
            on_success: "END"
        },
        "escalate_to_human": {
            on_success: "END"
        }
    },

    error_handling: {
        global_fallback: "escalate_to_human",
        retry_policy: {
            max_retries: 1  // Meta-Agent should not retry aggressively
        }
    }
};

// Export migration SQL to seed the protocol
export const META_AGENT_SEED_SQL = `
INSERT INTO procedural_memory.protocols (id, name, slug, version, definition, is_system)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Meta-Agent Error Handler',
    'meta-agent-error-handler',
    '1.0.0',
    '${JSON.stringify(META_AGENT_PROTOCOL).replace(/'/g, "''")}'::JSONB,
    TRUE  -- System protocol, cannot be deleted by users
)
ON CONFLICT (id) DO UPDATE SET
    definition = EXCLUDED.definition,
    version = procedural_memory.protocols.version + 1;
`;