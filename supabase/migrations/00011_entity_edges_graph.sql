-- ============================================
-- ENTITY EDGES (Knowledge Graph)
-- ============================================
-- Migration: 00011_entity_edges_graph.sql
-- Description: Implements a polymorphic edge table for workspace-isolated knowledge graphs.

CREATE TABLE IF NOT EXISTS entity_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('document', 'lead', 'user', 'task', 'item')),
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('document', 'lead', 'user', 'task', 'item')),
    relation_type TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, target_id, relation_type)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_edges_source ON entity_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON entity_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_edges_workspace ON entity_edges(workspace_id);
CREATE INDEX IF NOT EXISTS idx_edges_relation_type ON entity_edges(relation_type);
CREATE INDEX IF NOT EXISTS idx_edges_source_relation ON entity_edges(source_id, relation_type);

-- Enable Row Level Security
ALTER TABLE entity_edges ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Workspace Isolation
-- 1. SELECT Policy
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'edges_workspace_select') THEN
        CREATE POLICY edges_workspace_select ON entity_edges FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM workspace_members wm
                WHERE wm.workspace_id = entity_edges.workspace_id
                AND wm.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- 2. INSERT Policy
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'edges_workspace_insert') THEN
        CREATE POLICY edges_workspace_insert ON entity_edges FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM workspace_members wm
                WHERE wm.workspace_id = entity_edges.workspace_id
                AND wm.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- 3. DELETE Policy
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'edges_workspace_delete') THEN
        CREATE POLICY edges_workspace_delete ON entity_edges FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM workspace_members wm
                WHERE wm.workspace_id = entity_edges.workspace_id
                AND wm.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Trigger: Auto-update updated_at timestamp
-- Using existing update_updated_at() function from core schema
DROP TRIGGER IF EXISTS update_entity_edges_updated_at ON entity_edges;
CREATE TRIGGER update_entity_edges_updated_at
    BEFORE UPDATE ON entity_edges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Documentation: Table and Column Comments
COMMENT ON TABLE entity_edges IS 'Polymorphic edges representing relationships between different entities in the knowledge graph.';
COMMENT ON COLUMN entity_edges.id IS 'Unique identifier for the edge.';
COMMENT ON COLUMN entity_edges.source_id IS 'UUID of the origin node (document, lead, user, task, or item).';
COMMENT ON COLUMN entity_edges.source_type IS 'Entity type of the origin node.';
COMMENT ON COLUMN entity_edges.target_id IS 'UUID of the destination node.';
COMMENT ON COLUMN entity_edges.target_type IS 'Entity type of the destination node.';
COMMENT ON COLUMN entity_edges.relation_type IS 'The semantic type of the relationship (e.g., mentions, assigned_to, blocks).';
COMMENT ON COLUMN entity_edges.workspace_id IS 'The workspace this edge belongs to for multi-tenant isolation.';
COMMENT ON COLUMN entity_edges.properties IS 'Flexible metadata for edge properties such as confidence weights or labels.';
COMMENT ON COLUMN entity_edges.created_at IS 'Timestamp when the relationship was first recorded.';
COMMENT ON COLUMN entity_edges.updated_at IS 'Timestamp when the relationship metadata was last changed.';

-- ============================================
-- ROLLBACK SECTION (Commented out)
-- ============================================
/*
DROP TRIGGER IF EXISTS update_entity_edges_updated_at ON entity_edges;
DROP TABLE IF EXISTS entity_edges;
*/

-- ============================================
-- MENTION EXTRACTION LOGIC
-- ============================================

