-- Migration: 00003_benchmark_function.sql
-- Purpose: Phase 4 - Benchmark RPC function for educational comparison
-- Note: This function demonstrates the SLOW path - never use in production

CREATE OR REPLACE FUNCTION benchmark_jsonb_query(
  p_workspace_id UUID,
  p_widget_type TEXT
)
RETURNS TABLE (id UUID, title TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This query intentionally uses the SLOW JSONB path
  -- It demonstrates what NOT to do
  RETURN QUERY
  SELECT d.id, d.title
  FROM documents d
  WHERE d.workspace_id = p_workspace_id
    AND d.content @> jsonb_build_object(
      'blocks', jsonb_build_array(
        jsonb_build_object('type', p_widget_type)
      )
    );
END;
$$;

-- Grant execute to authenticated users (for benchmarking only)
GRANT EXECUTE ON FUNCTION benchmark_jsonb_query TO authenticated;
