'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { success, failure, type ActionResult } from './types';
import type { Tables } from '@/lib/db/types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createWorkspaceSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    slug: z
        .string()
        .min(3, 'Slug must be at least 3 characters')
        .max(100)
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
});

const updateWorkspaceSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// TYPES
// ============================================================================

type Workspace = Tables<'workspaces'>;
type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Create a new workspace
 * The current user automatically becomes the owner
 */
export async function createWorkspace(
    input: CreateWorkspaceInput
): Promise<ActionResult<Workspace>> {
    try {
        // Validate input
        const validated = createWorkspaceSchema.safeParse(input);
        if (!validated.success) {
            return failure(validated.error.issues[0].message, 'VALIDATION_ERROR');
        }

        const supabase = await createServerSupabaseClient();

        // Get current user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return failure('You must be logged in to create a workspace', 'UNAUTHORIZED');
        }

        // Check if slug is already taken
        const { data: existing } = await supabase
            .from('workspaces')
            .select('id')
            .eq('slug', validated.data.slug.toLowerCase())
            .single();

        if (existing) {
            return failure('This workspace URL is already taken', 'SLUG_EXISTS');
        }

        // Create workspace
        const { data, error } = await supabase
            .from('workspaces')
            .insert({
                name: validated.data.name,
                slug: validated.data.slug.toLowerCase(),
                owner_id: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to create workspace:', error);
            return failure('Failed to create workspace', 'DATABASE_ERROR');
        }

        // Revalidate the workspaces list
        revalidatePath('/workspaces', 'layout');

        return success(data);
    } catch (error) {
        console.error('Unexpected error creating workspace:', error);
        return failure('An unexpected error occurred', 'INTERNAL_ERROR');
    }
}

/**
 * Get all workspaces for the current user
 */
export async function getMyWorkspaces(): Promise<ActionResult<Workspace[]>> {
    try {
        const supabase = await createServerSupabaseClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return failure('You must be logged in', 'UNAUTHORIZED');
        }

        // RLS automatically filters to user's workspaces
        const { data, error } = await supabase
            .from('workspaces')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch workspaces:', error);
            return failure('Failed to fetch workspaces', 'DATABASE_ERROR');
        }

        return success(data || []);
    } catch (error) {
        console.error('Unexpected error fetching workspaces:', error);
        return failure('An unexpected error occurred', 'INTERNAL_ERROR');
    }
}

/**
 * Get a single workspace by slug
 */
export async function getWorkspaceBySlug(
    slug: string
): Promise<ActionResult<Workspace | null>> {
    try {
        const supabase = await createServerSupabaseClient();

        const { data, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('slug', slug.toLowerCase())
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows found
            console.error('Failed to fetch workspace:', error);
            return failure('Failed to fetch workspace', 'DATABASE_ERROR');
        }

        return success(data);
    } catch (error) {
        console.error('Unexpected error fetching workspace:', error);
        return failure('An unexpected error occurred', 'INTERNAL_ERROR');
    }
}

/**
 * Update workspace settings
 */
export async function updateWorkspace(
    input: UpdateWorkspaceInput
): Promise<ActionResult<Workspace>> {
    try {
        const validated = updateWorkspaceSchema.safeParse(input);
        if (!validated.success) {
            return failure(validated.error.issues[0].message, 'VALIDATION_ERROR');
        }

        const supabase = await createServerSupabaseClient();

        const { data, error } = await supabase
            .from('workspaces')
            .update({
                ...(validated.data.name && { name: validated.data.name }),
                ...(validated.data.settings && { settings: validated.data.settings }),
            })
            .eq('id', validated.data.id)
            .select()
            .single();

        if (error) {
            console.error('Failed to update workspace:', error);
            return failure('Failed to update workspace', 'DATABASE_ERROR');
        }

        revalidatePath('/workspaces', 'layout');
        revalidatePath(`/workspace/${data.slug}`);

        return success(data);
    } catch (error) {
        console.error('Unexpected error updating workspace:', error);
        return failure('An unexpected error occurred', 'INTERNAL_ERROR');
    }
}

/**
 * Delete a workspace (owner only)
 */
export async function deleteWorkspace(
    workspaceId: string
): Promise<ActionResult<void>> {
    try {
        if (!z.string().uuid().safeParse(workspaceId).success) {
            return failure('Invalid workspace ID', 'VALIDATION_ERROR');
        }

        const supabase = await createServerSupabaseClient();

        const { error } = await supabase
            .from('workspaces')
            .delete()
            .eq('id', workspaceId);

        if (error) {
            console.error('Failed to delete workspace:', error);
            return failure('Failed to delete workspace', 'DATABASE_ERROR');
        }

        revalidatePath('/workspaces', 'layout');

        return success(undefined);
    } catch (error) {
        console.error('Unexpected error deleting workspace:', error);
        return failure('An unexpected error occurred', 'INTERNAL_ERROR');
    }
}
