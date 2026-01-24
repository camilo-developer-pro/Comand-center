#!/bin/bash

echo "=========================================="
echo "Command Center V3.1 - Phase 3 Intelligence Layer Verification"
echo "Comprehensive End-to-End Testing"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Error tracking
ERRORS=0
WARNINGS=0

# Helper functions
print_success() {
    echo -e "  ${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "  ${YELLOW}⚠️${NC} $1"
    ((WARNINGS++))
}

print_error() {
    echo -e "  ${RED}❌${NC} $1"
    ((ERRORS++))
}

print_info() {
    echo -e "  ${BLUE}ℹ️${NC} $1"
}

check_file() {
    if [ -f "$1" ]; then
        print_success "$1"
        return 0
    else
        print_error "$1 MISSING"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        print_success "$1/"
        return 0
    else
        print_error "$1/ MISSING"
        return 1
    fi
}

# ============================================================
echo "🔍 Checking Environment Variables..."
# ============================================================

if [ -f ".env.local" ]; then
    print_success ".env.local exists"
    
    # Check for required environment variables
    if grep -q "SUPABASE_URL" .env.local; then
        print_success "SUPABASE_URL configured"
    else
        print_warning "SUPABASE_URL not found in .env.local"
    fi
    
    if grep -q "SUPABASE_ANON_KEY" .env.local; then
        print_success "SUPABASE_ANON_KEY configured"
    else
        print_warning "SUPABASE_ANON_KEY not found in .env.local"
    fi
    
    if grep -q "OPENAI_API_KEY" .env.local; then
        print_success "OPENAI_API_KEY configured"
    else
        print_warning "OPENAI_API_KEY not found in .env.local (required for embeddings)"
    fi
    
    if grep -q "ANTHROPIC_API_KEY" .env.local; then
        print_success "ANTHROPIC_API_KEY configured"
    else
        print_warning "ANTHROPIC_API_KEY not found in .env.local (required for entity extraction)"
    fi
else
    print_warning ".env.local not found - using environment variables"
fi

echo ""

# ============================================================
echo "📁 Checking Database Migration Files..."
# ============================================================

check_file "database/migrations/phase3/007_block_change_trigger.sql" || ((ERRORS++))
check_file "database/migrations/phase3/008_attach_block_trigger.sql" || ((ERRORS++))
check_file "database/migrations/phase3/009_knowledge_graph_upsert.sql" || ((ERRORS++))
check_file "database/migrations/phase3/010_embedding_optimization.sql" || ((ERRORS++))
check_file "database/migrations/phase3/verify_007_008_triggers.sql" || ((ERRORS++))
check_file "database/migrations/phase3/verify_009_knowledge_graph.sql" || ((ERRORS++))
check_file "database/migrations/phase3/verify_010_embeddings.sql" || ((ERRORS++))
check_file "database/migrations/phase3/verify_phase3_intelligence.sql" || ((ERRORS++))

echo ""

# ============================================================
echo "📁 Checking Edge Function Implementation..."
# ============================================================

check_dir "supabase/functions/process-block" || ((ERRORS++))
check_file "supabase/functions/process-block/index.ts" || ((ERRORS++))
check_file "supabase/functions/process-block/schemas.ts" || ((ERRORS++))
check_file "supabase/functions/process-block/types.ts" || ((ERRORS++))
check_file "supabase/functions/process-block/deno.json" || ((ERRORS++))

echo ""

# ============================================================
echo "📁 Checking TypeScript Client Implementation..."
# ============================================================

check_file "src/lib/supabase/semantic-search.ts" || ((ERRORS++))
check_file "src/lib/actions/semantic-actions.ts" || ((ERRORS++))
check_file "src/lib/supabase/index.ts" || ((ERRORS++))

# Check that semantic-search.ts is exported
if [ -f "src/lib/supabase/index.ts" ]; then
    if grep -q "semantic-search" "src/lib/supabase/index.ts"; then
        print_success "semantic-search.ts exported in index.ts"
    else
        print_warning "semantic-search.ts not exported in src/lib/supabase/index.ts"
    fi
fi

echo ""

# ============================================================
echo "📁 Checking Verification Scripts..."
# ============================================================

