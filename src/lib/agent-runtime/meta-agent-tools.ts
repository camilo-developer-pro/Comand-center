/**
 * Meta-Agent Tool Implementations
 * Command Center V3.0 - Phase 3.1
 *
 * Tools for protocol patching, validation, and version management.
 */

import { createClient } from '@supabase/supabase-js';
import Ajv from 'ajv';
import { PROTOCOL_SCHEMA } from '../protocols/protocol-schema';
import type { ToolFunction, ToolRegistry } from './types';
import type { ProtocolDefinition } from '../protocols/protocol-schema';

// Initialize AJV for JSON Schema validation
const ajv = new Ajv({ allErrors: true, strict: false });
const validateProtocol = ajv.compile(PROTOCOL_SCHEMA);

/**
 * Applies a JSON path-based patch to a protocol definition.
 * Supports nested paths like "steps.step_id.config.timeout_ms"
 */
function applyPatch(
    protocol: ProtocolDefinition,
    path: string,
    value: unknown,
    action: string
): ProtocolDefinition {
    const patched = JSON.parse(JSON.stringify(protocol)); // Deep clone
    const pathParts = path.split('.');

    let current: Record<string, unknown> = patched as unknown as Record<string, unknown>;

    // Navigate to parent of target
    for (let i = 0; i < pathParts.length - 1; i++) {
        const key = pathParts[i];

        // Handle array access for steps (e.g., steps.step_id -> find step with id)
        if (key === 'steps' && Array.isArray(current.steps)) {
            const stepId = pathParts[i + 1];
            const stepIndex = (current.steps as Array<{ id: string }>).findIndex(s => s.id === stepId);
            if (stepIndex === -1) {
                throw new Error(`Step not found: ${stepId}`);
            }
            current = (current.steps as Record<string, unknown>[])[stepIndex];
            i++; // Skip the step_id part
        } else {
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key] as Record<string, unknown>;
        }
    }

    const finalKey = pathParts[pathParts.length - 1];

    switch (action) {
        case 'UPDATE_PROTOCOL_SCHEMA':
        case 'UPDATE_PROMPT_TEMPLATE':
        case 'INCREASE_TIMEOUT':
            current[finalKey] = value;
            break;

        case 'ADD_TRANSITION':
            if (!patched.transitions) {
                (patched as unknown as Record<string, unknown>).transitions = {};
            }
            (patched.transitions as Record<string, unknown>)[finalKey] = value;
            break;

        case 'ADD_FALLBACK_SOURCE':
            // For scaffold sources, mark as optional
            if (current && typeof current === 'object') {
                (current as Record<string, unknown>).optional = true;
            }
            break;

        case 'ADD_RETRY_CONFIG':
            current['retry'] = value;
            break;

        default:
            current[finalKey] = value;
    }

    return patched;
}

/**
 * Tool: Generate protocol patch from diagnosis
 */
export const protocolPatchGenerator: ToolFunction = async (params) => {
    const protocolId = params.protocol_id as string;
    const diagnosis = params.diagnosis as Record<string, unknown>;
    const llmEnhancement = params.llm_enhancement as Record<string, unknown> | null;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch current protocol
    const { data: protocol, error } = await supabase
        .from('protocols')
        .select('definition, version')
        .eq('id', protocolId)
        .single();

    if (error || !protocol) {
        throw new Error(`Failed to fetch protocol: ${protocolId}`);
    }

    // Determine patch parameters
    const suggestedFix = (diagnosis.suggested_fix || llmEnhancement) as Record<string, unknown>;

    if (!suggestedFix || !suggestedFix.patch_path) {
        throw new Error('No valid patch suggestion available');
    }

    const patchAction = (suggestedFix.patch_action || suggestedFix.action) as string;
    const patchPath = suggestedFix.patch_path as string;
    const patchValue = suggestedFix.patch_value ?? suggestedFix.new_value;

    // Apply the patch
    const patchedProtocol = applyPatch(
        protocol.definition as ProtocolDefinition,
        patchPath,
        patchValue,
        patchAction
    );

    // Increment version in metadata
    patchedProtocol.metadata.version = incrementVersion(patchedProtocol.metadata.version);

    return {
        patched_protocol: patchedProtocol,
        original_version: protocol.version,
        patch_applied: {
            action: patchAction,
            path: patchPath,
            value: patchValue
        }
    };
};

