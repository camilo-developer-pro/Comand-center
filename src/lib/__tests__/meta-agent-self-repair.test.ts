/**
 * Meta-Agent Self-Repair Test Suite
 * Command Center V3.0 - Phase 3.1
 *
 * Tests that intentionally break tools to verify autonomous self-correction.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { ProtocolRuntimeEngine } from '../agent-runtime/runtime-engine';
import { createDefaultToolRegistry } from '../agent-runtime/tools';
import { extendWithMetaAgentTools } from '../agent-runtime/meta-agent-tools';

// Manual env loader
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    }
} catch (e) {
    console.error('Failed to load .env.local manually:', e);
}

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

describe('Meta-Agent Self-Repair', () => {
    let engine: ProtocolRuntimeEngine;
    let testProtocolId: string;
    let testWorkspaceId: string;

    beforeAll(async () => {
        // Get test workspace
        const { data: wsId, error: wsError } = await supabase.rpc('get_test_workspace_id');
        if (wsError || !wsId) {
            throw new Error('No workspace found for test');
        }
        testWorkspaceId = wsId;

        // Create test protocol with intentionally fragile configuration
        const { data: protocol, error } = await supabase
            .from('protocols')
            .insert({
                workspace_id: testWorkspaceId,
                name: 'test_fragile_protocol',
                version: '1.0.0',
                description: 'Test protocol for self-repair validation',
                protocol_type: 'workflow',
                definition: {
                    metadata: {
                        name: 'test_fragile_protocol',
                        version: '1.0.0',
                        intent: 'Test protocol for self-repair validation'
                    },
                    scaffold: {
                        inputs: [{ name: 'input_value', type: 'string', required: true }],
                        context_sources: []
                    },
                    steps: [
                        {
                            id: 'fragile_tool_step',
                            type: 'tool_execution',
                            config: {
                                tool_name: 'test_fragile_tool',
                                tool_params: { value: '{{inputs.input_value}}' },
                                output_schema: {
                                    type: 'object',
                                    properties: {
                                        result: { type: 'string' }
                                    }
                                }
                            },
                            timeout_seconds: 5
                        }
                    ],
                    transitions: {
                        'fragile_tool_step': 'END'
                    },
                    error_handling: { global_fallback: null }
                },
                is_system: false
            })
            .select('id')
            .single();

        if (error) throw error;
        testProtocolId = protocol!.id;

        // Set up engine with breakable tools
        const tools = extendWithMetaAgentTools(createDefaultToolRegistry());

        // Add intentionally breakable tool
        tools.set('test_fragile_tool', async (params) => {
            const value = params.value as string;

            // Intentionally return wrong schema on certain inputs
            if (value === 'TRIGGER_SCHEMA_MISMATCH') {
                return { wrong_key: 'This will cause schema mismatch' };
            }

            if (value === 'TRIGGER_TIMEOUT') {
                await new Promise(resolve => setTimeout(resolve, 10000));
                return { result: 'too late' };
            }

            if (value === 'TRIGGER_EXCEPTION') {
                throw new Error('Intentional tool failure for testing');
            }

            return { result: `Processed: ${value}` };
        });

        engine = new ProtocolRuntimeEngine({
            supabaseUrl: process.env.SUPABASE_URL!,
            supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            openaiApiKey: process.env.OPENAI_API_KEY!,
            defaultModel: 'gpt-4o-mini',
            maxExecutionTime: 60000,
            enableLogging: true
        }, tools);
    });

    afterAll(async () => {
        // Cleanup test protocol
        await supabase.from('protocols').delete().eq('id', testProtocolId);
        await supabase.from('error_logs').delete().eq('protocol_id', testProtocolId);
    });

    describe('TOOL_SCHEMA_MISMATCH Self-Repair', () => {
        it('should detect schema mismatch, diagnose, and patch protocol', async () => {
            // Execute protocol with trigger that causes schema mismatch
            const result = await engine.execute({
                protocol_id: testProtocolId,
                workspace_id: testWorkspaceId,
                inputs: { input_value: 'TRIGGER_SCHEMA_MISMATCH' },
                trigger_type: 'manual'
            });

            expect(result.status).toBe('failed');

            // Wait for error to be logged
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Fetch the logged error
            const { data: errors } = await supabase
                .from('error_logs')
                .select('*')
                .eq('protocol_id', testProtocolId)
                .eq('error_class', 'TOOL_SCHEMA_MISMATCH')
                .order('created_at', { ascending: false })
                .limit(1);

            expect(errors).toHaveLength(1);
            const errorLog = errors![0];

            // Execute Meta-Agent to self-repair
            const metaAgentResult = await engine.execute({
                protocol_id: '550e8400-e29b-41d4-a716-446655440000', // Meta-Agent protocol ID
                workspace_id: testWorkspaceId,
                inputs: {
                    error_id: errorLog.id,
                    error_class: 'TOOL_SCHEMA_MISMATCH',
                    protocol_id: testProtocolId,
                    step_id: 'fragile_tool_step'
                },
                trigger_type: 'event'
            });

            expect(metaAgentResult.status).toBe('completed');

            // Verify protocol was patched
            const { data: patchedProtocol } = await supabase
                .from('protocols')
                .select('version, definition')
                .eq('id', testProtocolId)
                .single();

            expect(parseInt(patchedProtocol!.version)).toBeGreaterThan(1);

            // Verify error record was updated
            const { data: updatedError } = await supabase
                .from('error_logs')
                .select('patched_at, patch_version')
                .eq('id', errorLog.id)
                .single();

            expect(updatedError!.patched_at).not.toBeNull();
            expect(updatedError!.patch_version).toBe(parseInt(patchedProtocol!.version));
        });
    });

    describe('TIMEOUT_EXCEEDED Self-Repair', () => {
        it('should detect timeout and increase timeout_seconds in protocol', async () => {
            const result = await engine.execute({
                protocol_id: testProtocolId,
                workspace_id: testWorkspaceId,
                inputs: { input_value: 'TRIGGER_TIMEOUT' },
                trigger_type: 'manual'
            });

            expect(result.status).toBe('failed');

            await new Promise(resolve => setTimeout(resolve, 1000));

            const { data: errors } = await supabase
                .from('error_logs')
                .select('*')
                .eq('protocol_id', testProtocolId)
                .eq('error_class', 'TIMEOUT_EXCEEDED')
                .order('created_at', { ascending: false })
                .limit(1);

            expect(errors).toHaveLength(1);
            const errorLog = errors![0];

            // Run Meta-Agent
            await engine.execute({
                protocol_id: '550e8400-e29b-41d4-a716-446655440000',
                workspace_id: testWorkspaceId,
                inputs: {
                    error_id: errorLog.id,
                    error_class: 'TIMEOUT_EXCEEDED',
                    protocol_id: testProtocolId,
                    step_id: 'fragile_tool_step'
                },
                trigger_type: 'event'
            });

            // Verify timeout was increased
            const { data: patchedProtocol } = await supabase
                .from('protocols')
                .select('definition')
                .eq('id', testProtocolId)
                .single();

            const patchedStep = patchedProtocol!.definition.steps.find(
                (s: { id: string }) => s.id === 'fragile_tool_step'
            );

            expect(patchedStep!.timeout_seconds).toBeGreaterThan(5);
        });
    });

    describe('Recursion Guard', () => {
        it('should escalate to human when Meta-Agent itself fails', async () => {
            // Simulate an error in the Meta-Agent protocol
            const { data: error, error: insertError } = await supabase
                .from('error_logs')
                .insert({
                    execution_id: '00000000-0000-0000-0000-000000000000',
                    step_id: 'llm_enhanced_diagnosis',
                    protocol_id: '550e8400-e29b-41d4-a716-446655440000', // Meta-Agent itself
                    protocol_version: 1,
                    error_class: 'LLM_PARSE_ERROR',
                    error_message: 'Meta-Agent LLM response was not valid JSON'
                })
                .select('id')
                .single();

            if (insertError) throw insertError;

            const result = await engine.execute({
                protocol_id: '550e8400-e29b-41d4-a716-446655440000',
                workspace_id: testWorkspaceId,
                inputs: {
                    error_id: error!.id,
                    error_class: 'LLM_PARSE_ERROR',
                    protocol_id: '550e8400-e29b-41d4-a716-446655440000',
                    step_id: 'llm_enhanced_diagnosis'
                },
                trigger_type: 'event'
            });

            // Should complete (not fail) but should have escalated
            expect(result.status).toBe('completed');
            expect(result.steps_executed).toContain('escalate_to_human');

            // Verify review task was created
            const { data: tasks } = await supabase
                .from('review_tasks')
                .select('*')
                .eq('context->>error_id', error!.id);

            expect(tasks).toHaveLength(1);
        });
    });

    describe('Pattern-Based Escalation', () => {
        it('should escalate after 3 failed patches for same fingerprint', async () => {
            // Create 3 prior failed patch attempts
            for (let i = 0; i < 3; i++) {
                const { error } = await supabase.from('error_logs').insert({
                    execution_id: `00000000-0000-0000-0000-00000000000${i}`,
                    step_id: 'same_step',
                    protocol_id: testProtocolId,
                    protocol_version: i + 1,
                    error_class: 'TOOL_EXECUTION_FAILURE',
                    error_message: 'Same recurring error',
                    diagnosed_at: new Date().toISOString(),
                    patched_at: new Date().toISOString(),
                    patch_version: i + 2
                });
                if (error) throw error;
            }

            // Create a 4th occurrence
            const { data: newError, error: insertError } = await supabase
                .from('error_logs')
                .insert({
                    execution_id: '00000000-0000-0000-0000-000000000003',
                    step_id: 'same_step',
                    protocol_id: testProtocolId,
                    protocol_version: 4,
                    error_class: 'TOOL_EXECUTION_FAILURE',
                    error_message: 'Same recurring error'
                })
                .select('id')
                .single();

            if (insertError) throw insertError;

            const result = await engine.execute({
                protocol_id: '550e8400-e29b-41d4-a716-446655440000',
                workspace_id: testWorkspaceId,
                inputs: {
                    error_id: newError!.id,
                    error_class: 'TOOL_EXECUTION_FAILURE',
                    protocol_id: testProtocolId,
                    step_id: 'same_step'
                },
                trigger_type: 'event'
            });

            // Should escalate due to pattern history
            expect(result.steps_executed).toContain('escalate_to_human');
        });
    });
});