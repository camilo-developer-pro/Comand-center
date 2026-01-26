#!/bin/bash
set -e

echo "=========================================="
echo "V3.1 Phase 4: Stress Test Suite"
echo "=========================================="

# Ensure environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    exit 1
fi

echo ""
echo "Step 1: Running Fractional Index Stress Test"
echo "--------------------------------------------"
npx tsx scripts/stress-test-fractional.ts

echo ""
echo "Step 2: Running Concurrent Edit Stress Test"
echo "-------------------------------------------"
npx tsx scripts/stress-test-concurrent.ts

echo ""
echo "Step 3: Generating Stress Test Report"
echo "-------------------------------------"

# Run TypeScript report generator
npx tsx scripts/generate-stress-report.ts

echo ""
echo "=========================================="
echo "Stress Test Suite Complete!"
echo "=========================================="
