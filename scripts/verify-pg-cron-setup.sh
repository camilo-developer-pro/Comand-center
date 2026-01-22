#!/bin/bash

# =============================================================================
# pg_cron Analytics Setup Verification Script
# =============================================================================
# This script verifies that all migrations have been applied correctly and
# the pg_cron job is scheduled and functioning.
# =============================================================================

set -e  # Exit on any error

echo "=========================================="
echo "pg_cron Analytics Setup Verification"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run SQL and check result
check_sql() {
    local description="$1"
    local sql="$2"
    local expected="$3"
    
    echo -n "Checking: $description... "
    
    result=$(npx supabase db query "$sql" 2>/dev/null | tail -1 | tr -d '[:space:]')
    
    if [[ "$result" == *"$expected"* ]] || [[ -z "$expected" ]]; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (expected: $expected, got: $result)"
        return 1
    fi
}

# Step 1: Apply migrations
echo "Step 1: Applying migrations..."
echo "----------------------------------------"
npx supabase db push
echo ""

# Step 2: Verify pg_cron extension
echo "Step 2: Verifying pg_cron extension..."
echo "----------------------------------------"
check_sql "pg_cron extension exists" \
    "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');" \
    "t"

# Step 3: Verify materialized view
echo ""
echo "Step 3: Verifying materialized view..."
echo "----------------------------------------"
check_sql "mv_dashboard_stats view exists" \
    "SELECT EXISTS(SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_dashboard_stats');" \
    "t"

check_sql "Unique index exists on workspace_id" \
    "SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mv_dashboard_stats_workspace_id');" \
    "t"

# Step 4: Verify cron job
echo ""
echo "Step 4: Verifying cron jobs..."
echo "----------------------------------------"
check_sql "refresh_dashboard_stats job scheduled" \
    "SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'refresh_dashboard_stats');" \
    "t"

check_sql "process_refresh_queue job scheduled" \
    "SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'process_refresh_queue');" \
    "t"

# Step 5: Verify refresh queue table
echo ""
echo "Step 5: Verifying refresh queue..."
echo "----------------------------------------"
check_sql "mv_refresh_queue table exists" \
    "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'mv_refresh_queue');" \
    "t"

# Step 6: Verify trigger
echo ""
echo "Step 6: Verifying trigger..."
echo "----------------------------------------"
check_sql "items refresh trigger exists" \
    "SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trg_items_refresh_stats');" \
    "t"

# Step 7: Verify helper functions
echo ""
echo "Step 7: Verifying helper functions..."
echo "----------------------------------------"
check_sql "get_dashboard_stats function exists" \
    "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_dashboard_stats');" \
    "t"

check_sql "request_stats_refresh function exists" \
    "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'request_stats_refresh');" \
    "t"

check_sql "get_stats_health function exists" \
    "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_stats_health');" \
    "t"

# Step 8: Test manual refresh
echo ""
echo "Step 8: Testing manual refresh..."
echo "----------------------------------------"
echo -n "Executing REFRESH MATERIALIZED VIEW CONCURRENTLY... "
npx supabase db query "REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_stats;" 2>/dev/null
echo -e "${GREEN}✓ SUCCESS${NC}"

# Summary
echo ""
echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
echo ""
echo -e "${GREEN}All checks passed!${NC} pg_cron analytics system is ready."
echo ""
echo "Cron Schedule Summary:"
echo "  - refresh_dashboard_stats: Every 5 minutes (*/5 * * * *)"
echo "  - process_refresh_queue: Every minute (* * * * *)"
echo ""
echo "To monitor job execution, run:"
echo "  SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;"
echo ""
