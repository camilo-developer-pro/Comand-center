-- File: migrations/002_schemas.sql
CREATE SCHEMA IF NOT EXISTS episodic_memory;
CREATE SCHEMA IF NOT EXISTS semantic_memory;
CREATE SCHEMA IF NOT EXISTS procedural_memory;

COMMENT ON SCHEMA episodic_memory IS 'Time-series storage: logs, events, session history. Partitioned by time.';
COMMENT ON SCHEMA semantic_memory IS 'Knowledge graph: entities, relationships, embeddings. Optimized for similarity search.';
COMMENT ON SCHEMA procedural_memory IS 'Execution patterns: protocols, workflows, learned procedures. Strict JSONB validation.';