/**
 * Tool: Validate protocol against JSON Schema
 */
export const protocolSchemaValidator: ToolFunction = async (params) => {
    const patchedProtocol = params.patched_protocol as ProtocolDefinition;

    const valid = validateProtocol(patchedProtocol);

    if (!valid) {
        return {
            valid: false,
            errors: validateProtocol.errors?.map(e => ({
                path: e.instancePath,
                message: e.message,
                keyword: e.keyword
            }))
        };
    }

    // Additional semantic validation
    const semanticErrors: string[] = [];

    // Check all transitions reference valid step IDs
    const stepIds = new Set(patchedProtocol.steps.map(s => s.id));
    stepIds.add('END');

    for (const [stepId, transition] of Object.entries(patchedProtocol.transitions)) {
        if (!stepIds.has(stepId)) {
            semanticErrors.push(`Transition references non-existent step: ${stepId}`);
        }

        if (typeof transition === 'string' && !stepIds.has(transition)) {
            semanticErrors.push(`Transition target is invalid: ${transition}`);
        } else if (typeof transition === 'object') {
            if (transition.on_success && !stepIds.has(transition.on_success)) {
                semanticErrors.push(`on_success target invalid: ${transition.on_success}`);
            }
            if (transition.on_failure && !stepIds.has(transition.on_failure)) {
                semanticErrors.push(`on_failure target invalid: ${transition.on_failure}`);
            }
        }
    }

    // Check scaffold input references in templates
    const inputNames = new Set(patchedProtocol.scaffold.inputs.map(i => i.name));
    const templateRegex = /\{\{inputs\.(\w+)\}\}/g;

    for (const step of patchedProtocol.steps) {
        const configStr = JSON.stringify(step.config);
        let match;
        while ((match = templateRegex.exec(configStr)) !== null) {
            if (!inputNames.has(match[1])) {
                semanticErrors.push(`Step ${step.id} references undefined input: ${match[1]}`);
            }
        }
    }

    if (semanticErrors.length > 0) {
        return {
            valid: false,
            errors: semanticErrors.map(msg => ({ path: '', message: msg, keyword: 'semantic' }))
        };
    }

    return { valid: true, errors: [] };
};

/**
 * Tool: Commit validated patch to database
 */
export const protocolVersionCommitter: ToolFunction = async (params) => {
    const protocolId = params.protocol_id as string;
    const newDefinition = params.new_definition as ProtocolDefinition;
    const patchReason = params.patch_reason as string;
    const errorId = params.error_id as string;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Start transaction via RPC
    const { data, error } = await supabase.rpc('commit_protocol_patch', {
        p_protocol_id: protocolId,
        p_new_definition: newDefinition,
        p_patch_reason: patchReason,
        p_error_id: errorId
    });

    if (error) {
        throw new Error(`Failed to commit patch: ${error.message}`);
    }

    return {
        success: true,
        new_version: data.new_version,
        committed_at: data.committed_at
    };
};

/**
 * Tool: Create human review task
 */
export const createReviewTask: ToolFunction = async (params) => {
    const taskType = params.task_type as string;
    const priority = params.priority as string;
    const context = params.context as Record<string, unknown>;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
        .from('review_tasks')
        .insert({
            task_type: taskType,
            priority,
            context,
            status: 'pending',
            created_at: new Date().toISOString()
        })
        .select('id')
        .single();

    if (error) {
        throw new Error(`Failed to create review task: ${error.message}`);
    }

    // Notify via pg_notify for real-time dashboard updates
    await supabase.rpc('notify_review_task_created', { task_id: data.id });

    return {
        task_id: data.id,
        status: 'pending'
    };
};

/**
 * Increments semantic version string
 */
function incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2]++; // Increment patch version
    return parts.join('.');
}

/**
 * Extend tool registry with Meta-Agent tools
 */
export function extendWithMetaAgentTools(baseRegistry: ToolRegistry): ToolRegistry {
    const extended = new Map(baseRegistry);

    extended.set('protocol_patch_generator', protocolPatchGenerator);
    extended.set('protocol_schema_validator', protocolSchemaValidator);
    extended.set('protocol_version_committer', protocolVersionCommitter);
    extended.set('create_review_task', createReviewTask);

    return extended;
}