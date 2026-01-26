# Command Center V3.1 Production Runbook

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Procedure](#deployment-procedure)
3. [Post-Deployment Validation](#post-deployment-validation)
4. [Rollback Procedure](#rollback-procedure)
5. [Monitoring Setup](#monitoring-setup)
6. [Incident Response](#incident-response)

---

## Pre-Deployment Checklist

### Environment Verification
- [ ] Supabase project is on Pro plan (required for pg_cron)
- [ ] All PostgreSQL extensions enabled:
```sql
  SELECT * FROM pg_extension WHERE extname IN ('ltree', 'vector', 'pg_net', 'pg_cron', 'pgcrypto');
```
- [ ] Service role key secured and not exposed in client code
- [ ] Environment variables set in Vercel/hosting platform

### Database Preparation
- [ ] Run all Phase 1-4 migrations in order
- [ ] Verify indexes exist:
```sql
  SELECT indexname FROM pg_indexes WHERE tablename = 'blocks';
```
- [ ] Run benchmark suite and confirm all pass:
```bash
  npm run benchmark -- $WORKSPACE_ID
```

### Application Verification
- [ ] TypeScript compilation passes: `npm run typecheck`
- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`

---

## Deployment Procedure

### Step 1: Database Migrations
```bash
# Apply Phase 4 migrations
supabase db push

# Verify migrations applied
supabase db diff
```

### Step 2: Edge Functions
```bash
# Deploy process-block function
supabase functions deploy process-block --project-ref <project-ref>

# Verify deployment
supabase functions list
```

### Step 3: Application Deployment
```bash
# Deploy to Vercel (or hosting platform)
vercel deploy --prod

# Verify deployment
curl -I https://your-domain.com/api/health
```

### Step 4: Enable Real-time Features
```sql
-- Enable Realtime for blocks table (if not already)
ALTER PUBLICATION supabase_realtime ADD TABLE blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
```

---

## Post-Deployment Validation

### Critical Path Testing
1. **Authentication Flow**
   - [ ] User can sign up
   - [ ] User can sign in
   - [ ] Session persists across page refreshes

2. **Document Operations**
   - [ ] Create new document
   - [ ] Edit document (blocks save correctly)
   - [ ] Delete document

3. **Real-time Features**
   - [ ] Presence shows other users
   - [ ] Cursor positions sync
   - [ ] Typing indicators work

4. **Performance Verification**
```bash
   npm run benchmark -- $PRODUCTION_WORKSPACE_ID
```

### Smoke Test Script
```bash
#!/bin/bash
# scripts/smoke-test.sh

BASE_URL="${1:-https://your-domain.com}"

echo "Running smoke tests against $BASE_URL"

# Test health endpoint
curl -sf "$BASE_URL/api/health" || exit 1
echo "✅ Health check passed"

# Test auth endpoint
curl -sf "$BASE_URL/api/auth/session" || exit 1
echo "✅ Auth endpoint accessible"

echo "✅ All smoke tests passed"
```

---

## Rollback Procedure

### Application Rollback
```bash
# Vercel instant rollback
vercel rollback

# Or deploy previous version
vercel deploy <previous-deployment-url> --prod
```

### Database Rollback
```sql
-- Phase 4 rollback (indexes only - non-destructive)
DROP INDEX IF EXISTS idx_blocks_parent_path_gist_optimized;
DROP INDEX IF EXISTS idx_blocks_document_sort_covering;
DROP INDEX IF EXISTS idx_blocks_embedding_hnsw_optimized;

-- Recreate original indexes
CREATE INDEX idx_blocks_parent_path_gist ON blocks USING GIST (parent_path);
CREATE INDEX idx_blocks_sort_order ON blocks(document_id, sort_order);
```

### Edge Function Rollback
```bash
# Deploy previous version
supabase functions deploy process-block --version <previous-version>
```

---

## Monitoring Setup

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time (P95) | < 500ms | > 1000ms |
| Database Query Time (P95) | < 100ms | > 250ms |
| Error Rate | < 0.1% | > 1% |
| WebSocket Connections | N/A | > 10,000 |
| CPU Usage | < 70% | > 85% |
| Memory Usage | < 80% | > 90% |

### Supabase Dashboard Queries

**Slow Queries**
```sql
SELECT 
    query,
    calls,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Active Connections**
```sql
SELECT 
    state,
    COUNT(*) 
FROM pg_stat_activity 
GROUP BY state;
```

**Table Sizes**
```sql
SELECT 
    relname as table,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### Vercel Analytics
- Enable Web Vitals tracking
- Set up custom events for critical user actions
- Configure alerts for error rate spikes

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 | Service Down | 15 minutes | API returning 500s |
| P2 | Major Degradation | 1 hour | Real-time not working |
| P3 | Minor Issue | 4 hours | Slow performance |
| P4 | Cosmetic | Next sprint | UI glitch |

### P1 Incident Playbook

1. **Acknowledge** (< 5 min)
   - Confirm incident in monitoring
   - Notify on-call engineer

2. **Assess** (< 10 min)
   - Check Vercel deployment status
   - Check Supabase status page
   - Check database connections

3. **Mitigate** (< 15 min)
   - If recent deployment: Rollback
   - If database: Scale up or failover
   - If external dependency: Enable fallback

4. **Communicate**
   - Update status page
   - Notify affected users

5. **Resolve**
   - Fix root cause
   - Deploy fix or confirm rollback stable

6. **Post-mortem** (< 48 hours)
   - Document timeline
   - Identify root cause
   - Define preventive actions

### Common Issues and Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Database connection pool exhausted | Slow queries, timeouts | Increase pool size in Supabase |
| HNSW index corruption | Vector search returns errors | REINDEX CONCURRENTLY |
| Real-time channel limit | Presence not working | Upgrade Supabase plan |
| Edge function cold starts | First request slow | Keep-alive pings |
