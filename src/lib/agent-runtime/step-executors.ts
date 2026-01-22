/**
 * Step Executors
 * Command Center V3.0 - Phase 2
 * 
 * Executors for each step type in the protocol engine:
 * - LLM Call: Executes prompts via OpenAI API
 * - Conditional: Evaluates conditions and determines next step
 * - Tool Execution: Runs registered tool functions
 */

import OpenAI from 'openai';
import type { ProtocolStep } from '../protocols/protocol-schema';
import type { ExecutionContext, StepResult, StepExecutor, ToolRegistry } from './types';

// =============================================================================
// LLM Call Executor
// =============================================================================

export class LLMCallExecutor implements StepExecutor {
    private openai: OpenAI;
    private defaultModel: string;

    constructor(openai: OpenAI, defaultModel = 'gpt-4o') {
        this.openai = openai;
        this.defaultModel = defaultModel;
    }

    async execute(step: ProtocolStep, context: ExecutionContext): Promise<StepResult> {
        const startTime = performance.now();
        const config = step.config as Record<string, unknown>;

        try {
            // Interpolate prompts with context
            const systemPrompt = (config.system_prompt as string) || '';
            const userPrompt = this.interpolateTemplate(
                (config.user_prompt_template as string) || '',
                context
            );

            const response = await this.openai.chat.completions.create({
                model: (config.model as string) || this.defaultModel,
                temperature: (config.temperature as number) ?? 0.7,
                max_tokens: (config.max_tokens as number) || 2000,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: config.output_schema
                    ? { type: 'json_object' }
                    : undefined
            });

            const content = response.choices[0]?.message?.content || '';
            let output: unknown = content;

            // Parse JSON if output schema is defined
            if (config.output_schema) {
                try {
                    output = JSON.parse(content);
                } catch {
                    // If JSON parsing fails, return structured error
                    output = { raw_response: content, parse_error: true };
                }
            }

            return {
                success: true,
                output,
                tokens_used: response.usage?.total_tokens || 0,
                execution_time_ms: performance.now() - startTime
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                output: null,
                error: errorMessage,
                execution_time_ms: performance.now() - startTime
            };
        }
    }

    /**
     * Interpolates template with execution context.
     */
    private interpolateTemplate(template: string, context: ExecutionContext): string {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.getNestedValue(context, path.trim());
            if (value === undefined) return match;
            return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
        });
    }

    /**
     * Gets nested value with optional filter support.
     */
    private getNestedValue(obj: unknown, path: string): unknown {
        // Handle filters
        if (path.includes('|')) {
            const [actualPath, ...filters] = path.split('|').map(s => s.trim());
            let value = this.getNestedValue(obj, actualPath);

            for (const filter of filters) {
                value = this.applyFilter(value, filter);
            }
            return value;
        }

        const parts = path.split('.');
        let current: unknown = obj;

        for (const part of parts) {
            if (current === null || current === undefined) break;
            current = (current as Record<string, unknown>)[part];
        }

        return current;
    }

    private applyFilter(value: unknown, filter: string): unknown {
        const [name, ...args] = filter.split(':').map(s => s.trim());

        switch (name) {
            case 'truncate': {
                const len = parseInt(args[0]) || 500;
                return typeof value === 'string' ? value.substring(0, len) : value;
            }
            case 'length':
                return Array.isArray(value) ? value.length : 0;
            case 'last': {
                const count = parseInt(args[0]) || 1;
                return Array.isArray(value) ? value.slice(-count) : value;
            }
            case 'format':
                if (args[0] === 'numbered_list' && Array.isArray(value)) {
                    return value.map((v, i) => `${i + 1}. ${JSON.stringify(v)}`).join('\n');
                }
                return value;
            default:
                return value;
        }
    }
}

// =============================================================================
// Conditional Executor
// =============================================================================

export class ConditionalExecutor implements StepExecutor {
    async execute(step: ProtocolStep, context: ExecutionContext): Promise<StepResult> {
        const startTime = performance.now();
        const config = step.config as Record<string, unknown>;

        try {
            const conditionResult = this.evaluateCondition(
                config.condition as string,
                context
            );

            return {
                success: true,
                output: {
                    condition_result: conditionResult,
                    next_step: conditionResult
                        ? config.if_true as string
                        : config.if_false as string
                },
                execution_time_ms: performance.now() - startTime
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                output: null,
                error: errorMessage,
                execution_time_ms: performance.now() - startTime
            };
        }
    }

