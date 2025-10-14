# City Builder Backup System
# Automatically backs up all project files and maintains 3 rolling backups

param(
    [string]$ProjectPath = ".",
    [string]$BackupPath = ".\backups",
    [int]$MaxBackups = 3
)

function Create-Backup {
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backupName = "backup_$timestamp"
    $fullBackupPath = Join-Path $BackupPath $backupName
    
    Write-Host "Creating backup: $backupName" -ForegroundColor Cyan
    
    try {
        # Create backup directory
        New-Item -ItemType Directory -Path $fullBackupPath -Force | Out-Null
        
        # Get all files to backup (excluding backups folder and common temp files)
        $filesToBackup = Get-ChildItem -Path $ProjectPath -Recurse -File | Where-Object {
            $_.FullName -notlike "*\backups\*" -and
            $_.Name -notlike "*.tmp" -and
            $_.Name -notlike "*.log" -and
            $_.Name -notlike ".DS_Store" -and
            $_.Name -notlike "Thumbs.db"
        }
        
        $backupCount = 0
        foreach ($file in $filesToBackup) {
            # Get just the relative path within the project (no full system path)
            $relativePath = $file.FullName.Substring((Resolve-Path $ProjectPath).Path.Length + 1)
            
            # Create destination path within backup folder
            $destinationPath = Join-Path $fullBackupPath $relativePath
            
            # Create directory structure
            $destinationDir = Split-Path $destinationPath -Parent
            if (!(Test-Path $destinationDir)) {
                New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
            }
            
            # Copy file
            Copy-Item $file.FullName $destinationPath -Force
            $backupCount++
        }
        
        Write-Host "Backup completed: $backupCount files backed up to $backupName" -ForegroundColor Green
        return $fullBackupPath
    }
    catch {
        Write-Host "Backup failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Remove-OldBackups {
    param([string]$BackupPath, [int]$MaxBackups)
    
    $existingBackups = Get-ChildItem -Path $BackupPath -Directory | Where-Object { $_.Name -like "backup_*" } | Sort-Object CreationTime -Descending
    
    if ($existingBackups.Count -gt $MaxBackups) {
        $backupsToRemove = $existingBackups | Select-Object -Skip $MaxBackups
        
        foreach ($backup in $backupsToRemove) {
            Write-Host "Removing old backup: $($backup.Name)" -ForegroundColor Yellow
            Remove-Item $backup.FullName -Recurse -Force
        }
        
        Write-Host "Cleaned up old backups. Keeping $MaxBackups most recent backups." -ForegroundColor Green
    }
}

function Show-BackupStatus {
    param([string]$BackupPath)
    
    $existingBackups = Get-ChildItem -Path $BackupPath -Directory | Where-Object { $_.Name -like "backup_*" } | Sort-Object CreationTime -Descending
    
    Write-Host ""
    Write-Host "Current Backups:" -ForegroundColor Cyan
    if ($existingBackups.Count -eq 0) {
        Write-Host "   No backups found." -ForegroundColor Gray
    } else {
        foreach ($backup in $existingBackups) {
            $size = (Get-ChildItem $backup.FullName -Recurse -File | Measure-Object -Property Length -Sum).Sum
            $sizeFormatted = if ($size -gt 1MB) { "{0:N2} MB" -f ($size / 1MB) } else { "{0:N2} KB" -f ($size / 1KB) }
            Write-Host "   $($backup.Name) ($sizeFormatted) - $($backup.CreationTime)" -ForegroundColor White
        }
    }
    Write-Host ""
}

# Main execution
Write-Host "City Builder Backup System" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta

# Ensure backup directory exists
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    Write-Host "Created backup directory: $BackupPath" -ForegroundColor Cyan
}

# Show current status
Show-BackupStatus -BackupPath $BackupPath

# Create new backup
$newBackupPath = Create-Backup -ProjectPath $ProjectPath -BackupPath $BackupPath

if ($newBackupPath) {
    # Remove old backups if necessary
    Remove-OldBackups -BackupPath $BackupPath -MaxBackups $MaxBackups
    
    # Show final status
    Show-BackupStatus -BackupPath $BackupPath
    
    Write-Host "Backup system completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Backup system failed!" -ForegroundColor Red
    exit 1
}