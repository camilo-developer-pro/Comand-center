#!/bin/bash

echo "=========================================="
echo "Command Center ERP V1.1 - Phase 3 Verification"
echo "Widget Insertion UX"
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
echo "📁 Checking Blocks Module..."
# ============================================================

check_dir "src/modules/editor/blocks" || ((ERRORS++))
check_file "src/modules/editor/blocks/types.ts" || ((ERRORS++))
check_file "src/modules/editor/blocks/widgetBlockSchema.ts" || ((ERRORS++))
check_file "src/modules/editor/blocks/WidgetBlockComponent.tsx" || ((ERRORS++))
check_file "src/modules/editor/blocks/index.ts" || ((ERRORS++))

echo ""

# ============================================================
echo "📄 Checking Editor Components..."
# ============================================================

check_file "src/modules/editor/components/WidgetPicker.tsx" || ((ERRORS++))
check_file "src/modules/editor/components/WidgetConfigPanel.tsx" || ((ERRORS++))
check_file "src/modules/editor/components/SlashMenuItems.tsx" || ((ERRORS++))
check_file "src/modules/editor/components/CommandCenterEditor.tsx" || ((ERRORS++))
check_file "src/modules/editor/components/index.ts" || ((ERRORS++))

echo ""

# ============================================================
echo "📄 Checking Editor Hooks..."
# ============================================================

check_dir "src/modules/editor/hooks" || ((ERRORS++))
check_file "src/modules/editor/hooks/useWidgetSuggestions.ts" || ((ERRORS++))
check_file "src/modules/editor/hooks/index.ts" || ((ERRORS++))

echo ""

# ============================================================
echo "📄 Checking Shared Hooks..."
# ============================================================

check_dir "src/lib/hooks" || ((ERRORS++))
check_file "src/lib/hooks/useDebounce.ts" || ((ERRORS++))
check_file "src/lib/hooks/index.ts" || ((ERRORS++))

echo ""

# ============================================================
echo "📄 Checking Test Page..."
# ============================================================

check_dir "src/app/(dashboard)/editor-test" || ((ERRORS++))
check_file "src/app/(dashboard)/editor-test/page.tsx" || ((ERRORS++))
check_file "src/app/(dashboard)/editor-test/EditorTestClient.tsx" || ((ERRORS++))

echo ""

# ============================================================
echo "📄 Checking Registry Update..."
# ============================================================

check_file "src/modules/editor/registry.tsx" || ((ERRORS++))

echo ""

# ============================================================
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ Phase 3 Verification PASSED${NC}"
  echo "All files are in place."
else
  echo -e "${RED}❌ Phase 3 Verification FAILED${NC}"
  echo "$ERRORS error(s) found. Please review the output above."
fi
echo "=========================================="

exit $ERRORS
