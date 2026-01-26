# Command Center V3.1 Performance Tuning Guide

## Query Optimization

### Analyzing Slow Queries
```sql
-- Enable query logging (temporary)
ALTER DATABASE postgres SET log_min_duration_statement = 100;

-- View slow queries
SELECT * FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY total_time DESC;
```

### Index Tuning

**When to add indexes:**
- Query appears in slow query log repeatedly
- EXPLAIN ANALYZE shows sequential scan on large table
- Query filters on non-indexed column

**When to remove indexes:**
- Index not used (check pg_stat_user_indexes)
- Table has many writes, few reads
- Index size exceeds table size
```sql
-- Find unused indexes
SELECT 
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE 'pg_%';
```

### Vector Search Tuning

**HNSW Parameters:**
- `m`: Connections per node (higher = more accurate, slower build)
- `ef_construction`: Build-time search depth
- `ef_search`: Query-time search depth (can be set per-session)
```sql
-- Increase accuracy for important queries
SET hnsw.ef_search = 200;

-- Reset to default for normal operations
RESET hnsw.ef_search;
```

### Memory Tuning

**For index builds:**
```sql
SET maintenance_work_mem = '2GB';
CREATE INDEX CONCURRENTLY ...;
RESET maintenance_work_mem;
```

**For sort operations:**
```sql
SET work_mem = '256MB';
-- Run complex query
RESET work_mem;
```

## Real-time Optimization

### Reducing Presence Bandwidth
```typescript
// Throttle cursor updates to 20fps instead of 30fps
CursorTrackingExtension.configure({
  throttleMs: 50 // 50ms = 20fps
})
```

### Channel Management
```typescript
// Unsubscribe when component unmounts
useEffect(() => {
  const channel = supabase.channel('...');
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

## Caching Strategies

### TanStack Query Configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

### Supabase Edge Caching
```typescript
// Enable caching for read-heavy endpoints
const { data } = await supabase
  .from('blocks')
  .select('*')
  .eq('document_id', id)
  .order('sort_order')
  .abortSignal(AbortSignal.timeout(5000));
```

## Load Testing

### Running Stress Tests
```bash
# Run full stress test suite
npm run stress-test

# Run specific test
npm test -- --grep "concurrent insertions"
```

### Interpreting Results

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Avg Latency | < 100ms | 100-500ms | > 500ms |
| P99 Latency | < 500ms | 500-1000ms | > 1000ms |
| Error Rate | < 0.1% | 0.1-1% | > 1% |
| Collisions | < 5 | 5-20 | > 20 |
