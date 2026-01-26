$PassCount = 0
$FailCount = 0
$WarnCount = 0

function Check-Pass($Msg) {
    Write-Host "✅ PASS: $Msg" -ForegroundColor Green
    $script:PassCount++
}

function Check-Fail($Msg) {
    Write-Host "❌ FAIL: $Msg" -ForegroundColor Red
    $script:FailCount++
}

Write-Host "╔════════════════════════════════════════════════════════════╗"
Write-Host "║   Command Center V3.1 - Launch Readiness Verification      ║"
Write-Host "╚════════════════════════════════════════════════════════════╝"

# Section 1: Env
$NodeVersion = (node -v).Substring(1).Split('.')[0]
if ([int]$NodeVersion -ge 18) { Check-Pass "Node.js >= 18" } else { Check-Fail "Node.js < 18" }

# Section 4: DB
try {
    $DbCheck = npx tsx -e "
    import { createClient } from '@supabase/supabase-js';
    import dotenv from 'dotenv';
    dotenv.config({ path: '.env.local' });
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    client.from('workspaces').select('id').limit(1).then(({error}) => {
        if (error) { console.log('FAIL'); process.exit(1); }
        else { console.log('PASS'); process.exit(0); }
    });" 2>$null
    
    if ($DbCheck -match "PASS") { Check-Pass "Database connection" }
    else { Check-Fail "Database connection fail" }
} catch {
    Check-Fail "Database script error"
}

# Section 6: Files
$Files = @(
    "database/migrations/phase4/001_performance_indexes.sql",
    "docs/PRODUCTION_RUNBOOK.md",
    "docs/PERFORMANCE_TUNING.md"
)
foreach ($f in $Files) {
    if (Test-Path $f) { Check-Pass "Found $f" }
    else { Check-Fail "Missing $f" }
}

Write-Host "`nSummary: $PassCount Passed, $FailCount Failed"
if ($FailCount -eq 0) { Write-Host "🚀 LAUNCH READY" -ForegroundColor Cyan }
else { Write-Host "⛔ NOT READY" -ForegroundColor Red }
