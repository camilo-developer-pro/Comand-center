/**
 * Protocol Validator
 * Command Center V3.0 - Milestone 2.2
 * 
 * Validates protocol definitions against the JSON Schema and performs
 * semantic validation for state machine integrity.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
    PROTOCOL_SCHEMA,
    type ProtocolDefinition,
    type ComplexTransition
} from './protocol-schema';

// Initialize AJV with all errors mode and relaxed strict
const ajv = new Ajv({
    allErrors: true,
    strict: false,
    verbose: true
});
addFormats(ajv);

// Compile the schema
const validateSchema = ajv.compile(PROTOCOL_SCHEMA);

// =============================================================================
// Types
// =============================================================================

/** Validation error with path and message */
export interface ValidationError {
    path: string;
    message: string;
    keyword?: string;
}

/** Validation result */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

// =============================================================================
// Main Validation Function
// =============================================================================

/**
 * Validates a protocol definition against schema and semantic rules.
 * 
 * @param definition - The protocol definition to validate
 * @returns ValidationResult with valid flag and any errors
 * 
 * @example
 * ```ts
 * const result = validateProtocol(myProtocol);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateProtocol(definition: unknown): ValidationResult {
    // Step 1: JSON Schema validation
    const valid = validateSchema(definition);

    if (!valid) {
        return {
            valid: false,
            errors: (validateSchema.errors || []).map(err => ({
                path: err.instancePath || '/',
                message: err.message || 'Unknown validation error',
                keyword: err.keyword
            }))
        };
    }

    // Step 2: Semantic validation
    const semanticErrors = validateSemantics(definition as ProtocolDefinition);

    if (semanticErrors.length > 0) {
        return { valid: false, errors: semanticErrors };
    }

    return { valid: true, errors: [] };
}

// =============================================================================
// Semantic Validation
// =============================================================================

/**
 * Validates semantic rules that can't be expressed in JSON Schema:
 * - All transition targets must exist as steps (or be 'END')
 * - No orphan steps (except first step which is the entry point)
 * - Conditional steps must have valid if_true/if_false targets
 * - Parallel steps must reference valid step IDs
 */
function validateSemantics(definition: ProtocolDefinition): ValidationError[] {
    const errors: ValidationError[] = [];
    const stepIds = new Set(definition.steps.map(s => s.id));

    // Track which steps are referenced
    const referencedSteps = new Set<string>();

    // First step is always the entry point
    if (definition.steps.length > 0) {
        referencedSteps.add(definition.steps[0].id);
    }

    // Validate transitions
    for (const [stepId, transition] of Object.entries(definition.transitions)) {
        // Check source step exists
        if (!stepIds.has(stepId)) {
            errors.push({
                path: `/transitions/${stepId}`,
                message: `Transition source step '${stepId}' does not exist in steps array`
            });
            continue;
        }

        // Extract all targets from the transition
        const targets = extractTransitionTargets(transition);

        // Validate each target
        for (const target of targets) {
            if (target === 'END') {
                continue; // END is a valid terminal
            }

            if (!stepIds.has(target)) {
                errors.push({
                    path: `/transitions/${stepId}`,
                    message: `Transition target '${target}' does not exist in steps array`
                });
            } else {
                referencedSteps.add(target);
            }
        }
    }

    // Also collect steps referenced via conditional if_true/if_false configs
    for (const step of definition.steps) {
        if (step.type === 'conditional') {
            const config = step.config as Record<string, unknown>;
            if (config.if_true && config.if_true !== 'END' && stepIds.has(config.if_true as string)) {
                referencedSteps.add(config.if_true as string);
            }
            if (config.if_false && config.if_false !== 'END' && stepIds.has(config.if_false as string)) {
                referencedSteps.add(config.if_false as string);
            }
        }
    }

    // Also collect steps referenced via error_handling.global_fallback
    if (definition.error_handling?.global_fallback) {
        const fallback = definition.error_handling.global_fallback;
        if (fallback !== 'END' && stepIds.has(fallback)) {
            referencedSteps.add(fallback);
        }
    }

    // Check for orphan steps (steps that no transition points to)
    for (const step of definition.steps) {
        if (!referencedSteps.has(step.id)) {
            errors.push({
                path: `/steps`,
                message: `Step '${step.id}' is unreachable - no transition points to it and it's not the entry point`
            });
        }
    }

    // Validate step-specific rules
    for (let i = 0; i < definition.steps.length; i++) {
        const step = definition.steps[i];
        const stepErrors = validateStepConfig(step, stepIds, i);
        errors.push(...stepErrors);
    }

    // Check that error_handling.global_fallback references a valid step
    if (definition.error_handling?.global_fallback) {
        const fallback = definition.error_handling.global_fallback;
        if (fallback !== 'END' && !stepIds.has(fallback)) {
            errors.push({
                path: '/error_handling/global_fallback',
                message: `Global fallback step '${fallback}' does not exist in steps array`
            });
        }
    }

    return errors;
}

