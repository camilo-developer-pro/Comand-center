/**
 * Agent Runtime API Endpoint
 * Command Center V3.0 - Phase 2
 * 
 * Vercel Edge Function for executing protocols.
 * POST /api/agent-runtime/execute
 */

import { ProtocolRuntimeEngine } from '../../src/lib/agent-runtime/runtime-engine';
import { createDefaultToolRegistry } from '../../src/lib/agent-runtime/tools';
import type { ExecutionRequest, RuntimeConfig } from '../../src/lib/agent-runtime/types';

export const config = {
    runtime: 'edge',
    maxDuration: 300 // 5 minutes max for protocol execution
};

export default async function handler(request: Request): Promise<Response> {
    // Only allow POST requests
    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const body: ExecutionRequest = await request.json();

        // Validate required fields
        if (!body.protocol_id || !body.workspace_id) {
            return new Response(
                JSON.stringify({
                    error: 'Missing required fields: protocol_id, workspace_id'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Validate trigger type
        const validTriggers = ['manual', 'scheduled', 'event', 'chained'];
        if (!validTriggers.includes(body.trigger_type)) {
            return new Response(
                JSON.stringify({
                    error: `Invalid trigger_type. Must be one of: ${validTriggers.join(', ')}`
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Get environment configuration
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;

        if (!supabaseUrl || !supabaseKey || !openaiKey) {
            console.error('Missing required environment variables');
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const runtimeConfig: RuntimeConfig = {
            supabaseUrl,
            supabaseKey,
            openaiApiKey: openaiKey,
            defaultModel: process.env.DEFAULT_LLM_MODEL || 'gpt-4o',
            maxExecutionTime: 300000, // 5 minutes
            enableLogging: process.env.NODE_ENV !== 'production'
        };

        // Create runtime with default tools
        const tools = createDefaultToolRegistry();
        const engine = new ProtocolRuntimeEngine(runtimeConfig, tools);

        // Execute protocol
        const result = await engine.execute(body);

        // Return result
        const status = result.status === 'failed' ? 500 : 200;
        return new Response(
            JSON.stringify(result),
            {
                status,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Execution-Id': result.execution_id,
                    'X-LLM-Calls': String(result.llm_calls),
                    'X-Total-Tokens': String(result.total_tokens),
                    'X-Execution-Time-Ms': String(Math.round(result.execution_time_ms))
                }
            }
        );

    } catch (error) {
        console.error('Runtime execution error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
