# V3.1 Phase 4 Week 10: Presence Layer Verification (PowerShell)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "V3.1 Phase 4 Week 10: Presence Layer Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

# Step 1: Type check
Write-Host ""
Write-Host "Step 1: TypeScript Compilation Check" -ForegroundColor Yellow
Write-Host "------------------------------------"
try {
    npx tsc --noEmit
    Write-Host "✅ TypeScript compilation passed" -ForegroundColor Green
} catch {
    Write-Host "❌ TypeScript compilation failed" -ForegroundColor Red
    exit 1
}

# Step 2: Run unit tests
Write-Host ""
Write-Host "Step 2: Running Presence Tests" -ForegroundColor Yellow
Write-Host "------------------------------"
try {
    npm test -- src/__tests__/presence-integration.test.ts
    Write-Host "✅ Unit tests passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Unit tests failed" -ForegroundColor Red
    exit 1
}

# Step 3: Check file existence
Write-Host ""
Write-Host "Step 3: Verifying Required Files" -ForegroundColor Yellow
Write-Host "--------------------------------"

$files = @(
    "src/lib/realtime/presence-types.ts",
    "src/lib/hooks/useDocumentPresence.ts",
    "src/modules/editor/components/RemoteCursor.tsx",
    "src/modules/editor/components/TypingIndicator.tsx",
    "src/modules/editor/extensions/CursorTrackingExtension.ts",
    "src/modules/editor/components/PresenceAvatarStack.tsx",
    "src/modules/editor/components/DocumentHeader.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $file is missing" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Check exports
Write-Host ""
Write-Host "Step 4: Verifying Module Exports" -ForegroundColor Yellow
Write-Host "--------------------------------"

# Check that hooks are exported
if (Select-String -Path "src/lib/hooks/index.ts" -Pattern "useDocumentPresence" -Quiet) {
    Write-Host "✅ useDocumentPresence is exported" -ForegroundColor Green
} else {
    Write-Host "❌ useDocumentPresence is not exported from hooks/index.ts" -ForegroundColor Red
    exit 1
}

# Check that components are exported
if (Select-String -Path "src/modules/editor/components/index.ts" -Pattern "PresenceAvatarStack" -Quiet) {
    Write-Host "✅ PresenceAvatarStack is exported" -ForegroundColor Green
} else {
    Write-Host "❌ PresenceAvatarStack is not exported from components/index.ts" -ForegroundColor Red
    exit 1
}

if (Select-String -Path "src/modules/editor/components/index.ts" -Pattern "DocumentHeader" -Quiet) {
    Write-Host "✅ DocumentHeader is exported" -ForegroundColor Green
} else {
    Write-Host "❌ DocumentHeader is not exported from components/index.ts" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Presence Layer Verification Complete! ✅" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Manual Testing Checklist:" -ForegroundColor Yellow
Write-Host "-------------------------"
Write-Host "1. Open the same document in two browser windows"
Write-Host "2. Verify avatars appear in both windows"
Write-Host "3. Type in one window - verify 'typing...' appears in the other"
Write-Host "4. Move cursor in one window - verify remote cursor appears in the other"
Write-Host "5. Close one window - verify user disappears within 10 seconds"
Write-Host ""
Write-Host "To run manual tests:" -ForegroundColor Yellow
Write-Host "  npm run dev"
Write-Host "  Open http://localhost:3000/documents/[any-doc-id] in two windows"
