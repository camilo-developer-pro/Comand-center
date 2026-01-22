/**
 * Agent Runtime Types
 * Command Center V3.0 - Phase 2 Final
 * 
 * Type definitions for the protocol execution engine.
 */

import type {
    ProtocolDefinition,
    ProtocolStep,
    ProtocolScaffold,
    ScaffoldInput
} from '../protocols/protocol-schema';

// =============================================================================
// Configuration Types
// =============================================================================

/** Runtime configuration for the agent engine */
export interface RuntimeConfig {
    supabaseUrl: string;
    supabaseKey: string;
    openaiApiKey: string;
    defaultModel: string;
    maxExecutionTime: number;
    enableLogging: boolean;
}

// =============================================================================
// Execution Request/Response Types
// =============================================================================

/** Request to execute a protocol */
export interface ExecutionRequest {
    protocol_id: string;
    workspace_id: string;
    inputs: Record<string, unknown>;
    trigger_type: 'manual' | 'scheduled' | 'event' | 'chained';
    parent_execution_id?: string;
}

/** Result of protocol execution */
export interface ExecutionResult {
    execution_id: string;
    status: 'completed' | 'failed' | 'paused';
    outputs: Record<string, unknown>;
    steps_executed: string[];
    error?: string;
    execution_time_ms: number;
    llm_calls: number;
    total_tokens: number;
}

// =============================================================================
// Step Execution Types
// =============================================================================

/** Interface for step executors */
export interface StepExecutor {
    execute(
        step: ProtocolStep,
        context: ExecutionContext
    ): Promise<StepResult>;
}

/** Result of a single step execution */
export interface StepResult {
    success: boolean;
    output: unknown;
    error?: string;
    tokens_used?: number;
    execution_time_ms: number;
}

/** Context available during protocol execution */
export interface ExecutionContext {
    execution_id: string;
    workspace_id: string;
    inputs: Record<string, unknown>;
    scaffold: Record<string, unknown>;
    step_outputs: Record<string, unknown>;
    variables: Record<string, unknown>;
}

// =============================================================================
// Scaffold Hydration Types
// =============================================================================

/** Interface for scaffold hydrator */
export interface IScaffoldHydrator {
    hydrate(
        scaffold: ProtocolScaffold,
        inputs: Record<string, unknown>,
        workspaceId: string
    ): Promise<Record<string, unknown>>;
}

// =============================================================================
// Tool Registry Types
// =============================================================================

/** Tool function signature */
export type ToolFunction = (params: Record<string, unknown>) => Promise<unknown>;

/** Tool registry for available tools */
export type ToolRegistry = Map<string, ToolFunction>;

// =============================================================================
// Database Record Types
// =============================================================================

/** Protocol record from database */
export interface ProtocolRecord {
    id: string;
    workspace_id: string;
    name: string;
    version: string;
    definition: ProtocolDefinition;
    is_active: boolean;
    is_system: boolean;
}

/** Execution record update payload */
export interface ExecutionRecordUpdate {
    current_step?: string;
    steps_completed?: string[];
    step_outputs?: Record<string, unknown>;
    scaffold?: Record<string, unknown>;
    status?: 'running' | 'completed' | 'failed' | 'paused';
    error_message?: string;
    llm_calls?: number;
    total_tokens?: number;
}
