# Command Center ERP V1.1 - Phase 2 Verification Script (PowerShell)
# Live Widget Data

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Command Center ERP V1.1 - Phase 2 Verification" -ForegroundColor Cyan
Write-Host "Live Widget Data" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0

function Check-File($path) {
    if (Test-Path $path) {
        Write-Host "  [OK] $path" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [MISSING] $path" -ForegroundColor Red
        return $false
    }
}

function Check-Dir($path) {
    if (Test-Path $path -PathType Container) {
        Write-Host "  [OK] $path/" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [MISSING] $path/" -ForegroundColor Red
        return $false
    }
}

# Checking CRM Module Structure
Write-Host "Checking CRM Module Structure..." -ForegroundColor Yellow
if (-not (Check-Dir "src/modules/crm/types")) { $errors++ }
if (-not (Check-Dir "src/modules/crm/hooks")) { $errors++ }
if (-not (Check-Dir "src/modules/crm/actions")) { $errors++ }
if (-not (Check-Dir "src/modules/crm/components")) { $errors++ }
Write-Host ""

# Checking CRM Files
Write-Host "Checking CRM Files..." -ForegroundColor Yellow
if (-not (Check-File "src/modules/crm/types/index.ts")) { $errors++ }
if (-not (Check-File "src/modules/crm/actions/leadActions.ts")) { $errors++ }
if (-not (Check-File "src/modules/crm/hooks/useLeads.ts")) { $errors++ }
if (-not (Check-File "src/modules/crm/components/LeadListWidget.tsx")) { $errors++ }
if (-not (Check-File "src/modules/crm/index.ts")) { $errors++ }
Write-Host ""

# Checking Editor Components
Write-Host "Checking Editor Components..." -ForegroundColor Yellow
if (-not (Check-File "src/modules/editor/components/WidgetErrorBoundary.tsx")) { $errors++ }
if (-not (Check-File "src/modules/editor/components/AccessDeniedState.tsx")) { $errors++ }
if (-not (Check-File "src/modules/editor/components/WidgetSkeleton.tsx")) { $errors++ }
if (-not (Check-File "src/modules/editor/registry.tsx")) { $errors++ }
Write-Host ""

# Checking Database and Test Page
Write-Host "Checking Database and Test Page..." -ForegroundColor Yellow
if (-not (Check-File "supabase/migrations/00006_crm_seed_data.sql")) { $errors++ }
if (-not (Check-File "src/app/(dashboard)/widgets/page.tsx")) { $errors++ }
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "Phase 2 Verification PASSED" -ForegroundColor Green
    Write-Host "All files are in place." -ForegroundColor Green
} else {
    Write-Host "Phase 2 Verification FAILED" -ForegroundColor Red
    Write-Host "$errors error(s) found. Please review the output above." -ForegroundColor Red
}
Write-Host "==========================================" -ForegroundColor Cyan

exit $errors