-- Helper function to recursively extract mentions from BlockNote JSON content
CREATE OR REPLACE FUNCTION extract_mentions_from_content(doc_content JSONB)
RETURNS TABLE(mentioned_id UUID, mentioned_type TEXT, mentioned_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    block JSONB;
    content_item JSONB;
    child JSONB;
BEGIN
    -- Handle NULL or empty content gracefully
    IF doc_content IS NULL OR jsonb_typeof(doc_content) != 'array' THEN
        RETURN;
    END IF;

    -- Iterate through top-level blocks
    FOR block IN SELECT * FROM jsonb_array_elements(doc_content)
    LOOP
        -- Check content array for mentions
        IF block ? 'content' AND jsonb_typeof(block->'content') = 'array' THEN
            FOR content_item IN SELECT * FROM jsonb_array_elements(block->'content')
            LOOP
                IF content_item->>'type' = 'mention' AND content_item ? 'attrs' THEN
                    mentioned_id := (content_item->'attrs'->>'id')::UUID;
                    mentioned_type := content_item->'attrs'->>'type';
                    mentioned_name := COALESCE(content_item->'attrs'->>'name', 'Unknown');
                    RETURN NEXT;
                END IF;
            END LOOP;
        END IF;
        
        -- Recursively check children
        IF block ? 'children' AND jsonb_typeof(block->'children') = 'array' THEN
            FOR child IN 
                SELECT * FROM extract_mentions_from_content(block->'children')
            LOOP
                mentioned_id := child.mentioned_id;
                mentioned_type := child.mentioned_type;
                mentioned_name := child.mentioned_name;
                RETURN NEXT;
            END LOOP;
        END IF;
    END LOOP;
END;
$$;

-- Trigger function to synchronize document mentions with entity_edges
CREATE OR REPLACE FUNCTION sync_document_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ws_id UUID;
    curr_mentions UUID[];
BEGIN
    -- Only process if content changed
    IF (TG_OP = 'UPDATE' AND NEW.content IS NOT DISTINCT FROM OLD.content) THEN
        RETURN NEW;
    END IF;

    -- Get workspace_id from items table
    SELECT workspace_id INTO ws_id FROM items WHERE document_id = NEW.id LIMIT 1;
    
    IF ws_id IS NULL THEN
        RAISE WARNING 'No workspace found for document %, skipping mention sync', NEW.id;
        RETURN NEW;
    END IF;

    -- 1. Extract current mentions into an array
    SELECT array_agg(DISTINCT mentioned_id) INTO curr_mentions
    FROM extract_mentions_from_content(NEW.content);

    -- 2. DELETE edges that no longer exist
    DELETE FROM entity_edges
    WHERE source_id = NEW.id
      AND source_type = 'document'
      AND relation_type = 'mentions'
      AND (curr_mentions IS NULL OR target_id != ALL(curr_mentions));

    -- 3. INSERT new edges (if any exist)
    IF curr_mentions IS NOT NULL THEN
        INSERT INTO entity_edges (
            source_id,
            source_type,
            target_id,
            target_type,
            relation_type,
            workspace_id
        )
        SELECT 
            NEW.id,
            'document',
            m.mentioned_id,
            m.mentioned_type,
            'mentions',
            ws_id
        FROM extract_mentions_from_content(NEW.content) m
        ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in sync_document_mentions for doc %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger on the documents table
DROP TRIGGER IF EXISTS extract_mentions_on_document_change ON documents;
CREATE TRIGGER extract_mentions_on_document_change
    AFTER INSERT OR UPDATE OF content ON documents
    FOR EACH ROW
    EXECUTE FUNCTION sync_document_mentions();

-- RPC function for frontend graph visualization
CREATE OR REPLACE FUNCTION get_graph_neighborhood(
    node_id UUID,
    depth INT DEFAULT 1,
    ws_id UUID DEFAULT NULL
)
RETURNS TABLE(nodes JSONB, links JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Note: for depth=1 as requested, we fetch outbound and inbound edges
    RETURN QUERY
    WITH neighborhood_edges AS (
        -- Outbound
        SELECT 
            source_id, 
            target_id, 
            relation_type,
            target_type as neighbor_type,
            target_id as neighbor_id
        FROM entity_edges
        WHERE source_id = node_id
          AND (ws_id IS NULL OR workspace_id = ws_id)
        
        UNION
        
        -- Inbound
        SELECT 
            source_id, 
            target_id, 
            relation_type,
            source_type as neighbor_type,
            source_id as neighbor_id
        FROM entity_edges
        WHERE target_id = node_id
          AND (ws_id IS NULL OR workspace_id = ws_id)
    ),
    unique_nodes AS (
        -- The central node
        SELECT 
            node_id as id,
            COALESCE(d.title, l.name, p.full_name, i.name, 'Node') as name,
            CASE 
                WHEN d.id IS NOT NULL THEN 'document'
                WHEN l.id IS NOT NULL THEN 'lead'
                WHEN p.id IS NOT NULL THEN 'user'
                WHEN i.id IS NOT NULL THEN 'item'
                ELSE 'unknown'
            END as type
        FROM (SELECT node_id) n
        LEFT JOIN documents d ON d.id = n.node_id
        LEFT JOIN crm_leads l ON l.id = n.node_id
        LEFT JOIN profiles p ON p.id = n.node_id
        LEFT JOIN items i ON i.id = n.node_id
        
        UNION
        
        -- The neighbors
        SELECT DISTINCT
            e.neighbor_id as id,
            COALESCE(d.title, l.name, p.full_name, i.name, 'Node') as name,
            e.neighbor_type as type
        FROM neighborhood_edges e
        LEFT JOIN documents d ON d.id = e.neighbor_id
        LEFT JOIN crm_leads l ON l.id = e.neighbor_id
        LEFT JOIN profiles p ON p.id = e.neighbor_id
        LEFT JOIN items i ON i.id = e.neighbor_id
    )
    SELECT 
        (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'type', type, 'val', 1)) FROM unique_nodes),
        (SELECT jsonb_agg(jsonb_build_object('source', source_id, 'target', target_id, 'relation', relation_type)) FROM neighborhood_edges);
