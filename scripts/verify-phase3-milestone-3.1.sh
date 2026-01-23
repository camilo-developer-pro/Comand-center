#!/bin/bash
# File: scripts/verify-phase3-milestone-3.1.sh

echo "=============================================="
echo "Phase 3.1: Meta-Agent Self-Repair Verification"
echo "=============================================="

# 1. Verify error taxonomy schema
echo "Step 1: Verifying error taxonomy schema..."
psql $DATABASE_URL -c "
SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'error_class'
) AS error_class_exists,
EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'episodic_memory' AND table_name = 'error_logs'
) AS error_logs_exists;
"

# 2. Verify diagnostic engine
echo "Step 2: Testing diagnostic engine..."
psql $DATABASE_URL -c "
SELECT episodic_memory.diagnose_error(
    (SELECT id FROM episodic_memory.error_logs LIMIT 1)
);
"

# 3. Verify Meta-Agent protocol exists
echo "Step 3: Checking Meta-Agent protocol..."
psql $DATABASE_URL -c "
SELECT name, version, is_system
FROM agent_runtime.protocols
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
"

# 4. Verify protocol version history table
echo "Step 4: Verifying protocol version history..."
psql $DATABASE_URL -c "
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'procedural_memory' AND table_name = 'protocol_versions'
) AS version_history_exists;
"

# 5. Run test suite
echo "Step 5: Running self-repair test suite..."
npm run test -- src/lib/__tests__/meta-agent-self-repair.test.ts

echo "=============================================="
echo "Phase 3.1 Verification Complete"
echo "=============================================="