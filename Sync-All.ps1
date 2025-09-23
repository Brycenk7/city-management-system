# Simple Sync All Files to GitHub
Write-Host "========================================" -ForegroundColor Green
Write-Host "    SYNC ALL FILES TO GITHUB" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$SOURCE = "C:\Users\bryce\Desktop\Cursor\DataManagement System 2"
$DEST = "C:\Users\bryce\Documents\GitHub\city-management-system"

Write-Host "[1/3] Copying all game files..." -ForegroundColor Yellow
Write-Host "From: $SOURCE" -ForegroundColor Gray
Write-Host "To: $DEST" -ForegroundColor Gray
Write-Host ""

# Copy all game files
$files = Get-ChildItem -Path $SOURCE -File | Where-Object { $_.Extension -match '\.(html|js|css|json|md|bat|ps1)$' }

foreach ($file in $files) {
    $destPath = Join-Path $DEST $file.Name
    Copy-Item $file.FullName $destPath -Force
    Write-Host "✓ Copied: $($file.Name)" -ForegroundColor Green
}

# Copy backend folder if it exists
if (Test-Path "$SOURCE\backend") {
    Write-Host "Copying backend folder..." -ForegroundColor Yellow
    if (Test-Path "$DEST\backend") {
        Remove-Item "$DEST\backend" -Recurse -Force
    }
    Copy-Item "$SOURCE\backend" "$DEST\backend" -Recurse -Force
    Write-Host "✓ Backend folder copied" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/3] Files copied successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "[3/3] Pushing to GitHub..." -ForegroundColor Yellow
Set-Location $DEST

Write-Host "Adding files to Git..." -ForegroundColor Gray
git add .

Write-Host "Committing changes..." -ForegroundColor Gray
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Updated game files - $timestamp"

Write-Host "Pushing to GitHub..." -ForegroundColor Gray
git push origin main

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    SYNC COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "All files have been synced to GitHub!" -ForegroundColor Green
Write-Host "Your game should be live at:" -ForegroundColor Cyan
Write-Host "https://bryce.github.io/city-management-system/" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
