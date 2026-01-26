#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Command Center V3.1 - Launch Readiness Verification      ║"
echo "╚════════════════════════════════════════════════════════════╝"

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

check_pass() {
    echo "✅ PASS: $1"
    ((PASS_COUNT++))
}

check_fail() {
    echo "❌ FAIL: $1"
    ((FAIL_COUNT++))
}

check_warn() {
    echo "⚠️  WARN: $1"
    ((WARN_COUNT++))
}

# ============================================
# SECTION 1: Environment Verification
# ============================================
echo ""
echo "═══════════════════════════════════════"
echo "Section 1: Environment Verification"
echo "═══════════════════════════════════════"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    check_pass "Node.js version >= 18 (found: $(node -v))"
else
    check_fail "Node.js version >= 18 required (found: $(node -v))"
fi

# Check environment variables
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    check_pass "NEXT_PUBLIC_SUPABASE_URL is set"
else
    check_fail "NEXT_PUBLIC_SUPABASE_URL is not set"
fi

if [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    check_pass "NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
else
    check_fail "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"
fi

if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    check_pass "SUPABASE_SERVICE_ROLE_KEY is set"
else
    check_warn "SUPABASE_SERVICE_ROLE_KEY not set (needed for migrations)"
fi

# ============================================
# SECTION 2: Build Verification
# ============================================
echo ""
echo "═══════════════════════════════════════"
echo "Section 2: Build Verification"
echo "═══════════════════════════════════════"

# TypeScript compilation
echo "Running TypeScript check..."
if npm run typecheck 2>/dev/null; then
    check_pass "TypeScript compilation"
else
    check_fail "TypeScript compilation errors"
fi

# Next.js build
echo "Running production build..."
if npm run build 2>/dev/null; then
    check_pass "Next.js production build"
else
    check_fail "Next.js build failed"
fi

# ============================================
# SECTION 3: Test Suite
# ============================================
echo ""
echo "═══════════════════════════════════════"
echo "Section 3: Test Suite"
echo "═══════════════════════════════════════"

# Unit tests
echo "Running unit tests..."
if npm test -- --reporter=dot 2>/dev/null; then
    check_pass "Unit tests"
else
    check_fail "Unit tests failed"
fi

# Integration tests
echo "Running integration tests..."
if npm test -- --grep "integration" --reporter=dot 2>/dev/null; then
    check_pass "Integration tests"
else
    check_warn "Integration tests failed or not found"
fi

# ============================================
# SECTION 4: Database Verification
# ============================================
echo ""
echo "═══════════════════════════════════════"
echo "Section 4: Database Verification"
echo "═══════════════════════════════════════"

# Check database connection
echo "Checking database connection..."
DB_CHECK=$(npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
client.from('workspaces').select('count', { count: 'exact', head: true }).limit(1).then(({error}) => {
    console.log(error ? 'FAIL' : 'PASS');
    process.exit(0);
});
" 2>/dev/null)

if [ "$DB_CHECK" = "PASS" ]; then
    check_pass "Database connection"
else
    check_fail "Database connection failed"
fi

# Check required extensions
echo "Checking PostgreSQL extensions..."
EXTENSIONS=$(npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
client.rpc('check_extensions').then(({data, error}) => {
    if (error) {
        console.log('FAIL');
    } else {
        const required = ['ltree', 'vector', 'pg_net', 'pg_cron', 'pgcrypto'];
        const installed = data.map(e => e.name);
        console.log(required.every(r => installed.includes(r)) ? 'PASS' : 'FAIL');
    }
    process.exit(0);
});
" 2>/dev/null)

if [ "$EXTENSIONS" = "PASS" ]; then
    check_pass "PostgreSQL extensions (ltree, vector, pg_net, pg_cron, pgcrypto)"
else
    check_warn "PostgreSQL extensions check inconclusive or missing some extensions"
fi

# ============================================
# SECTION 5: Performance Verification
# ============================================
echo ""
echo "═══════════════════════════════════════"
echo "Section 5: Performance Verification"
echo "═══════════════════════════════════════"

if [ -n "$TEST_WORKSPACE_ID" ]; then
    echo "Running performance benchmarks..."
    if npm run benchmark -- "$TEST_WORKSPACE_ID" 2>/dev/null; then
        check_pass "Performance benchmarks"
    else
        check_warn "Performance benchmarks failed or incomplete"
    fi
else
    check_warn "TEST_WORKSPACE_ID not set, skipping benchmarks"
fi

# ============================================
# SECTION 6: File Verification
# ============================================
echo ""
echo "═══════════════════════════════════════"
echo "Section 6: Critical Files Verification"
echo "═══════════════════════════════════════"

CRITICAL_FILES=(
    "src/lib/hooks/useDocumentPresence.ts"
    "src/modules/editor/extensions/CursorTrackingExtension.ts"
    "database/migrations/phase4/001_performance_indexes.sql"
    "docs/PRODUCTION_RUNBOOK.md"
    "docs/PERFORMANCE_TUNING.md"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "File exists: $file"
    else
        check_fail "Missing file: $file"
    fi
done

# ============================================
# SUMMARY
# ============================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    VERIFICATION SUMMARY                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "  ✅ Passed:   $PASS_COUNT"
echo "  ⚠️  Warnings: $WARN_COUNT"
echo "  ❌ Failed:   $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                 🚀 LAUNCH READY - GO! 🚀                   ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    exit 0
else
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              ⛔ NOT READY - FIX FAILURES ⛔                ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    exit 1
fi
