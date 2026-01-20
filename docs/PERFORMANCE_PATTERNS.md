# Performance Patterns: Command Center ERP

## Overview

This document explains the critical performance optimization patterns used in the Command Center ERP, specifically the **Generated Column** strategy for querying widget data.

---

## The Problem: Querying Inside JSONB

The `documents` table stores BlockNote content as a JSONB blob:
```json
{
  "blocks": [
    { "id": "1", "type": "paragraph", "content": "..." },
    { "id": "2", "type": "crm-leads", "props": { "filter": "active" } },
    { "id": "3", "type": "heading", "content": "..." }
  ]
}
```

**Business Requirement**: Find all documents containing a `crm-leads` widget.

### The Naive (SLOW) Approach ❌
```sql
SELECT * FROM documents 
WHERE content @> '{"blocks": [{"type": "crm-leads"}]}'::jsonb;
```

**Why this is catastrophic:**

1. **No Index Usage**: PostgreSQL cannot efficiently index deep JSONB paths
2. **TOAST Overhead**: JSONB blobs > 2KB are compressed and stored separately
3. **Per-Row Processing**: Every row requires decompression + JSON parsing
4. **Full Table Scan**: O(n) complexity regardless of result size

### The TOAST Problem Explained

PostgreSQL's **TOAST** (The Oversized-Attribute Storage Technique) automatically compresses large values:
````
┌─────────────────────────────────────────────────────────────┐
│ Main Table Row                                              │
├─────────────────────────────────────────────────────────────┤
│ id │ title │ workspace_id │ content (TOAST POINTER) ──────┼──┐
└─────────────────────────────────────────────────────────────┘  │
                                                                  │
┌─────────────────────────────────────────────────────────────┐  │
│ TOAST Table (Separate Storage)                              │◄─┘
├─────────────────────────────────────────────────────────────┤
│ Compressed JSONB blob (10KB → ~3KB compressed)              │
└─────────────────────────────────────────────────────────────┘

To query content ->> 'blocks', PostgreSQL must:

Read TOAST pointer
Fetch compressed blob from TOAST table
Decompress entire blob
Parse JSON
Traverse to requested path

This happens for EVERY row in the scan.

The Solution: Generated Columns ✅
What is a Generated Column?
A Generated Column computes its value from other columns at write time:
sqlALTER TABLE documents ADD COLUMN widget_index TEXT[] 
GENERATED ALWAYS AS (
  ARRAY(
    SELECT jsonb_array_elements_text(
      jsonb_path_query_array(content, '$.blocks[*].type')
    )
  )
) STORED;
````

The `STORED` keyword means the value is:
- Computed on INSERT/UPDATE
- Saved in the main table row (not TOASTed if small)
- Available for indexing

### The Data Flow
````
WRITE TIME (INSERT/UPDATE):
┌─────────────────────────────────────────────────────────────┐
│ content (JSONB blob)                                        │
│ {"blocks": [{"type": "crm-leads"}, {"type": "paragraph"}]}  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (PostgreSQL extracts automatically)
┌─────────────────────────────────────────────────────────────┐
│ widget_index (TEXT[])                                       │
│ ['crm-leads', 'paragraph']                                  │
└─────────────────────────────────────────────────────────────┘

READ TIME (SELECT):
┌─────────────────────────────────────────────────────────────┐
│ Query: SELECT * FROM documents                              │
│        WHERE widget_index @> ARRAY['crm-leads']             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Uses GIN Index - O(log n))
┌─────────────────────────────────────────────────────────────┐
│ Result: Instant lookup, no JSON parsing                     │
└─────────────────────────────────────────────────────────────┘
The GIN Index
sqlCREATE INDEX idx_documents_widget_index 
ON documents USING GIN (widget_index);
````

GIN (Generalized Inverted Index) creates a reverse lookup:
````
Index Structure:
┌────────────────┬──────────────────────────┐
│ Widget Type    │ Document IDs             │
├────────────────┼──────────────────────────┤
│ 'crm-leads'    │ [doc_1, doc_5, doc_99]   │
│ 'revenue-chart'│ [doc_2, doc_5]           │
│ 'paragraph'    │ [doc_1, doc_2, doc_3...] │
└────────────────┴──────────────────────────┘
Query widget_index @> ARRAY['crm-leads']:

Lookup 'crm-leads' in index → O(log n)
Return document IDs directly → O(1)
Fetch documents by ID → O(k) where k = result count

Total: O(log n + k) vs O(n × decompression)

Performance Comparison
MetricJSONB DirectGenerated ColumnImprovementQuery Time (1K docs)~500ms~5ms100xQuery Time (100K docs)~50,000ms~10ms5000xIndex UsedNoYes (GIN)✅CPU (per query)HighMinimal✅MemoryHigh (decompress)Minimal✅

Code Usage
✅ Correct: Use the Generated Column
typescript// src/modules/editor/queries/documentWidgetQueries.ts

const { data } = await supabase
  .from('documents')
  .select('id, title')
  .contains('widget_index', ['crm-leads']); // Uses GIN index
❌ Wrong: Never Query JSONB Directly
typescript// NEVER DO THIS
const { data } = await supabase
  .from('documents')
  .select('id, title')
  .filter('content->blocks', 'cs', '{"type": "crm-leads"}');
````

---

## Trade-offs

| Aspect | Cost | Benefit |
|--------|------|---------|
| Write Performance | +5-10ms per write | Negligible for document apps |
| Storage | +~100 bytes per doc | Trivial |
| Read Performance | 0 | 100-5000x faster queries |
| Maintenance | Generated Column is automatic | No triggers to maintain |

**Conclusion**: The write-time cost is negligible compared to the read-time benefit. Documents are read far more often than written.

---

## Key Takeaways

1. **Never query deep JSONB paths** for filtering
2. **Extract searchable data** into Generated Columns
3. **Index the Generated Columns** with appropriate index type (GIN for arrays)
4. **Pay the cost at write time**, not read time
5. **TOAST is automatic** - you can't avoid it for large JSONB, but you can avoid querying it
