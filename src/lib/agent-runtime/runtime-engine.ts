/**
 * Protocol Runtime Engine
 * Command Center V3.0 - Phase 2
 * 
 * The core engine that executes protocols as stateful workflows.
 * Loads protocols, hydrates context, and executes steps via the state machine.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { ProtocolDefinition, ProtocolStep } from '../protocols/protocol-schema';
import type {
    RuntimeConfig,
    ExecutionRequest,
    ExecutionResult,
    ExecutionContext,
    StepResult,
    ToolRegistry,
    ExecutionRecordUpdate
} from './types';
import { ScaffoldHydrator } from './scaffold-hydrator';
import {
    LLMCallExecutor,
    ConditionalExecutor,
    ToolExecutionExecutor,
    WaitExecutor,
    HumanReviewExecutor
} from './step-executors';

export class ProtocolRuntimeEngine {
    private supabase: SupabaseClient;
    private openai: OpenAI;
    private config: RuntimeConfig;
    private hydrator: ScaffoldHydrator;
    private llmExecutor: LLMCallExecutor;
    private conditionalExecutor: ConditionalExecutor;
    private toolExecutor: ToolExecutionExecutor;
    private waitExecutor: WaitExecutor;
    private humanReviewExecutor: HumanReviewExecutor;

    constructor(config: RuntimeConfig, tools: ToolRegistry) {
        this.config = config;
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
        this.openai = new OpenAI({ apiKey: config.openaiApiKey });

        this.hydrator = new ScaffoldHydrator(
            this.supabase,
            `${config.supabaseUrl}/functions/v1/generate-embedding`
        );
        this.llmExecutor = new LLMCallExecutor(this.openai, config.defaultModel);
        this.conditionalExecutor = new ConditionalExecutor();
        this.toolExecutor = new ToolExecutionExecutor(tools);
        this.waitExecutor = new WaitExecutor();
        this.humanReviewExecutor = new HumanReviewExecutor();
    }

    /**
     * Executes a protocol from start to finish.
     */
    async execute(request: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = performance.now();
        let llmCalls = 0;
        let totalTokens = 0;
        const stepsExecuted: string[] = [];
        let executionId = '';

        try {
            // 1. Load protocol from database
            const protocol = await this.loadProtocol(request.protocol_id);
            if (!protocol) {
                throw new Error(`Protocol not found: ${request.protocol_id}`);
            }

            // 2. Validate inputs against scaffold
            this.validateInputs(protocol.scaffold.inputs, request.inputs);

            // 3. Create execution record
            executionId = await this.createExecutionRecord(request);

            // 4. Hydrate scaffold (context)
            const scaffoldData = await this.hydrator.hydrate(
                protocol.scaffold,
                request.inputs,
                request.workspace_id
            );

            // 5. Initialize execution context
            const context: ExecutionContext = {
                execution_id: executionId,
                workspace_id: request.workspace_id,
                inputs: request.inputs,
                scaffold: scaffoldData,
                step_outputs: {},
                variables: {}
            };

            // Update execution record with scaffold
            await this.updateExecutionRecord(executionId, {
                scaffold: scaffoldData,
                status: 'running'
            });

            // 6. Execute protocol state machine
            let currentStepId = protocol.steps[0].id;
            const maxSteps = 20; // Safety limit
            let stepCount = 0;

            while (currentStepId !== 'END' && stepCount < maxSteps) {
                const step = protocol.steps.find(s => s.id === currentStepId);
                if (!step) {
                    throw new Error(`Step not found: ${currentStepId}`);
                }

                if (this.config.enableLogging) {
                    console.log(`[Runtime] Executing step: ${currentStepId} (type: ${step.type})`);
                }

                // Execute step with timeout
                const timeoutMs = (step.timeout_seconds || 60) * 1000;
                const result = await this.executeWithTimeout(
                    () => this.executeStep(step, context),
                    timeoutMs
                );

                stepsExecuted.push(currentStepId);

                // Track metrics
                if (step.type === 'llm_call') {
                    llmCalls++;
                    totalTokens += result.tokens_used || 0;
                }

                // Store step output
                context.step_outputs[currentStepId] = result.output;

                // Update execution record
                await this.updateExecutionRecord(executionId, {
                    current_step: currentStepId,
                    steps_completed: stepsExecuted,
                    step_outputs: context.step_outputs,
                    llm_calls: llmCalls,
                    total_tokens: totalTokens
                });

                if (!result.success) {
                    // Handle step failure with retry or fallback
                    const retried = await this.handleStepFailure(step, context, result);
                    if (!retried.success) {
                        const errorHandler = protocol.error_handling?.global_fallback;
                        if (errorHandler && errorHandler !== currentStepId) {
                            currentStepId = errorHandler;
                            continue;
                        } else {
                            throw new Error(`Step ${currentStepId} failed: ${result.error}`);
                        }
                    }
                    // Update output after retry
                    context.step_outputs[currentStepId] = retried.output;
                }

                // Check for human review pause
                if (step.type === 'human_review') {
                    await this.updateExecutionRecord(executionId, { status: 'paused' });
                    return {
                        execution_id: executionId,
                        status: 'paused',
                        outputs: context.step_outputs,
                        steps_executed: stepsExecuted,
                        execution_time_ms: performance.now() - startTime,
                        llm_calls: llmCalls,
                        total_tokens: totalTokens
                    };
                }

                // Determine next step
                currentStepId = this.getNextStep(step, result, protocol.transitions);
                stepCount++;
            }

            // 7. Finalize execution
            await this.finalizeExecution(executionId, 'completed');

            return {
                execution_id: executionId,
                status: 'completed',
                outputs: context.step_outputs,
                steps_executed: stepsExecuted,
                execution_time_ms: performance.now() - startTime,
                llm_calls: llmCalls,
                total_tokens: totalTokens
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (executionId) {
                await this.updateExecutionRecord(executionId, {
                    status: 'failed',
                    error_message: errorMessage
                });
            }

            return {
                execution_id: executionId,
                status: 'failed',
                outputs: {},
                steps_executed: stepsExecuted,
                error: errorMessage,
                execution_time_ms: performance.now() - startTime,
                llm_calls: llmCalls,
                total_tokens: totalTokens
            };
        }
    }

    /**
     * Loads a protocol from the database.
     */
    private async loadProtocol(
        protocolId: string
    ): Promise<ProtocolDefinition | null> {
        const { data, error } = await this.supabase
            .from('protocols')
            .select('definition')
            .eq('id', protocolId)
            .eq('is_active', true)
            .single();

        if (error || !data) return null;
        return data.definition as ProtocolDefinition;
    }

    /**
     * Validates that required inputs are present.
     */
    private validateInputs(
        inputDefs: ProtocolDefinition['scaffold']['inputs'],
        inputs: Record<string, unknown>
    ): void {
        for (const inputDef of inputDefs) {
            if (inputDef.required !== false && !(inputDef.name in inputs)) {
                throw new Error(`Missing required input: ${inputDef.name}`);
            }

            // Apply defaults for missing optional inputs
            if (!(inputDef.name in inputs) && inputDef.default !== undefined) {
                inputs[inputDef.name] = inputDef.default;
            }
        }
    }

    /**
     * Creates an execution record in the database.
     */
    private async createExecutionRecord(request: ExecutionRequest): Promise<string> {
        const { data, error } = await this.supabase
            .from('protocol_executions')
            .insert({
                protocol_id: request.protocol_id,
                workspace_id: request.workspace_id,
                trigger_type: request.trigger_type,
                trigger_payload: request.inputs,
                status: 'pending',
                started_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (error) throw new Error(`Failed to create execution record: ${error.message}`);
        return data.id;
    }

    /**
     * Updates an execution record in the database.
     */
    private async updateExecutionRecord(
        executionId: string,
        updates: ExecutionRecordUpdate
    ): Promise<void> {
        const { error } = await this.supabase
            .from('protocol_executions')
            .update(updates)
            .eq('id', executionId);

        if (error && this.config.enableLogging) {
            console.error(`Failed to update execution record: ${error.message}`);
        }
    }

    /**
     * Finalizes an execution record.
     */
    private async finalizeExecution(executionId: string, status: string): Promise<void> {
        await this.supabase
            .from('protocol_executions')
            .update({
                status,
                completed_at: new Date().toISOString()
            })
            .eq('id', executionId);
    }

    /**
     * Executes a single step using the appropriate executor.
     */
    private async executeStep(
        step: ProtocolStep,
        context: ExecutionContext
    ): Promise<StepResult> {
        switch (step.type) {
            case 'llm_call':
                return this.llmExecutor.execute(step, context);

            case 'conditional':
                return this.conditionalExecutor.execute(step, context);

            case 'tool_execution':
                return this.toolExecutor.execute(step, context);

            case 'wait':
                return this.waitExecutor.execute(step, context);

            case 'human_review':
                return this.humanReviewExecutor.execute(step, context);

            case 'parallel': {
                // Execute parallel steps and wait for all
                const parallelStepIds =
                    ((step.config as Record<string, unknown>).parallel_steps as string[]) || [];
                const results = await Promise.all(
                    parallelStepIds.map(async (stepId: string) => {
                        // Note: This is simplified - would need full step lookup in production
                        return { success: true, output: null, execution_time_ms: 0 };
                    })
                );
                return {
                    success: results.every(r => r.success),
                    output: results.map(r => r.output),
                    execution_time_ms: Math.max(...results.map(r => r.execution_time_ms))
                };
            }

            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }
    }

    /**
     * Executes a function with a timeout.
     */
    private async executeWithTimeout<T>(
        fn: () => Promise<T>,
        timeoutMs: number
    ): Promise<T> {
        return Promise.race([
            fn(),
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error('Step execution timed out')), timeoutMs)
            )
        ]);
    }

    /**
     * Handles step failure with retry logic.
     */
    private async handleStepFailure(
        step: ProtocolStep,
        context: ExecutionContext,
        result: StepResult
    ): Promise<StepResult> {
        const retry = step.retry;
        if (!retry || !retry.max_attempts) {
            return result;
        }

        const maxAttempts = retry.max_attempts || 1;
        const backoffMs = retry.backoff_ms || 1000;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (this.config.enableLogging) {
                console.log(`[Runtime] Retrying step ${step.id}, attempt ${attempt}/${maxAttempts}`);
            }

            await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));

            const retryResult = await this.executeStep(step, context);
            if (retryResult.success) {
                return retryResult;
            }
        }

        return result;
    }

    /**
     * Determines the next step based on current step result and transitions.
     */
    private getNextStep(
        step: ProtocolStep,
        result: StepResult,
        transitions: ProtocolDefinition['transitions']
    ): string {
        const transition = transitions[step.id];

        if (!transition) return 'END';

        // For conditional steps, use the result's next_step
        if (step.type === 'conditional') {
            const output = result.output as { next_step?: string };
            if (output?.next_step) {
                return output.next_step;
            }
        }

        // Simple string transition
        if (typeof transition === 'string') {
            return transition;
        }

        // Object transition with success/failure paths
        if (typeof transition === 'object') {
            if (result.success && transition.on_success) {
                return transition.on_success;
            }
            if (!result.success && transition.on_failure) {
                return transition.on_failure;
            }
            // Check conditional transitions
            if (transition.on_condition) {
                for (const cond of transition.on_condition) {
                    // Simplified condition check - would need full evaluation in production
                    return cond.next;
                }
            }
        }

        return 'END';
    }
}