/**
 * Extracts all target step IDs from a transition.
 */
function extractTransitionTargets(transition: string | ComplexTransition): string[] {
    if (typeof transition === 'string') {
        return [transition];
    }

    const targets: string[] = [];

    if (transition.on_success) {
        targets.push(transition.on_success);
    }
    if (transition.on_failure) {
        targets.push(transition.on_failure);
    }
    if (transition.on_condition) {
        for (const cond of transition.on_condition) {
            targets.push(cond.next);
        }
    }

    return targets;
}

/**
 * Validates step-specific configuration rules.
 */
function validateStepConfig(
    step: ProtocolDefinition['steps'][number],
    stepIds: Set<string>,
    index: number
): ValidationError[] {
    const errors: ValidationError[] = [];
    const config = step.config as Record<string, unknown>;

    switch (step.type) {
        case 'conditional':
            // Conditional steps must have if_true and if_false
            if (!config.if_true || !config.if_false) {
                errors.push({
                    path: `/steps/${index}/config`,
                    message: `Conditional step '${step.id}' must have both 'if_true' and 'if_false' targets`
                });
            } else {
                // Validate targets exist
                if (config.if_true !== 'END' && !stepIds.has(config.if_true as string)) {
                    errors.push({
                        path: `/steps/${index}/config/if_true`,
                        message: `Conditional target 'if_true' step '${config.if_true}' does not exist`
                    });
                }
                if (config.if_false !== 'END' && !stepIds.has(config.if_false as string)) {
                    errors.push({
                        path: `/steps/${index}/config/if_false`,
                        message: `Conditional target 'if_false' step '${config.if_false}' does not exist`
                    });
                }
            }
            break;

        case 'parallel':
            // Parallel steps must have parallel_steps array
            if (!Array.isArray(config.parallel_steps) || config.parallel_steps.length === 0) {
                errors.push({
                    path: `/steps/${index}/config`,
                    message: `Parallel step '${step.id}' must have a non-empty 'parallel_steps' array`
                });
            } else {
                // Validate all parallel step references
                for (const parallelStepId of config.parallel_steps as string[]) {
                    if (!stepIds.has(parallelStepId)) {
                        errors.push({
                            path: `/steps/${index}/config/parallel_steps`,
                            message: `Parallel step reference '${parallelStepId}' does not exist`
                        });
                    }
                }
            }
            break;

        case 'tool_execution':
            // Tool execution must have tool_name
            if (!config.tool_name) {
                errors.push({
                    path: `/steps/${index}/config`,
                    message: `Tool execution step '${step.id}' must have a 'tool_name'`
                });
            }
            break;

        case 'llm_call':
            // LLM call should have at least a prompt template
            if (!config.system_prompt && !config.user_prompt_template) {
                errors.push({
                    path: `/steps/${index}/config`,
                    message: `LLM call step '${step.id}' should have at least one of 'system_prompt' or 'user_prompt_template'`
                });
            }
            break;
    }

    return errors;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Checks if a protocol definition is valid without returning error details.
 * Useful for quick validation checks.
 */
export function isValidProtocol(definition: unknown): definition is ProtocolDefinition {
    return validateProtocol(definition).valid;
}

/**
 * Creates a minimal valid protocol definition for testing.
 */
export function createMinimalProtocol(name: string, intent: string): ProtocolDefinition {
    return {
        metadata: {
            name,
            version: '1.0.0',
            intent
        },
        scaffold: {
            inputs: [],
            context_sources: []
        },
        steps: [
            {
                id: 'start',
                type: 'llm_call',
                config: {
                    user_prompt_template: 'Process input: {{input}}'
                }
            }
        ],
        transitions: {
            start: 'END'
        }
    };
}

/**
 * Formats validation errors into a human-readable string.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) {
        return 'No errors';
    }

    return errors
        .map((err, i) => `${i + 1}. [${err.path}] ${err.message}`)
        .join('\n');
}
