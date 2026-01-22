/**
 * Protocol Validator Tests
 * Command Center V3.0 - Milestone 2.2 Verification
 */

import { describe, it, expect } from 'vitest';
import {
    validateProtocol,
    isValidProtocol,
    createMinimalProtocol,
    formatValidationErrors
} from '../protocol-validator';
import { type ProtocolDefinition } from '../protocol-schema';

describe('Protocol Validator', () => {
    describe('validateProtocol', () => {
        it('should validate a minimal valid protocol', () => {
            const protocol = createMinimalProtocol('test-protocol', 'Testing validation');
            const result = validateProtocol(protocol);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject protocol missing required fields', () => {
            const invalid = {
                metadata: { name: 'test' }, // missing version and intent
                scaffold: { inputs: [] }, // missing context_sources
                steps: [],
                transitions: {}
            };

            const result = validateProtocol(invalid);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should reject invalid version format', () => {
            const invalid: ProtocolDefinition = {
                metadata: {
                    name: 'test',
                    version: 'v1', // should be semver like 1.0.0
                    intent: 'Testing'
                },
                scaffold: { inputs: [], context_sources: [] },
                steps: [{ id: 'start', type: 'llm_call', config: { user_prompt_template: 'test' } }],
                transitions: { start: 'END' }
            };

            const result = validateProtocol(invalid);
            expect(result.valid).toBe(false);
        });

        it('should reject invalid step ID format', () => {
            const invalid: ProtocolDefinition = {
                metadata: { name: 'test', version: '1.0.0', intent: 'Testing' },
                scaffold: { inputs: [], context_sources: [] },
                steps: [{
                    id: 'Invalid-Step', // must be lowercase with underscores
                    type: 'llm_call',
                    config: {}
                }],
                transitions: { 'Invalid-Step': 'END' }
            };

            const result = validateProtocol(invalid);
            expect(result.valid).toBe(false);
        });
    });

    describe('Semantic Validation', () => {
        it('should detect orphan steps', () => {
            const protocol: ProtocolDefinition = {
                metadata: { name: 'test', version: '1.0.0', intent: 'Testing' },
                scaffold: { inputs: [], context_sources: [] },
                steps: [
                    { id: 'start', type: 'llm_call', config: { user_prompt_template: 'test' } },
                    { id: 'orphan', type: 'llm_call', config: { user_prompt_template: 'test' } }
                ],
                transitions: {
                    start: 'END'
                    // orphan step is never referenced
                }
            };

            const result = validateProtocol(protocol);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('unreachable'))).toBe(true);
        });

        it('should detect invalid transition targets', () => {
            const protocol: ProtocolDefinition = {
                metadata: { name: 'test', version: '1.0.0', intent: 'Testing' },
                scaffold: { inputs: [], context_sources: [] },
                steps: [
                    { id: 'start', type: 'llm_call', config: { user_prompt_template: 'test' } }
                ],
                transitions: {
                    start: 'nonexistent_step' // this step doesn't exist
                }
            };

            const result = validateProtocol(protocol);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('does not exist'))).toBe(true);
        });

        it('should validate conditional step requirements', () => {
            const protocol: ProtocolDefinition = {
                metadata: { name: 'test', version: '1.0.0', intent: 'Testing' },
                scaffold: { inputs: [], context_sources: [] },
                steps: [
                    {
                        id: 'start',
                        type: 'conditional',
                        config: {
                            condition: 'x > 0'
                            // missing if_true and if_false
                        }
                    }
                ],
                transitions: { start: 'END' }
            };

            const result = validateProtocol(protocol);
            expect(result.valid).toBe(false);
        });

        it('should validate complex multi-step protocol', () => {
            const protocol: ProtocolDefinition = {
                metadata: {
                    name: 'lead-qualification',
                    version: '1.0.0',
                    intent: 'Qualify incoming leads',
                    tags: ['crm', 'automation'],
                    author: 'system'
                },
                scaffold: {
                    inputs: [
                        { name: 'lead_id', type: 'entity_id', required: true },
                        { name: 'threshold', type: 'number', default: 50 }
                    ],
                    context_sources: [
                        {
                            source_type: 'database',
                            query: 'SELECT * FROM leads WHERE id = $1',
                            output_key: 'lead_data'
                        }
                    ]
                },
                steps: [
                    {
                        id: 'analyze',
                        type: 'llm_call',
                        config: {
                            model: 'claude-4',
                            user_prompt_template: 'Analyze lead: {{lead_data}}'
                        }
                    },
                    {
                        id: 'score',
                        type: 'tool_execution',
                        config: {
                            tool_name: 'calculate_lead_score',
                            tool_params: { lead_id: '{{lead_id}}' }
                        }
                    },
                    {
                        id: 'decide',
                        type: 'conditional',
                        config: {
                            condition: 'step_outputs.score.value >= inputs.threshold',
                            if_true: 'notify',
                            if_false: 'END'
                        }
                    },
                    {
                        id: 'notify',
                        type: 'tool_execution',
                        config: {
                            tool_name: 'send_notification'
                        }
                    }
                ],
                transitions: {
                    analyze: 'score',
                    score: 'decide',
                    decide: {
                        on_success: 'notify',
                        on_failure: 'END'
                    },
                    notify: 'END'
                },
                error_handling: {
                    global_fallback: 'notify',
                    retry_policy: {
                        max_retries: 3,
                        backoff_type: 'exponential'
                    }
                }
            };

            const result = validateProtocol(protocol);
            expect(result.valid).toBe(true);
        });
    });

    describe('Utility Functions', () => {
        it('isValidProtocol should return boolean', () => {
            const valid = createMinimalProtocol('test', 'Testing');
            expect(isValidProtocol(valid)).toBe(true);
            expect(isValidProtocol({})).toBe(false);
        });

        it('formatValidationErrors should format errors nicely', () => {
            const errors = [
                { path: '/metadata/version', message: 'Invalid format' },
                { path: '/steps/0/id', message: 'Must match pattern' }
            ];

            const formatted = formatValidationErrors(errors);
            expect(formatted).toContain('1.');
            expect(formatted).toContain('/metadata/version');
            expect(formatted).toContain('Invalid format');
        });

        it('formatValidationErrors should handle empty array', () => {
            expect(formatValidationErrors([])).toBe('No errors');
        });
    });
});
