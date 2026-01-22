/**
 * Protocol Seeding Utility
 * Command Center V3.0
 * 
 * Seeds bootstrap protocols into the database for a workspace.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { BOOTSTRAP_PROTOCOLS } from './bootstrap-protocols';
import { validateProtocol } from './protocol-validator';
import type { ProtocolType } from './protocol-schema';

export interface SeedResult {
    success: boolean;
    created: string[];
    skipped: string[];
    errors: Array<{ name: string; error: string }>;
}

/**
 * Seeds all bootstrap protocols into the database for a workspace.
 * Validates each protocol before insertion and skips duplicates.
 */
export async function seedBootstrapProtocols(
    supabase: SupabaseClient,
    workspaceId: string
): Promise<SeedResult> {
    const result: SeedResult = {
        success: true,
        created: [],
        skipped: [],
        errors: []
    };

    for (const protocol of BOOTSTRAP_PROTOCOLS) {
        // Validate protocol
        const validation = validateProtocol(protocol);
        if (!validation.valid) {
            result.errors.push({
                name: protocol.metadata.name,
                error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
            });
            result.success = false;
            continue;
        }

        // Check if protocol already exists
        const { data: existing } = await supabase
            .from('protocols')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('name', protocol.metadata.name)
            .eq('version', protocol.metadata.version)
            .maybeSingle();

        if (existing) {
            result.skipped.push(`${protocol.metadata.name} v${protocol.metadata.version}`);
            continue;
        }

        // Insert protocol
        const { error } = await supabase
            .from('protocols')
            .insert({
                workspace_id: workspaceId,
                name: protocol.metadata.name,
                version: protocol.metadata.version,
                description: protocol.metadata.intent,
                protocol_type: getProtocolType(protocol.metadata.name),
                definition: protocol,
                is_system: true,
                is_active: true
            });

        if (error) {
            result.errors.push({
                name: protocol.metadata.name,
                error: error.message
            });
            result.success = false;
        } else {
            result.created.push(protocol.metadata.name);
        }
    }

    return result;
}

/**
 * Determines the protocol type based on its name
 */
function getProtocolType(name: string): ProtocolType {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('ingestion')) return 'ingestion';
    if (lowerName.includes('resolution')) return 'resolution';
    if (lowerName.includes('error')) return 'error_handling';
    if (lowerName.includes('workflow')) return 'workflow';
    return 'custom';
}

/**
 * Verifies that all bootstrap protocols exist in the database
 */
export async function verifyBootstrapProtocols(
    supabase: SupabaseClient,
    workspaceId: string
): Promise<{ complete: boolean; missing: string[] }> {
    const { data: protocols, error } = await supabase
        .from('protocols')
        .select('name, version')
        .eq('workspace_id', workspaceId)
        .eq('is_system', true);

    if (error) {
        throw new Error(`Failed to verify protocols: ${error.message}`);
    }

    const existingNames = new Set(protocols?.map(p => p.name) || []);
    const requiredNames = BOOTSTRAP_PROTOCOLS.map(p => p.metadata.name);
    const missing = requiredNames.filter(name => !existingNames.has(name));

    return {
        complete: missing.length === 0,
        missing
    };
}

/**
 * Gets a specific bootstrap protocol by name
 */
export function getBootstrapProtocol(name: string) {
    return BOOTSTRAP_PROTOCOLS.find(p => p.metadata.name === name);
}
