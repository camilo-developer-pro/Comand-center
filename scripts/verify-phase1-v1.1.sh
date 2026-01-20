#!/bin/bash

echo "=========================================="
echo "Command Center ERP V1.1 - Phase 1 Verification"
echo "Authentication & User Flow"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
  if [ -f "$1" ]; then
    echo -e "  ${GREEN}✅${NC} $1"
    return 0
  else
    echo -e "  ${RED}❌${NC} $1 ${RED}MISSING${NC}"
    return 1
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo -e "  ${GREEN}✅${NC} $1/"
    return 0
  else
    echo -e "  ${RED}❌${NC} $1/ ${RED}MISSING${NC}"
    return 1
  fi
}

ERRORS=0

# ============================================================
echo "📦 Checking Dependencies..."
# ============================================================

for pkg in "@supabase/auth-ui-react" "@supabase/auth-ui-shared" "sonner" "zod" "react-hook-form" "@hookform/resolvers"; do
  if npm list "$pkg" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} $pkg"
  else
    echo -e "  ${RED}❌${NC} $pkg ${RED}NOT INSTALLED${NC}"
    ((ERRORS++))
  fi
done

echo ""

# ============================================================
echo "📁 Checking Auth Module Structure..."
# ============================================================

check_dir "src/modules/core/auth" || ((ERRORS++))
check_dir "src/modules/core/auth/types" || ((ERRORS++))
check_dir "src/modules/core/auth/schemas" || ((ERRORS++))
check_dir "src/modules/core/auth/hooks" || ((ERRORS++))
check_dir "src/modules/core/auth/actions" || ((ERRORS++))
check_dir "src/modules/core/auth/components" || ((ERRORS++))

echo ""

# ============================================================
echo "📄 Checking Auth Type Files..."
# ============================================================

check_file "src/modules/core/auth/types/index.ts" || ((ERRORS++))
check_file "src/modules/core/auth/schemas/index.ts" || ((ERRORS++))
check_file "src/modules/core/auth/index.ts" || ((ERRORS++))

echo ""

# ============================================================
echo "📄 Checking Server Actions..."
# ============================================================

check_file "src/modules/core/auth/actions/authActions.ts" || ((ERRORS++))
check_file "src/modules/core/auth/actions/workspaceActions.ts" || ((ERRORS++))
check_file "src/modules/core/auth/actions/index.ts" || ((ERRORS++))

echo ""

# ============================================================
echo "📄 Checking Auth Components..."
# ============================================================

check_file "src/modules/core/auth/components/LoginForm.tsx" || ((ERRORS++))
check_file "src/modules/core/auth/components/RegisterForm.tsx" || ((ERRORS++))
check_file "src/modules/core/auth/components/OAuthButtons.tsx" || ((ERRORS++))
check_file "src/modules/core/auth/components/UserMenu.tsx" || ((ERRORS++))
check_file "src/modules/core/auth/components/index.ts" || ((ERRORS++))

echo ""

# ============================================================
echo "📄 Checking Auth Pages..."
# ============================================================

check_file "src/app/(auth)/layout.tsx" || ((ERRORS++))
check_file "src/app/(auth)/login/page.tsx" || ((ERRORS++))
check_file "src/app/(auth)/register/page.tsx" || ((ERRORS++))
check_file "src/app/(auth)/callback/route.ts" || ((ERRORS++))
check_file "src/app/(auth)/verify-email/page.tsx" || ((ERRORS++))

echo ""

# ============================================================
echo "📄 Checking Middleware..."
# ============================================================

check_file "middleware.ts" || ((ERRORS++))
check_file "src/lib/supabase/middleware.ts" || ((ERRORS++))

echo ""

# ============================================================
echo "📄 Checking Layout Components..."
# ============================================================

check_file "src/components/layout/Header.tsx" || ((ERRORS++))
check_file "src/app/(dashboard)/layout.tsx" || ((ERRORS++))

echo ""

# ============================================================
echo "📄 Checking Database Migrations..."
# ============================================================

check_file "supabase/migrations/00004_auth_triggers.sql" || ((ERRORS++))

echo ""

# ============================================================
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ Phase 1 Verification PASSED${NC}"
  echo "All files and dependencies are in place."
else
  echo -e "${RED}❌ Phase 1 Verification FAILED${NC}"
  echo "$ERRORS error(s) found. Please review the output above."
fi
echo "=========================================="

exit $ERRORS
