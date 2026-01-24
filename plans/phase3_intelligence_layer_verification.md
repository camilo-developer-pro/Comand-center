# Phase 3: The Intelligence Layer - Verification & Implementation Plan

## Overview
Based on the **Execution Blueprint Phase 3** (Weeks 7-9), this document outlines the verification of prerequisites and the implementation plan for activating GraphRAG and Vector Search in Command Center V3.1.

## Current Status Analysis

### ✅ **Verified Prerequisites**

1. **pg_net Extension**: Enabled in `database/migrations/phase1/001_extensions.sql`
2. **Blocks Table Schema**: Contains required columns:
   - `embedding vector(1536)` - For vector embeddings
   - `content_hash VARCHAR(64)` - For change detection
   - `embedding_updated_at TIMESTAMPTZ` - For incremental updates
3. **Knowledge Graph Edges Table**: Created in `src/lib/db/migrations/002_core_schema.sql`
4. **Database Extensions**: All required extensions enabled (ltree, vector, pg_net, pg_cron)

### 📋 **Phase 3 Implementation Requirements (From Execution Blueprint)**

#### **Week 7: Asynchronous Triggers**
- [ ] **PostgreSQL triggers** on blocks table (INSERT/UPDATE)
- [ ] **pg_net configuration** to call Supabase Edge Function
- [ ] **Edge Function endpoint**: `functions/v1/process-block`

#### **Week 8: Entity Extraction Pipeline**
- [ ] **Edge Function** with Claude 3.5 Haiku integration
- [ ] **Entity and Edge extraction logic**
- [ ] **Upsert into knowledge_graph_edges**

#### **Week 9: Vector Embeddings**
- [ ] **OpenAI Embeddings API** integration
- [ ] **Store results** in blocks.embedding
- [ ] **Vector search** returns relevant blocks

## Missing Components Analysis

### 1. **Asynchronous Triggers (Week 7)**
**Status**: Not implemented
**Required Files**:
- `database/migrations/phase3/007_async_triggers.sql` - Triggers for blocks table
- `database/migrations/phase3/008_pg_net_config.sql` - pg_net HTTP call configuration
- `supabase/functions/process-block/index.ts` - Edge Function skeleton

### 2. **Entity Extraction Pipeline (Week 8)**
**Status**: Not implemented
**Required Files**:
- `supabase/functions/process-block/logic/entity-extractor.ts`
- `supabase/functions/process-block/logic/graph-upsert.ts`
- `supabase/functions/process-block/logic/claude-integration.ts`

### 3. **Vector Embeddings Integration (Week 9)**
**Status**: Partially implemented (schema exists, but no embedding generation)
**Required Files**:
- `src/lib/embeddings/openai-embeddings.ts`
- `src/lib/embeddings/embedding-service.ts`
- Database functions for embedding updates

## Verification Script

Create a verification script to check all Phase 3 components:

```bash
#!/bin/bash
# scripts/verify-phase3-intelligence.sh

echo "🔍 Phase 3: Intelligence Layer Verification"
echo "=========================================="

# Check 1: pg_net extension
echo "1. Checking pg_net extension..."
psql -c "SELECT extname FROM pg_extension WHERE extname = 'pg_net';" | grep -q pg_net
if [ $? -eq 0 ]; then
    echo "   ✅ pg_net extension enabled"
else
    echo "   ❌ pg_net extension missing"
fi

# Check 2: Blocks table columns
echo "2. Checking blocks table columns..."
psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'blocks' AND column_name IN ('embedding', 'content_hash', 'embedding_updated_at');" | grep -q embedding
if [ $? -eq 0 ]; then
    echo "   ✅ Blocks table has required columns"
else
    echo "   ❌ Blocks table missing required columns"
fi

# Check 3: Knowledge graph edges table
echo "3. Checking knowledge_graph_edges table..."
psql -c "SELECT to_regclass('public.knowledge_graph_edges');" | grep -q knowledge_graph_edges
if [ $? -eq 0 ]; then
    echo "   ✅ knowledge_graph_edges table exists"
else
    echo "   ❌ knowledge_graph_edges table missing"
fi

# Check 4: Edge Functions CLI
echo "4. Checking Supabase Edge Functions CLI..."
which supabase > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Supabase CLI installed"
    supabase functions list > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ Supabase Edge Functions accessible"
    else
        echo "   ⚠️  Supabase Edge Functions not configured"
    fi
else
    echo "   ❌ Supabase CLI not installed"
fi

echo "=========================================="
echo "Verification complete."
```

## Implementation Roadmap

### **Phase 3.1: Trigger Infrastructure (Week 7)**
1. Create trigger function for blocks table
2. Implement pg_net HTTP call to Edge Function
3. Create basic Edge Function skeleton
4. Test trigger with mock data

### **Phase 3.2: Entity Extraction (Week 8)**
1. Implement Claude 3.5 Haiku integration
2. Create entity extraction logic
3. Build graph upsert functionality
4. Test with sample text blocks

### **Phase 3.3: Vector Embeddings (Week 9)**
1. Integrate OpenAI Embeddings API
2. Create embedding service
3. Implement vector search RPC
4. Test end-to-end GraphRAG pipeline

## Risk Assessment

### **High Risk**
1. **Claude 3.5 Haiku API costs** - Need to implement rate limiting and cost monitoring
2. **OpenAI Embeddings latency** - May impact real-time editing experience
3. **pg_net reliability** - Asynchronous calls may fail silently

### **Medium Risk**
1. **Entity extraction accuracy** - LLM-based extraction may produce inconsistent results
2. **Graph explosion** - Dense knowledge graphs may cause performance issues
3. **Vector index maintenance** - HNSW index updates may impact write performance

### **Mitigation Strategies**
1. Implement comprehensive error logging and retry logic
2. Add content_hash-based deduplication to prevent redundant processing
3. Create monitoring dashboard for embedding and extraction costs
4. Implement batch processing for high-volume scenarios

## Next Steps

1. **Run verification script** to confirm current state
2. **Implement Week 7 triggers** (highest priority)
3. **Set up Edge Function skeleton**
4. **Test pg_net integration** with mock HTTP calls
5. **Begin Week 8 implementation** once triggers are working

## Dependencies

- ✅ PostgreSQL 16+ with required extensions
- ✅ Supabase project with Edge Functions enabled
- ✅ OpenAI API key for embeddings
- ✅ Anthropic API key for Claude 3.5 Haiku
- ✅ Sufficient database storage for vector embeddings

## Success Criteria

1. **Trigger fires** on every block INSERT/UPDATE
2. **Edge Function processes** blocks within 5 seconds
3. **Entity extraction** achieves >80% accuracy on test data
4. **Vector search** returns relevant blocks with <100ms latency
5. **Knowledge graph** grows organically with user editing

---

*Last Updated: 2026-01-24*
*Phase: Pre-Implementation Verification*