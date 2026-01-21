-- Migration: 00007_search_functions.sql
-- Purpose: V1.1 Phase 5 - Full-text search functions with highlighting
-- Date: 2026-01-20

CREATE OR REPLACE FUNCTION public.search_documents_with_highlights(
    p_workspace_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    title_highlight TEXT,
    rank REAL,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        ts_headline('english', d.title, plainto_tsquery('english', p_query), 'StartSel=<mark class="bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-sm px-0.5">, StopSel=</mark>') as title_highlight,
        ts_rank(d.search_vector, plainto_tsquery('english', p_query)) as rank,
        d.updated_at
    FROM 
        public.documents d
    WHERE 
        d.workspace_id = p_workspace_id
        AND d.is_archived = false
        AND d.search_vector @@ plainto_tsquery('english', p_query)
    ORDER BY 
        rank DESC, 
        d.updated_at DESC
    LIMIT p_limit 
    OFFSET p_offset;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.search_documents_with_highlights(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
