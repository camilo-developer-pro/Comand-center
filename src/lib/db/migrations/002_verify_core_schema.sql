-- ============================================================================
-- Command Center V3.1 - Core Schema Verification
-- Description: Verify tables, collations, and indexes
-- ============================================================================

-- 1. Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('workspaces', 'workspace_members', 'documents', 'blocks', 'knowledge_graph_edges');

-- 2. Verify sort_order collation
SELECT column_name, collation_name 
FROM information_schema.columns 
WHERE table_name = 'blocks' AND column_name = 'sort_order';

-- 3. Verify indexes
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename IN ('workspaces', 'workspace_members', 'documents', 'blocks', 'knowledge_graph_edges')
ORDER BY tablename, indexname;

-- 4. Verify primary key defaults (uuidv7)
SELECT 
    table_name, 
    column_name, 
    column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('workspaces', 'workspace_members', 'documents', 'blocks', 'knowledge_graph_edges') 
AND column_name = 'id';
