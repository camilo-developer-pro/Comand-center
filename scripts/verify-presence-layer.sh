#!/bin/bash
set -e

echo "=========================================="
echo "V3.1 Phase 4 Week 10: Presence Layer Verification"
echo "=========================================="

# Step 1: Type check
echo ""
echo "Step 1: TypeScript Compilation Check"
echo "------------------------------------"
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation passed"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Step 2: Run unit tests
echo ""
echo "Step 2: Running Presence Tests"
echo "------------------------------"
npm test -- src/__tests__/presence-integration.test.ts
if [ $? -eq 0 ]; then
    echo "✅ Unit tests passed"
else
    echo "❌ Unit tests failed"
    exit 1
fi

# Step 3: Check file existence
echo ""
echo "Step 3: Verifying Required Files"
echo "--------------------------------"

FILES=(
    "src/lib/realtime/presence-types.ts"
    "src/lib/hooks/useDocumentPresence.ts"
    "src/modules/editor/components/RemoteCursor.tsx"
    "src/modules/editor/components/TypingIndicator.tsx"
    "src/modules/editor/extensions/CursorTrackingExtension.ts"
    "src/modules/editor/components/PresenceAvatarStack.tsx"
    "src/modules/editor/components/DocumentHeader.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        exit 1
    fi
done

# Step 4: Check exports
echo ""
echo "Step 4: Verifying Module Exports"
echo "--------------------------------"

# Check that hooks are exported
if grep -q "useDocumentPresence" "src/lib/hooks/index.ts" 2>/dev/null; then
    echo "✅ useDocumentPresence is exported"
else
    echo "❌ useDocumentPresence is not exported from hooks/index.ts"
    exit 1
fi

# Check that components are exported
if grep -q "PresenceAvatarStack" "src/modules/editor/components/index.ts" 2>/dev/null; then
    echo "✅ PresenceAvatarStack is exported"
else
    echo "❌ PresenceAvatarStack is not exported from components/index.ts"
    exit 1
fi

if grep -q "DocumentHeader" "src/modules/editor/components/index.ts" 2>/dev/null; then
    echo "✅ DocumentHeader is exported"
else
    echo "❌ DocumentHeader is not exported from components/index.ts"
    exit 1
fi

echo ""
echo "=========================================="
echo "Presence Layer Verification Complete! ✅"
echo "=========================================="
echo ""
echo "Manual Testing Checklist:"
echo "-------------------------"
echo "1. Open the same document in two browser windows"
echo "2. Verify avatars appear in both windows"
echo "3. Type in one window - verify 'typing...' appears in the other"
echo "4. Move cursor in one window - verify remote cursor appears in the other"
echo "5. Close one window - verify user disappears within 10 seconds"
echo ""
echo "To run manual tests:"
echo "  npm run dev"
echo "  Open http://localhost:3000/documents/[any-doc-id] in two windows"
