'use server';

/**
 * Widget Query Server Actions
 * 
 * Phase 4: Performance Optimization
 * 
 * These actions expose the optimized widget queries to client components.
 * All actions enforce authentication and workspace membership.
 */

import { createClient } from '@/lib/supabase/server';
import {
    findDocumentsByWidgetType,
    findDocumentsByAnyWidgetType,
    findDocumentsByAllWidgetTypes,
    countDocumentsByWidgetType,
    getWidgetUsageStats,
    type DocumentWithWidgets,
} from '../queries/documentWidgetQueries';
import { WidgetKey } from '../registry';

// ============================================================
// Authentication Helper
// ============================================================

async function requireAuth(): Promise<{ userId: string; workspaceId: string }> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error('Unauthorized: Please sign in to continue.');
    }

    // Get user's workspace membership
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.workspace_id) {
        throw new Error('Unauthorized: No workspace membership found.');
    }

    return { userId: user.id, workspaceId: profile.workspace_id };
}

// ============================================================
// Action Response Types
// ============================================================

type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

// ============================================================
// Server Actions
// ============================================================

/**
 * Find documents containing a specific widget type.
 * 
 * @param widgetType - The widget type to search for (e.g., 'crm-leads')
 * @param limit - Maximum number of results (default: 50)
 * @param offset - Pagination offset (default: 0)
 */
export async function searchDocumentsByWidget(
    widgetType: WidgetKey,
    limit: number = 50,
    offset: number = 0
): Promise<ActionResult<DocumentWithWidgets[]>> {
    try {
        const { workspaceId } = await requireAuth();

        const documents = await findDocumentsByWidgetType(widgetType, {
            workspaceId,
            limit,
            offset,
        });

        return { success: true, data: documents };
    } catch (error) {
        console.error('[widgetQueryActions] searchDocumentsByWidget error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Find documents containing ANY of the specified widget types.
 * 
 * @param widgetTypes - Array of widget types to search for
 * @param limit - Maximum number of results (default: 50)
 * @param offset - Pagination offset (default: 0)
 */
export async function searchDocumentsByAnyWidgets(
    widgetTypes: WidgetKey[],
    limit: number = 50,
    offset: number = 0
): Promise<ActionResult<DocumentWithWidgets[]>> {
    try {
        const { workspaceId } = await requireAuth();

        if (widgetTypes.length === 0) {
            return { success: true, data: [] };
        }

        const documents = await findDocumentsByAnyWidgetType(widgetTypes, {
            workspaceId,
            limit,
            offset,
        });

        return { success: true, data: documents };
    } catch (error) {
        console.error('[widgetQueryActions] searchDocumentsByAnyWidgets error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Find documents containing ALL of the specified widget types.
 * 
 * @param widgetTypes - Array of widget types (document must contain all)
 * @param limit - Maximum number of results (default: 50)
 * @param offset - Pagination offset (default: 0)
 */
export async function searchDocumentsByAllWidgets(
    widgetTypes: WidgetKey[],
    limit: number = 50,
    offset: number = 0
): Promise<ActionResult<DocumentWithWidgets[]>> {
    try {
        const { workspaceId } = await requireAuth();

        if (widgetTypes.length === 0) {
            return { success: true, data: [] };
        }

        const documents = await findDocumentsByAllWidgetTypes(widgetTypes, {
            workspaceId,
            limit,
            offset,
        });

        return { success: true, data: documents };
    } catch (error) {
        console.error('[widgetQueryActions] searchDocumentsByAllWidgets error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Get count of documents containing a specific widget type.
 * 
 * @param widgetType - The widget type to count
 */
export async function getWidgetDocumentCount(
    widgetType: WidgetKey
): Promise<ActionResult<number>> {
    try {
        const { workspaceId } = await requireAuth();

        const count = await countDocumentsByWidgetType(widgetType, workspaceId);

        return { success: true, data: count };
    } catch (error) {
        console.error('[widgetQueryActions] getWidgetDocumentCount error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Get widget usage statistics for the current workspace.
 * Returns a map of widget type -> document count.
 */
export async function fetchWidgetUsageStats(): Promise<ActionResult<Record<string, number>>> {
    try {
        const { workspaceId } = await requireAuth();

        const stats = await getWidgetUsageStats(workspaceId);

        return { success: true, data: stats };
    } catch (error) {
        console.error('[widgetQueryActions] fetchWidgetUsageStats error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