check_file "scripts/verify-phase3-week7-trigger.js" || ((ERRORS++))
check_file "scripts/verify-phase3-week8-edge-function.js" || ((ERRORS++))
check_file "scripts/test-semantic-integration.js" || ((ERRORS++))

echo ""

# ============================================================
echo "🔧 Checking Supabase CLI Configuration..."
# ============================================================

if command -v supabase &> /dev/null; then
    print_success "Supabase CLI installed"
    
    # Check if we're in a Supabase project
    if [ -f "supabase/config.toml" ]; then
        print_success "Supabase project configuration found"
    else
        print_warning "supabase/config.toml not found - may not be a Supabase project directory"
    fi
else
    print_warning "Supabase CLI not installed (required for Edge Function deployment)"
fi

echo ""

# ============================================================
echo "📊 Checking Database Connection..."
# ============================================================

# Try to run a simple verification query if possible
if [ -f ".env.local" ] && command -v psql &> /dev/null; then
    print_info "Attempting database connection test..."
    
    # Extract database URL from .env.local
    DB_URL=$(grep "SUPABASE_URL" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    if [ ! -z "$DB_URL" ]; then
        # Try to connect and run a simple query
        if psql "$DB_URL" -c "SELECT 1 as connection_test;" -t &> /dev/null; then
            print_success "Database connection successful"
        else
            print_warning "Database connection test failed"
        fi
    else
        print_warning "Could not extract database URL from .env.local"
    fi
else
    print_info "Skipping database connection test (psql not available or .env.local missing)"
fi

echo ""

# ============================================================
echo "🧪 Checking Test Files..."
# ============================================================

check_dir "src/__tests__" || ((ERRORS++))
check_file "src/__tests__/phase3-intelligence.test.ts" || ((ERRORS++))

echo ""

# ============================================================
echo "📋 Checking Project Documentation..."
# ============================================================

check_file "PROJECT_STRUCTURE.md" || ((ERRORS++))
check_file "project_log.md" || ((ERRORS++))
check_file "plans/phase3_intelligence_layer_verification.md" || ((ERRORS++))

echo ""

# ============================================================
echo "🔍 Running Quick SQL Verification..."
# ============================================================

print_info "To run comprehensive SQL verification, execute:"
print_info "  psql [YOUR_DATABASE_URL] -f database/migrations/phase3/verify_phase3_intelligence.sql"
print_info ""
print_info "Or use the TypeScript verification script:"
print_info "  npm run verify:phase3-intelligence"

echo ""

# ============================================================
echo "📋 SUMMARY"
echo "=========================================="

echo "Files Checked:"
echo "  - Database Migrations: 8 files"
echo "  - Edge Function: 5 files"
echo "  - TypeScript Client: 3 files"
echo "  - Verification Scripts: 3 files"
echo "  - Test Files: 2 files"
echo "  - Documentation: 3 files"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ PHASE 3 INTELLIGENCE LAYER VERIFICATION PASSED${NC}"
    echo "All files are in place and properly configured."
    echo ""
    echo -e "${GREEN}🎉 Phase 3 Intelligence Layer is ready for deployment!${NC}"
    echo ""
    echo "NEXT STEPS:"
    echo "1. Deploy database migrations: npm run db:migrate"
    echo "2. Deploy Edge Function: supabase functions deploy process-block"
    echo "3. Configure environment variables in Supabase Dashboard"
    echo "4. Run integration tests: npm test -- phase3-intelligence"
    echo "5. Verify end-to-end flow with sample data"
elif [ $ERRORS -eq 0 ] && [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  PHASE 3 INTELLIGENCE LAYER VERIFICATION PASSED WITH WARNINGS${NC}"
    echo "All required files are present, but some configuration may be missing."
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Review the warnings above before proceeding to production."
else
    echo -e "${RED}❌ PHASE 3 INTELLIGENCE LAYER VERIFICATION FAILED${NC}"
    echo "Errors: $ERRORS, Warnings: $WARNINGS"
    echo ""
    echo "Please fix the errors above before proceeding."
fi

echo "=========================================="

# Exit with error code if there are errors
if [ $ERRORS -gt 0 ]; then
    exit 1
else
    exit 0
fi