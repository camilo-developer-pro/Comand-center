# Apply Rank Key Migration Script
# This script helps you apply the fractional indexing migration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fractional Indexing Migration - V2.1" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$migrationFile = "supabase\migrations\20250121_001_add_rank_key_column.sql"
$verifyFile = "supabase\migrations\verify_rank_key.sql"

# Check if migration file exists
if (-not (Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found at $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Migration file found: $migrationFile" -ForegroundColor Green
Write-Host ""

# Display options
Write-Host "Choose how to apply this migration:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Apply via Supabase Dashboard (Recommended)" -ForegroundColor White
Write-Host "   - Copy SQL content to clipboard" -ForegroundColor Gray
Write-Host "   - Open Supabase Dashboard SQL Editor" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Apply via Supabase CLI (Local)" -ForegroundColor White
Write-Host "   - Run: npx supabase db reset" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Apply via Supabase CLI (Remote)" -ForegroundColor White
Write-Host "   - Run: npx supabase db push" -ForegroundColor Gray
Write-Host ""
Write-Host "4. View migration SQL" -ForegroundColor White
Write-Host ""
Write-Host "5. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Copying migration SQL to clipboard..." -ForegroundColor Yellow
    try {
        Get-Content $migrationFile | Set-Clipboard
        Write-Host "✓ SQL copied to clipboard!" -ForegroundColor Green
    } catch {
        Write-Host "Could not copy to clipboard. Please copy the SQL from the file manually: $migrationFile" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Go to your Supabase Dashboard" -ForegroundColor White
    Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
    Write-Host "3. Click 'New Query'" -ForegroundColor White
    Write-Host "4. Paste (Ctrl+V) and click 'Run'" -ForegroundColor White
    Write-Host "5. Verify success message" -ForegroundColor White
    Write-Host ""
    
    $openDashboard = Read-Host "Open Supabase Dashboard? (y/n)"
    if ($openDashboard -eq "y") {
        Start-Process "https://app.supabase.com"
    }
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "Running: npx supabase db reset" -ForegroundColor Yellow
    Write-Host ""
    npx supabase db reset
} elseif ($choice -eq "3") {
    Write-Host ""
    Write-Host "Running: npx supabase db push" -ForegroundColor Yellow
    Write-Host ""
    npx supabase db push
} elseif ($choice -eq "4") {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Migration SQL Content" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Get-Content $migrationFile | Write-Host
    Write-Host ""
} elseif ($choice -eq "5") {
    Write-Host "Exiting..." -ForegroundColor Gray
    exit 0
} else {
    Write-Host "Invalid choice. Exiting..." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After applying the migration, verify it with:" -ForegroundColor Yellow
Write-Host "  Run the SQL in: $verifyFile" -ForegroundColor White
Write-Host ""

$copyVerify = Read-Host "Copy verification SQL to clipboard? (y/n)"
if ($copyVerify -eq "y") {
    try {
        Get-Content $verifyFile | Set-Clipboard
        Write-Host "✓ Verification SQL copied to clipboard!" -ForegroundColor Green
    } catch {
        Write-Host "Could not copy to clipboard. Please copy the SQL from: $verifyFile" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Migration process complete!" -ForegroundColor Green
Write-Host ""