END;
$$;

-- Get top connected nodes for large graphs
CREATE OR REPLACE FUNCTION get_top_connected_nodes(ws_id UUID, limit_count INT)
RETURNS TABLE (
  source_id UUID,
  source_name TEXT,
  source_type TEXT,
  target_id UUID,
  target_name TEXT,
  target_type TEXT,
  relation_type TEXT,
  properties JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH connection_counts AS (
    SELECT 
      e.source_id as node_id,
      COUNT(*) as connections
    FROM entity_edges e
    WHERE e.workspace_id = ws_id
    GROUP BY e.source_id
    UNION ALL
    SELECT 
      e.target_id as node_id,
      COUNT(*) as connections
    FROM entity_edges e
    WHERE e.workspace_id = ws_id
    GROUP BY e.target_id
  ),
  top_nodes AS (
    SELECT node_id
    FROM connection_counts
    GROUP BY node_id
    ORDER BY SUM(connections) DESC
    LIMIT limit_count
  )
  SELECT 
    e.source_id,
    COALESCE(d1.title, i1.name, 'Unknown') as source_name,
    e.source_type,
    e.target_id,
    COALESCE(d2.title, i2.name, 'Unknown') as target_name,
    e.target_type,
    e.relation_type,
    e.properties
  FROM entity_edges e
  LEFT JOIN documents d1 ON e.source_id = d1.id AND e.source_type = 'document'
  LEFT JOIN items i1 ON e.source_id = i1.id AND e.source_type = 'item'
  LEFT JOIN documents d2 ON e.target_id = d2.id AND e.target_type = 'document'
  LEFT JOIN items i2 ON e.target_id = i2.id AND e.target_type = 'item'
  WHERE e.workspace_id = ws_id
  AND (e.source_id IN (SELECT node_id FROM top_nodes) 
       OR e.target_id IN (SELECT node_id FROM top_nodes));
END;
$$;

-- Get full workspace graph (use only for small graphs)
CREATE OR REPLACE FUNCTION get_full_workspace_graph(ws_id UUID)
RETURNS TABLE (
  source_id UUID,
  source_name TEXT,
  source_type TEXT,
  target_id UUID,
  target_name TEXT,
  target_type TEXT,
  relation_type TEXT,
  properties JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.source_id,
    COALESCE(d1.title, i1.name, 'Unknown') as source_name,
    e.source_type,
    e.target_id,
    COALESCE(d2.title, i2.name, 'Unknown') as target_name,
    e.target_type,
    e.relation_type,
    e.properties
  FROM entity_edges e
  LEFT JOIN documents d1 ON e.source_id = d1.id AND e.source_type = 'document'
  LEFT JOIN items i1 ON e.source_id = i1.id AND e.source_type = 'item'
  LEFT JOIN documents d2 ON e.target_id = d2.id AND e.target_type = 'document'
  LEFT JOIN items i2 ON e.target_id = i2.id AND e.target_type = 'item'
  WHERE e.workspace_id = ws_id;
END;
$$;
