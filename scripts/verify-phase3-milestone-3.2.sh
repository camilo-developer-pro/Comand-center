#!/bin/bash
# ============================================================
# Phase 3.2: Real-time Sync Verification
# ============================================================

set -e

echo "=============================================="
echo "Phase 3.2: Asynchronous State Sync Verification"
echo "=============================================="

# 1. Verify IVM infrastructure
echo "Step 1: Verifying incremental view infrastructure..."
psql $DATABASE_URL -c "
SELECT
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'mv_delta_queue') AS delta_queue_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_stats_live') AS stats_live_exists,
    EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_capture_item_delta') AS delta_trigger_exists;
"

# 2. Test delta capture
echo "Step 2: Testing delta capture trigger..."
TEST_WORKSPACE_ID="00000000-0000-0000-0000-000000000001"

# Insert test item
psql $DATABASE_URL -c "
INSERT INTO public.items (id, workspace_id, item_type, name)
VALUES (gen_random_uuid(), '$TEST_WORKSPACE_ID', 'document', 'test_realtime_doc')
RETURNING id;
"

# Check delta was captured
psql $DATABASE_URL -c "
SELECT * FROM public.mv_delta_queue
WHERE workspace_id = '$TEST_WORKSPACE_ID'
ORDER BY created_at DESC
LIMIT 1;
"

# 3. Verify notification channels
echo "Step 3: Verifying pg_notify channels..."
psql $DATABASE_URL -c "
SELECT pg_notify('test_channel', '{\"test\": true}');
SELECT 'Notification sent successfully' AS status;
"

# 4. Verify bridge API
echo "Step 4: Checking realtime bridge status..."
curl -s http://localhost:3000/api/realtime/bridge | jq .

# 5. Run latency test
echo "Step 5: Running end-to-end latency test..."
npm run test:e2e -- tests/realtime-latency.spec.ts

# 6. Cleanup
echo "Step 6: Cleaning up test data..."
psql $DATABASE_URL -c "
DELETE FROM public.items WHERE name = 'test_realtime_doc';
DELETE FROM public.mv_delta_queue WHERE workspace_id = '$TEST_WORKSPACE_ID';
"

echo "=============================================="
echo "Phase 3.2 Verification Complete"
echo "=============================================="