    /**
     * Evaluates a condition expression.
     * Supports: {{path}} > 0, {{path}} === 'value', {{path}} && {{other}}
     */
    private evaluateCondition(condition: string, context: ExecutionContext): boolean {
        const interpolated = condition.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.getNestedValue(context, path.trim());
            return JSON.stringify(value);
        });

        try {
            // Safe evaluation using Function constructor with limited scope
            // eslint-disable-next-line no-new-func
            const evaluate = new Function('return ' + interpolated);
            return Boolean(evaluate());
        } catch {
            return false;
        }
    }

    private getNestedValue(obj: unknown, path: string): unknown {
        return path.split('.').reduce(
            (curr, key) => (curr as Record<string, unknown>)?.[key],
            obj
        );
    }
}

// =============================================================================
// Tool Execution Executor
// =============================================================================

export class ToolExecutionExecutor implements StepExecutor {
    private tools: ToolRegistry;

    constructor(tools: ToolRegistry) {
        this.tools = tools;
    }

    async execute(step: ProtocolStep, context: ExecutionContext): Promise<StepResult> {
        const startTime = performance.now();
        const config = step.config as Record<string, unknown>;
        const toolName = config.tool_name as string;

        try {
            const tool = this.tools.get(toolName);
            if (!tool) {
                throw new Error(`Tool not found: ${toolName}`);
            }

            // Interpolate params with context
            const params = this.interpolateParams(
                (config.tool_params as Record<string, unknown>) || {},
                context
            );

            const output = await tool(params);

            return {
                success: true,
                output,
                execution_time_ms: performance.now() - startTime
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                output: null,
                error: errorMessage,
                execution_time_ms: performance.now() - startTime
            };
        }
    }

    /**
     * Interpolates all parameter values with context.
     */
    private interpolateParams(
        params: Record<string, unknown>,
        context: ExecutionContext
    ): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string' && value.includes('{{')) {
                let interpolated = value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
                    const resolved = this.getNestedValue(context, path.trim());
                    if (resolved === undefined) return match;
                    return typeof resolved === 'object'
                        ? JSON.stringify(resolved)
                        : String(resolved);
                });

                // Try to parse as JSON if it looks like an object/array
                try {
                    if (interpolated.startsWith('{') || interpolated.startsWith('[')) {
                        result[key] = JSON.parse(interpolated);
                    } else {
                        result[key] = interpolated;
                    }
                } catch {
                    result[key] = interpolated;
                }
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    private getNestedValue(obj: unknown, path: string): unknown {
        return path.split('.').reduce(
            (curr, key) => (curr as Record<string, unknown>)?.[key],
            obj
        );
    }
}

// =============================================================================
// Wait Executor
// =============================================================================

export class WaitExecutor implements StepExecutor {
    async execute(step: ProtocolStep, context: ExecutionContext): Promise<StepResult> {
        const startTime = performance.now();
        const config = step.config as Record<string, unknown>;
        const waitConfig = config.wait_config as Record<string, unknown> || {};

        const waitMs = ((waitConfig.seconds as number) || 0) * 1000;

        await new Promise(resolve => setTimeout(resolve, waitMs));

        return {
            success: true,
            output: { waited_ms: waitMs },
            execution_time_ms: performance.now() - startTime
        };
    }
}

// =============================================================================
// Human Review Executor
// =============================================================================

export class HumanReviewExecutor implements StepExecutor {
    async execute(step: ProtocolStep, context: ExecutionContext): Promise<StepResult> {
        const startTime = performance.now();

        // Human review pauses execution and waits for external input
        // This implementation marks the step as awaiting review
        return {
            success: true,
            output: {
                status: 'awaiting_review',
                step_id: step.id,
                execution_id: context.execution_id,
                review_prompt: (step.config as Record<string, unknown>).review_prompt
            },
            execution_time_ms: performance.now() - startTime
        };
    }
}
