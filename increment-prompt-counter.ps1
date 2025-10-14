# Increment prompt counter and trigger backup if needed
param(
    [string]$CounterFile = "prompt-counter.json",
    [string]$BackupScript = "backup-system.ps1"
)

# Read current counter
if (Test-Path $CounterFile) {
    $counterData = Get-Content $CounterFile | ConvertFrom-Json
} else {
    $counterData = @{
        promptCount = 0
        lastBackupPrompt = 0
        backupInterval = 5
    }
}

# Increment prompt count
$counterData.promptCount++

Write-Host "Prompt Count: $($counterData.promptCount)" -ForegroundColor Cyan

# Check if it's time for a backup
$promptsSinceLastBackup = $counterData.promptCount - $counterData.lastBackupPrompt

if ($promptsSinceLastBackup -ge $counterData.backupInterval) {
    Write-Host "Time for backup! ($promptsSinceLastBackup prompts since last backup)" -ForegroundColor Yellow
    
    # Update last backup prompt
    $counterData.lastBackupPrompt = $counterData.promptCount
    
    # Run backup
    Write-Host "Triggering automatic backup..." -ForegroundColor Green
    & ".\$BackupScript"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Automatic backup completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Automatic backup failed!" -ForegroundColor Red
    }
} else {
    $remaining = $counterData.backupInterval - $promptsSinceLastBackup
    Write-Host "Next backup in $remaining prompt(s)" -ForegroundColor Gray
}

# Save updated counter
$counterData | ConvertTo-Json | Set-Content $CounterFile

return $counterData.promptCount