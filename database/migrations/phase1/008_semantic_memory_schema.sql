-- File: migrations/008_semantic_memory_schema.sql

-- Entity lifecycle status
CREATE TYPE semantic_memory.entity_status AS ENUM (
    'draft',      -- Being created/enriched
    'active',     -- Fully resolved, in use
    'merged',     -- Merged into another entity
    'archived',   -- Soft deleted
    'flagged'     -- Requires review
);

-- Relationship types
CREATE TYPE semantic_memory.relationship_type AS ENUM (
    'is_a',           -- Taxonomy (Dog is_a Animal)
    'part_of',        -- Composition (Wheel part_of Car)
    'related_to',     -- Generic association
    'same_as',        -- Identity (after merge)
    'opposite_of',    -- Antonym
    'derived_from',   -- Provenance
    'located_in',     -- Spatial
    'works_for',      -- Organizational
    'created_by',     -- Attribution
    'depends_on'      -- Dependency
);

CREATE TABLE semantic_memory.entities (
    id UUID PRIMARY KEY DEFAULT generate_uuidv7(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Classification
    entity_type TEXT NOT NULL, -- 'person', 'organization', 'concept', 'document', etc.
    category TEXT,             -- User-defined grouping

    -- Core identity
    canonical_name TEXT NOT NULL,
    description TEXT,

    -- Vector embedding for similarity search
    embedding VECTOR(1536),
    embedding_model TEXT,      -- 'text-embedding-ada-002', etc.
    embedding_updated_at TIMESTAMP WITH TIME ZONE,

    -- Ordering within category (fractional indexing)
    rank_key TEXT,

    -- Status and provenance
    status semantic_memory.entity_status NOT NULL DEFAULT 'draft',
    source_system TEXT,
    external_id TEXT,          -- ID in source system
    confidence_score NUMERIC(4,3) CHECK (confidence_score BETWEEN 0 AND 1),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Merge tracking
    merged_into_id UUID REFERENCES semantic_memory.entities(id),

    -- Constraints
    CONSTRAINT uq_entity_category_rank UNIQUE (category, rank_key)
        DEFERRABLE INITIALLY DEFERRED
);

-- Indexes
CREATE INDEX idx_entities_type_status ON semantic_memory.entities (entity_type, status);
CREATE INDEX idx_entities_category ON semantic_memory.entities (category) WHERE category IS NOT NULL;
-- Trigram index for fuzzy name matching (requires pg_trgm extension)
-- CREATE INDEX idx_entities_canonical_name_trgm ON semantic_memory.entities
--     USING GIN (canonical_name gin_trgm_ops);
CREATE INDEX idx_entities_external ON semantic_memory.entities (source_system, external_id)
    WHERE external_id IS NOT NULL;
CREATE INDEX idx_entities_merged ON semantic_memory.entities (merged_into_id)
    WHERE merged_into_id IS NOT NULL;
CREATE INDEX idx_entities_metadata_gin ON semantic_memory.entities USING GIN (metadata jsonb_path_ops);

-- Vector similarity index (IVFFlat)
-- Note: Requires sufficient data before creation, add after initial load
-- CREATE INDEX idx_entities_embedding ON semantic_memory.entities
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMENT ON TABLE semantic_memory.entities IS 'Core entity store for knowledge graph. Supports vector similarity search and fractional indexing.';
COMMENT ON COLUMN semantic_memory.entities.rank_key IS 'Fractional index key for manual ordering within category. Use fi_generate_key_between() to generate.';

-- Ensure trigram extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Entity properties (EAV model for flexibility)
CREATE TABLE semantic_memory.entity_properties (
    id UUID PRIMARY KEY DEFAULT generate_uuidv7(),
    entity_id UUID NOT NULL REFERENCES semantic_memory.entities(id) ON DELETE CASCADE,

    -- Property definition
    property_name TEXT NOT NULL,
    property_value JSONB NOT NULL,

    -- Metadata
    source TEXT,
    confidence NUMERIC(4,3) CHECK (confidence BETWEEN 0 AND 1),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_to TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_entity_property_active UNIQUE (entity_id, property_name, valid_from)
);

CREATE INDEX idx_entity_props_entity ON semantic_memory.entity_properties (entity_id);
CREATE INDEX idx_entity_props_name ON semantic_memory.entity_properties (property_name);
CREATE INDEX idx_entity_props_value_gin ON semantic_memory.entity_properties
    USING GIN (property_value jsonb_path_ops);

CREATE TABLE semantic_memory.entity_relationships (
    id UUID PRIMARY KEY DEFAULT generate_uuidv7(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Relationship endpoints
    source_entity_id UUID NOT NULL REFERENCES semantic_memory.entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES semantic_memory.entities(id) ON DELETE CASCADE,

    -- Relationship definition
    relationship_type semantic_memory.relationship_type NOT NULL,
    relationship_subtype TEXT,  -- Custom refinement

    -- Strength and confidence
    weight NUMERIC(4,3) DEFAULT 1.0 CHECK (weight BETWEEN 0 AND 1),
    confidence NUMERIC(4,3) CHECK (confidence BETWEEN 0 AND 1),

    -- Temporal bounds
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_to TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    source_system TEXT,

    -- Prevent duplicate relationships
    CONSTRAINT uq_relationship UNIQUE (
        source_entity_id, target_entity_id, relationship_type, valid_from
    )
);

CREATE INDEX idx_rel_source ON semantic_memory.entity_relationships (source_entity_id);
CREATE INDEX idx_rel_target ON semantic_memory.entity_relationships (target_entity_id);
CREATE INDEX idx_rel_type ON semantic_memory.entity_relationships (relationship_type);
CREATE INDEX idx_rel_active ON semantic_memory.entity_relationships (source_entity_id, relationship_type)
    WHERE valid_to IS NULL;

CREATE TABLE semantic_memory.entity_aliases (
    id UUID PRIMARY KEY DEFAULT generate_uuidv7(),
    entity_id UUID NOT NULL REFERENCES semantic_memory.entities(id) ON DELETE CASCADE,

    alias TEXT NOT NULL,
    alias_type TEXT NOT NULL, -- 'name', 'abbreviation', 'code', 'typo', 'translation'
    language_code CHAR(2) DEFAULT 'en',

    -- For blocking/matching
    normalized_alias TEXT GENERATED ALWAYS AS (lower(trim(regexp_replace(alias, '\s+', ' ', 'g')))) STORED,

    is_primary BOOLEAN DEFAULT FALSE,
    source TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_alias_entity UNIQUE (entity_id, normalized_alias)
);

CREATE INDEX idx_aliases_entity ON semantic_memory.entity_aliases (entity_id);
CREATE INDEX idx_aliases_normalized ON semantic_memory.entity_aliases (normalized_alias);
-- Trigram index for fuzzy alias matching
-- CREATE INDEX idx_aliases_normalized_trgm ON semantic_memory.entity_aliases
--     USING GIN (normalized_alias gin_trgm_ops);

CREATE OR REPLACE FUNCTION semantic_memory.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entities_updated_at
    BEFORE UPDATE ON semantic_memory.entities
    FOR EACH ROW
    EXECUTE FUNCTION semantic_memory.fn_set_updated_at();