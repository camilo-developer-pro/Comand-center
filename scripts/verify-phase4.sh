#!/bin/bash

echo "=========================================="
echo "Command Center ERP - Phase 4 Verification"
echo "=========================================="
echo ""

# Check migration files
echo "📁 Checking migration files..."
if [ -f "supabase/migrations/00002_performance_indexes.sql" ]; then
  echo "  ✅ 00002_performance_indexes.sql exists"
else
  echo "  ❌ 00002_performance_indexes.sql MISSING"
fi

if [ -f "supabase/migrations/00003_benchmark_function.sql" ]; then
  echo "  ✅ 00003_benchmark_function.sql exists"
else
  echo "  ⚠️  00003_benchmark_function.sql missing (optional)"
fi

echo ""

# Check query utilities
echo "📁 Checking query utilities..."
if [ -f "src/modules/editor/queries/documentWidgetQueries.ts" ]; then
  echo "  ✅ documentWidgetQueries.ts exists"
else
  echo "  ❌ documentWidgetQueries.ts MISSING"
fi

if [ -f "src/modules/editor/queries/index.ts" ]; then
  echo "  ✅ queries/index.ts exists"
else
  echo "  ❌ queries/index.ts MISSING"
fi

echo ""

# Check server actions
echo "📁 Checking server actions..."
if [ -f "src/modules/editor/actions/widgetQueryActions.ts" ]; then
  echo "  ✅ widgetQueryActions.ts exists"
else
  echo "  ❌ widgetQueryActions.ts MISSING"
fi

echo ""

# Check utils
echo "📁 Checking utilities..."
if [ -f "src/modules/editor/utils/performanceBenchmark.ts" ]; then
  echo "  ✅ performanceBenchmark.ts exists"
else
  echo "  ❌ performanceBenchmark.ts MISSING"
fi

echo ""

# Check documentation
echo "📁 Checking documentation..."
if [ -f "docs/PERFORMANCE_PATTERNS.md" ]; then
  echo "  ✅ PERFORMANCE_PATTERNS.md exists"
else
  echo "  ❌ PERFORMANCE_PATTERNS.md MISSING"
fi

echo ""
echo "=========================================="
echo "Phase 4 Verification Complete"
echo "=========================================="
