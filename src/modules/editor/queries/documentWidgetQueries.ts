/**
 * Document Widget Query Utilities
 * 
 * Phase 4: Performance Optimization
 * 
 * These utilities query the `widget_index` TEXT[] generated column
 * instead of parsing JSONB at runtime. This provides:
 * - GIN index utilization (O(log n) vs O(n))
 * - TOAST bypass (no blob decompression)
 * - 10-100x faster queries on large datasets
 */

import { createClient } from '@/lib/supabase/server';
import { WidgetKey } from '../registry';

// ============================================================
// Types
// ============================================================

export interface DocumentWithWidgets {
    id: string;
    title: string;
    workspace_id: string;
    widget_index: string[] | null;
    created_at: string;
    updated_at: string;
}

export interface DocumentQueryOptions {
    workspaceId: string;
    limit?: number;
    offset?: number;
}

// ============================================================
// Core Query Functions (Using Generated Column)
// ============================================================

/**
 * Find all documents containing a specific widget type.
 * Uses the widget_index GIN index for O(log n) performance.
 * 
 * @example
 * const docs = await findDocumentsByWidgetType('crm-leads', { workspaceId: '...' });
 */
export async function findDocumentsByWidgetType(
    widgetType: WidgetKey,
    options: DocumentQueryOptions
): Promise<DocumentWithWidgets[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('documents')
        .select('id, title, workspace_id, widget_index, created_at, updated_at')
        .eq('workspace_id', options.workspaceId)
        .contains('widget_index', [widgetType]) // Uses @> operator with GIN index
        .order('updated_at', { ascending: false })
        .range(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 50) - 1);

    if (error) {
        console.error('[documentWidgetQueries] findDocumentsByWidgetType error:', error);
        throw new Error(`Failed to query documents: ${error.message}`);
    }

    return data ?? [];
}

/**
 * Find all documents containing ANY of the specified widget types.
 * Uses the && (overlap) operator with GIN index.
 * 
 * @example
 * const docs = await findDocumentsByAnyWidgetType(['crm-leads', 'revenue-chart'], { workspaceId: '...' });
 */
export async function findDocumentsByAnyWidgetType(
    widgetTypes: WidgetKey[],
    options: DocumentQueryOptions
): Promise<DocumentWithWidgets[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('documents')
        .select('id, title, workspace_id, widget_index, created_at, updated_at')
        .eq('workspace_id', options.workspaceId)
        .overlaps('widget_index', widgetTypes) // Uses && operator with GIN index
        .order('updated_at', { ascending: false })
        .range(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 50) - 1);

    if (error) {
        console.error('[documentWidgetQueries] findDocumentsByAnyWidgetType error:', error);
        throw new Error(`Failed to query documents: ${error.message}`);
    }

    return data ?? [];
}

/**
 * Find all documents containing ALL of the specified widget types.
 * Uses the @> (contains) operator with GIN index.
 * 
 * @example
 * const docs = await findDocumentsByAllWidgetTypes(['crm-leads', 'revenue-chart'], { workspaceId: '...' });
 */
export async function findDocumentsByAllWidgetTypes(
    widgetTypes: WidgetKey[],
    options: DocumentQueryOptions
): Promise<DocumentWithWidgets[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('documents')
        .select('id, title, workspace_id, widget_index, created_at, updated_at')
        .eq('workspace_id', options.workspaceId)
        .contains('widget_index', widgetTypes) // Uses @> operator with GIN index
        .order('updated_at', { ascending: false })
        .range(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 50) - 1);

    if (error) {
        console.error('[documentWidgetQueries] findDocumentsByAllWidgetTypes error:', error);
        throw new Error(`Failed to query documents: ${error.message}`);
    }

    return data ?? [];
}

/**
 * Count documents by widget type for dashboard statistics.
 * Uses the GIN index for fast counting.
 */
export async function countDocumentsByWidgetType(
    widgetType: WidgetKey,
    workspaceId: string
): Promise<number> {
    const supabase = await createClient();

    const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .contains('widget_index', [widgetType]);

    if (error) {
        console.error('[documentWidgetQueries] countDocumentsByWidgetType error:', error);
        throw new Error(`Failed to count documents: ${error.message}`);
    }

    return count ?? 0;
}

/**
 * Get widget usage statistics for a workspace.
 * Returns count of documents per widget type.
 */
export async function getWidgetUsageStats(
    workspaceId: string
): Promise<Record<string, number>> {
    const supabase = await createClient();

    // Fetch all documents with their widget_index
    const { data, error } = await supabase
        .from('documents')
        .select('widget_index')
        .eq('workspace_id', workspaceId)
        .not('widget_index', 'is', null);

    if (error) {
        console.error('[documentWidgetQueries] getWidgetUsageStats error:', error);
        throw new Error(`Failed to get widget stats: ${error.message}`);
    }

    // Aggregate widget counts client-side (small dataset per workspace)
    const stats: Record<string, number> = {};

    for (const doc of data ?? []) {
        for (const widgetType of doc.widget_index ?? []) {
            stats[widgetType] = (stats[widgetType] ?? 0) + 1;
        }
    }

    return stats;
}
