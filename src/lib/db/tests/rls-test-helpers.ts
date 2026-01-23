/**
 * RLS Testing Utilities
 * 
 * These helpers allow testing RLS policies by impersonating different users.
 * Only use in development/test environments.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types';

interface TestUser {
    id: string;
    email: string;
}

/**
 * Create a Supabase client that impersonates a specific user
 * This is useful for testing RLS policies
 */
export function createImpersonatedClient(
    userId: string,
    role: 'authenticated' | 'anon' = 'authenticated'
) {
    const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
            global: {
                headers: {
                    // Impersonate user via custom claims
                    Authorization: `Bearer ${generateTestJWT(userId, role)}`,
                },
            },
        }
    );

    return supabase;
}

/**
 * Generate a test JWT for RLS testing
 * NOTE: This requires the service role key and should only be used in tests
 */
function generateTestJWT(userId: string, role: string): string {
    // In a real implementation, you would use the supabase-js library
    // to generate a proper JWT. This is a placeholder.
    // For actual testing, use Supabase's test helpers or mock auth.
    throw new Error('Implement with actual JWT generation for your test environment');
}

/**
 * Test that a user can access expected workspaces
 */
export async function testWorkspaceAccess(
    client: ReturnType<typeof createClient<Database>>,
    expectedWorkspaceIds: string[]
) {
    const { data, error } = await client
        .from('workspaces')
        .select('id');

    if (error) {
        throw new Error(`Workspace access test failed: ${error.message}`);
    }

    const actualIds = data?.map(w => w.id) || [];
    const missingIds = expectedWorkspaceIds.filter(id => !actualIds.includes(id));
    const extraIds = actualIds.filter(id => !expectedWorkspaceIds.includes(id));

    if (missingIds.length > 0) {
        throw new Error(`Missing expected workspaces: ${missingIds.join(', ')}`);
    }

    if (extraIds.length > 0) {
        throw new Error(`Unexpected workspaces accessible: ${extraIds.join(', ')}`);
    }

    return true;
}

/**
 * Test that a user cannot access specific blocks
 */
export async function testBlockIsolation(
    client: ReturnType<typeof createClient<Database>>,
    forbiddenBlockIds: string[]
) {
    for (const blockId of forbiddenBlockIds) {
        const { data, error } = await client
            .from('blocks')
            .select('id')
            .eq('id', blockId)
            .single();

        if (data) {
            throw new Error(`User should not have access to block: ${blockId}`);
        }

        // PGRST116 = "JSON object requested, multiple (or no) rows returned"
        // This is expected when RLS blocks access
        if (error && error.code !== 'PGRST116') {
            // Some other error occurred
            console.warn(`Unexpected error checking block ${blockId}: ${error.message}`);
        }
    }

    return true;
}
