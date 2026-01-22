# Phase 1: Substrate Hardening - Deployment Runbook

## Prerequisites

### Required Access
- [ ] PostgreSQL superuser access (for extensions)
- [ ] Application database user credentials
- [ ] Backup system access

### Pre-Deployment Checklist
- [ ] Database backup completed (pg_dump -Fc)
- [ ] Application traffic paused or in maintenance mode
- [ ] Monitoring alerts configured
- [ ] Rollback scripts tested in staging

## Deployment Steps

### Step 1: Create Backup (Time: 5-30 min depending on size)
```bash
pg_dump -h $DB_HOST -U $DB_SUPERUSER -Fc -f pre_phase1_backup.dump $DB_NAME
```

### Step 2: Deploy Extensions and Schemas (Time: 1 min)
```bash
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/001_extensions.sql
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/002_schemas.sql
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/003_roles.sql
```

**Verify:**
```sql
SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto', 'pg_partman', 'vector');
SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE '%_memory';
```

### Step 3: Deploy Core Functions (Time: 1 min)
```bash
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/004_uuidv7_function.sql
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/005_fractional_indexing.sql
```

**Verify:**
```sql
SELECT generate_uuidv7();
SELECT fi_generate_key_between('a', 'c');
```

### Step 4: Deploy Memory Schemas (Time: 2 min)
```bash
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/006_episodic_memory_schema.sql
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/007_episodic_partman_setup.sql
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/008_semantic_memory_schema.sql
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/009_procedural_memory_schema.sql
```

**Verify:**
```sql
-- Check partitions created
SELECT tablename FROM pg_tables WHERE schemaname = 'episodic_memory' AND tablename LIKE 'events_%';

-- Check tables exist
SELECT table_schema, table_name FROM information_schema.tables
WHERE table_schema IN ('episodic_memory', 'semantic_memory', 'procedural_memory');
```

### Step 5: Deploy Entity Resolution (Time: 1 min)
```bash
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/010_entity_resolution_trigger.sql
```

**Verify:**
```sql
SELECT * FROM semantic_memory.resolution_config;
```

### Step 6: Deploy Migration Infrastructure (Time: 1 min)
```bash
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/011_dual_write_infrastructure.sql
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/012_logs_migration.sql
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/013_entity_backfill_resolution.sql
```

### Step 7: Run Verification Suite (Time: 2 min)
```bash
psql -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME -f migrations/phase1/verify_phase1_complete.sql
```

**Expected Output:**
All test suites should show 100% pass rate.

### Step 8: Execute Data Migrations (Time: Variable)

**8a: Run Logs Backfill** (skip if no legacy logs table)
```sql
CALL migration.pr_backfill_logs_to_events(1000, 100);
```

**8b: Run Entity Resolution** (if existing entities)
```sql
CALL migration.pr_resolve_all_entities(1000, 0.90, 100);
```

### Step 9: Resume Application Traffic
- [ ] Disable maintenance mode
- [ ] Monitor error rates
- [ ] Check partition maintenance job scheduled

## Rollback Procedure

### Full Rollback (restore from backup)
```bash
# Stop application
psql -h $DB_HOST -U $DB_SUPERUSER -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

# Drop and recreate database
dropdb -h $DB_HOST -U $DB_SUPERUSER $DB_NAME
createdb -h $DB_HOST -U $DB_SUPERUSER $DB_NAME

# Restore backup
pg_restore -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME pre_phase1_backup.dump
```

### Partial Rollback (specific components)

**Rollback Dual-Write Triggers:**
```sql
DROP TRIGGER IF EXISTS trg_dual_write_logs_events ON public.logs;
UPDATE migration.migration_status SET phase = 'rolled_back' WHERE migration_name = 'logs_to_episodic_events';
```

**Rollback Entity Resolution:**
```sql
-- Revert merged entities
UPDATE semantic_memory.entities SET status = 'active', merged_into_id = NULL
WHERE status = 'merged' AND metadata->>'_merge_batch' IS NOT NULL;
```

## Post-Deployment Monitoring

### Key Metrics to Watch
1. Partition creation (pg_partman should create monthly)
2. Insert performance on episodic_memory.events
3. Entity resolution trigger latency
4. Dual-write error rate (check migration.migration_log)

### Scheduled Jobs Required
```sql
-- Add to pg_cron or external scheduler
-- Run pg_partman maintenance daily
SELECT cron.schedule('partman_maintenance', '0 3 * * *', 'SELECT partman.run_maintenance()');
```

## Troubleshooting

### Problem: Partition not created
```sql
SELECT partman.run_maintenance('episodic_memory.events');
SELECT * FROM partman.part_config WHERE parent_table = 'episodic_memory.events';
```

### Problem: Entity resolution blocking legitimate inserts
```sql
-- Temporarily disable
UPDATE semantic_memory.resolution_config SET blocking_enabled = FALSE WHERE id = 1;

-- Or switch to non-strict mode
UPDATE semantic_memory.resolution_config SET strict_mode = FALSE WHERE id = 1;
```

### Problem: Dual-write errors filling logs
```sql
-- Check error rate
SELECT COUNT(*), level FROM migration.migration_log
WHERE migration_name = 'logs_to_episodic_events' AND logged_at > NOW() - INTERVAL '1 hour'
GROUP BY level;

-- Disable if critical
DROP TRIGGER trg_dual_write_logs_events ON public.logs;