# Automated Sync to GitHub - PowerShell Version
# This script copies files and pushes to GitHub automatically

Write-Host "========================================" -ForegroundColor Green
Write-Host "    Automated Sync to GitHub" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Set source and destination paths
$SOURCE_DIR = "C:\Users\bryce\Desktop\Cursor\DataManagement System 2"
$DEST_DIR = "C:\Users\bryce\Documents\GitHub\city-management-system"

Write-Host "[1/4] Copying files from DataManagement System 2 to city-management-system..." -ForegroundColor Yellow
Write-Host ""

# Check if destination directory exists
if (-not (Test-Path $DEST_DIR)) {
    Write-Host "ERROR: Destination directory does not exist: $DEST_DIR" -ForegroundColor Red
    Write-Host "Please create the city-management-system folder first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Copy all game files
$fileExtensions = @("*.html", "*.js", "*.css", "*.md", "*.json", "*.bat", "*.yaml", "*.yml", "*.txt")

foreach ($extension in $fileExtensions) {
    $files = Get-ChildItem -Path $SOURCE_DIR -Filter $extension -File
    foreach ($file in $files) {
        Copy-Item $file.FullName $DEST_DIR -Force
        Write-Host "Copied: $($file.Name)" -ForegroundColor Gray
    }
}

# Copy backend folder
if (Test-Path "$SOURCE_DIR\backend") {
    Write-Host "Copying backend folder..." -ForegroundColor Yellow
    if (Test-Path "$DEST_DIR\backend") {
        Remove-Item "$DEST_DIR\backend" -Recurse -Force
    }
    Copy-Item "$SOURCE_DIR\backend" "$DEST_DIR\backend" -Recurse -Force
    Write-Host "Backend folder copied successfully!" -ForegroundColor Green
}

# Copy assets folder if it exists
if (Test-Path "$SOURCE_DIR\assets") {
    Write-Host "Copying assets folder..." -ForegroundColor Yellow
    if (Test-Path "$DEST_DIR\assets") {
        Remove-Item "$DEST_DIR\assets" -Recurse -Force
    }
    Copy-Item "$SOURCE_DIR\assets" "$DEST_DIR\assets" -Recurse -Force
    Write-Host "Assets folder copied successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/4] Files copied successfully!" -ForegroundColor Green
Write-Host ""

# Navigate to destination directory
Set-Location $DEST_DIR

Write-Host "[3/4] Adding files to Git..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "[4/4] Committing and pushing to GitHub..." -ForegroundColor Yellow

# Create commit message with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "Auto-sync: Updated game files from DataManagement System 2 - $timestamp"

git commit -m $commitMessage
git push origin main

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    Sync Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Files have been copied and pushed to GitHub." -ForegroundColor Green
Write-Host "You can now share the GitHub Pages link with friends!" -ForegroundColor Green
Write-Host ""
Write-Host "GitHub Pages URL: https://bryce.github.io/city-management-system/" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
