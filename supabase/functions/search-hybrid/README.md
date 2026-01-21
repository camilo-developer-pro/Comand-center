# Hybrid Search Edge Function - Deployment Guide

## Overview
The `search-hybrid` edge function provides a REST API endpoint for hybrid search that combines vector similarity and knowledge graph traversal.

## Prerequisites

1. **Supabase CLI** installed
2. **Environment variables** configured in Supabase Dashboard:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `SUPABASE_URL` - Auto-configured
   - `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured

## Setup Environment Variables

### Via Supabase Dashboard
1. Go to Project Settings → Edge Functions
2. Add secret: `OPENAI_API_KEY` = `sk-...`

### Via CLI
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

## Deployment

```bash
# Deploy the function
supabase functions deploy search-hybrid --no-verify-jwt

# Verify deployment
supabase functions list
```

## Testing

### Using cURL
```bash
curl -X POST 'https://<project-ref>.supabase.co/functions/v1/search-hybrid' \
  -H 'Authorization: Bearer <anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "How does the knowledge graph work?",
    "workspace_id": "<workspace-uuid>",
    "match_threshold": 0.6,
    "match_count": 15
  }'
```

### Example Response
```json
{
  "success": true,
  "query": "How does the knowledge graph work?",
  "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
  "results": [
    {
      "document_id": "abc123...",
      "document_title": "Knowledge Graph Documentation",
      "chunk_content": "The knowledge graph uses entity_edges...",
      "chunk_index": 0,
      "header_path": ["Introduction", "Architecture"],
      "similarity_score": 0.89,
      "graph_score": 1.0,
      "fusion_score": 0.95,
      "source_type": "hybrid"
    }
  ],
  "metadata": {
    "total_results": 15,
    "match_threshold": 0.6,
    "rrf_k": 60,
    "source_distribution": {
      "vector_only": 8,
      "graph_only": 2,
      "hybrid": 5
    }
  }
}
```

## Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | ✅ | - | Search query text |
| `workspace_id` | uuid | ✅ | - | Workspace UUID for isolation |
| `match_threshold` | float | ❌ | 0.7 | Minimum similarity (0-1) |
| `match_count` | int | ❌ | 20 | Max results to return |
| `rrf_k` | int | ❌ | 60 | RRF smoothing constant |

## Response Fields

### Success Response
- `success`: boolean (true)
- `query`: string (echoed query)
- `workspace_id`: uuid (echoed workspace)
- `results`: array of SearchResult objects
- `metadata`: object with stats

### SearchResult Object
- `document_id`: Document UUID
- `document_title`: Document title
- `chunk_content`: Best matching chunk text
- `chunk_index`: Position in document
- `header_path`: Breadcrumb array (e.g., ["Chapter 1", "Section 2"])
- `similarity_score`: Cosine similarity (0-1, null for graph-only)
- `graph_score`: Graph proximity score (null for vector-only)
- `fusion_score`: Combined RRF score
- `source_type`: "vector_only" | "graph_only" | "hybrid"

### Error Response
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Monitoring

### View Logs
```bash
supabase functions logs search-hybrid
```

### Common Errors

**"OPENAI_API_KEY not configured"**
- Solution: Set the environment variable in Supabase Dashboard

**"workspace_id must be a valid UUID"**
- Solution: Ensure workspace_id is a valid UUID format

**"Embedding generation failed: 401"**
- Solution: Check OpenAI API key is valid and has credits

**"Hybrid search failed: workspace_id cannot be NULL"**
- Solution: Ensure workspace_id is provided in request

## Performance Considerations

- **Embedding generation**: ~200-500ms (OpenAI API)
- **Vector search**: ~50-100ms (HNSW index)
- **Graph traversal**: ~100-300ms (depends on depth)
- **Total latency**: ~500-1000ms typical

## Security

- ✅ CORS enabled for all origins (configure as needed)
- ✅ Workspace isolation enforced at database level
- ✅ Service role key used for RPC (bypasses RLS)
- ✅ Input validation for all parameters
- ⚠️ No JWT verification (`--no-verify-jwt` flag)

## Next Steps

1. **Frontend Integration**: Create TypeScript client wrapper
2. **Caching**: Add Redis caching for frequent queries
3. **Rate Limiting**: Implement per-workspace rate limits
4. **Analytics**: Track search queries and result quality
