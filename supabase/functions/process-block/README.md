# Process Block Edge Function

## Overview
This Edge Function is part of Command Center V3.1 Phase 3 Week 7: Asynchronous Triggers implementation. It processes block changes detected by the PostgreSQL trigger `fn_notify_block_change` and performs:

1. **Text Extraction**: Extracts plain text from TipTap JSON content
2. **Embedding Generation**: Creates vector embeddings for semantic search
3. **Entity Extraction**: Identifies entities (people, organizations, projects, etc.)
4. **Relationship Discovery**: Finds relationships between entities
5. **Knowledge Graph Update**: Updates the `knowledge_graph_edges` table

## Environment Variables Required

### Required Variables (Set in Supabase Dashboard)
| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://your-project-ref.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin access | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `OPENAI_API_KEY` | OpenAI API key for embedding generation | `sk-...` |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | For Claude 3.5 Haiku entity extraction (future) | Not set |
| `EMBEDDING_MODEL` | OpenAI embedding model | `text-embedding-3-small` |
| `EMBEDDING_DIMENSIONS` | Vector dimensions | `1536` |

## Database Configuration

The trigger function requires these PostgreSQL settings:

```sql
-- Set these in your database (via Supabase SQL Editor or migrations)
ALTER DATABASE postgres SET app.supabase_project_ref TO 'your-project-ref';
ALTER DATABASE postgres SET app.edge_function_process_block_url TO 'https://your-project-ref.supabase.co/functions/v1/process-block';
ALTER DATABASE postgres SET app.service_role_key TO 'your-service-role-key';
```

Or set them per session in your application:
```sql
SET app.supabase_project_ref = 'your-project-ref';
SET app.edge_function_process_block_url = 'https://your-project-ref.supabase.co/functions/v1/process-block';
SET app.service_role_key = 'your-service-role-key';
```

## Deployment

### 1. Deploy the Edge Function
```bash
supabase functions deploy process-block --project-ref your-project-ref
```

### 2. Set Environment Variables
```bash
supabase secrets set --project-ref your-project-ref \
  SUPABASE_URL=https://your-project-ref.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  OPENAI_API_KEY=your-openai-api-key
```

### 3. Run the Database Migration
```sql
-- Run the migration file:
-- database/migrations/phase3/007_block_change_trigger.sql
```

## API Endpoint

**URL**: `https://your-project-ref.supabase.co/functions/v1/process-block`

**Method**: `POST`

**Headers**:
- `Content-Type: application/json`
- `Authorization: Bearer <service_role_key>`
- `apikey: <service_role_key>`

**Request Body**:
```json
{
  "block_id": "uuidv7",
  "document_id": "uuidv7",
  "workspace_id": "uuidv7",
  "content": { "type": "doc", "content": [...] },
  "type": "paragraph",
  "content_hash": "sha256_hash",
  "triggered_at": "2026-01-24T14:30:00Z",
  "operation": "INSERT"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Block processed successfully",
  "result": {
    "block_id": "uuidv7",
    "entities": [...],
    "relationships": [...],
    "embedding_generated": true,
    "graph_updated": true,
    "processing_time_ms": 1234
  },
  "metadata": {
    "text_length": 150,
    "entity_count": 3,
    "relationship_count": 2,
    "operation": "INSERT",
    "content_hash": "sha256_hash"
  }
}
```

## Testing

### 1. Manual Test with curl
```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/process-block \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-service-role-key" \
  -H "apikey: your-service-role-key" \
  -d '{
    "block_id": "018f2a7e-1234-5678-9abc-def012345678",
    "document_id": "018f2a7e-8765-4321-fedc-ba9876543210",
    "workspace_id": "018f2a7e-1111-2222-3333-444444444444",
    "content": {
      "type": "doc",
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "The Q3 release is blocked by the engineering team."
            }
          ]
        }
      ]
    },
    "type": "paragraph",
    "content_hash": "abc123...",
    "triggered_at": "2026-01-24T14:30:00Z",
    "operation": "INSERT"
  }'
```

### 2. Database Trigger Test
```sql
-- Insert a test block to trigger the function
INSERT INTO public.blocks (
  id, document_id, content, type, sort_order
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.documents LIMIT 1),
  '{"type":"paragraph","content":[{"type":"text","text":"Test block content"}]}'::jsonb,
  'paragraph',
  'a0'
);

-- Check if async processing was triggered
SELECT * FROM public.async_processing_errors ORDER BY created_at DESC LIMIT 5;
```

## Error Handling

The function includes comprehensive error handling:

1. **Configuration Errors**: Logged to `async_processing_errors` table
2. **Network Errors**: Retry logic (to be implemented)
3. **LLM API Errors**: Fallback to simple extraction
4. **Database Errors**: Logged and non-blocking

## Monitoring

Check these tables for monitoring:

1. **`async_processing_errors`**: Failed async calls
2. **`blocks.embedding_updated_at`**: When embeddings were last generated
3. **`knowledge_graph_edges`**: Graph relationships created
4. **PostgreSQL logs**: For trigger execution

## Integration with V3.1 Architecture

This function is a key component of the **Incremental GraphRAG** system:

```
User edits block → PostgreSQL trigger → pg_net HTTP call → 
This Edge Function → Entity extraction → Graph update → 
Real-time knowledge graph available for hybrid search
```

## Next Steps

1. **Implement Claude 3.5 Haiku integration** for better entity extraction
2. **Add retry logic** for failed API calls
3. **Implement rate limiting** for high-volume workspaces
4. **Add caching** for frequently mentioned entities
5. **Implement batch processing** for backfilling existing blocks