# City Builder Backup System

## Overview
This backup system automatically creates backups of your project files every 5 prompts and maintains only the 3 most recent backups.

## Files Created

### Core Backup Files
- `backup-system.ps1` - Main backup script that creates timestamped backups
- `increment-prompt-counter.ps1` - Counter system that triggers backups every 5 prompts
- `prompt-counter.json` - Stores the current prompt count and backup settings

### Batch Files (Easy to Use)
- `backup-now.bat` - Run this to create a backup immediately
- `increment-counter.bat` - Run this to increment the prompt counter

### Configuration
- `backupInterval: 5` - Backups are created every 5 prompts
- `MaxBackups: 3` - Only keeps the 3 most recent backups

## How to Use

### Automatic Backups (Recommended)
1. Run `increment-counter.bat` after each prompt/conversation
2. After 5 prompts, it will automatically create a backup
3. Old backups are automatically deleted (keeps only 3 newest)

### Manual Backups
1. Run `backup-now.bat` to create a backup immediately
2. Or run: `powershell -ExecutionPolicy Bypass -File "backup-system.ps1"`

## Backup Structure
```
backups/
├── backup_2025-10-08_10-02-02/    (8.42 MB)
├── backup_2025-10-08_10-07-15/    (8.45 MB)
└── backup_2025-10-08_10-12-30/    (8.48 MB)
```

## What Gets Backed Up
- **All files from "DataManagement System 2" folder** copied directly to backup
- All project files (HTML, CSS, JavaScript, etc.)
- Excludes: backups folder, temp files, logs
- **No full path structure preserved** - files copied directly to backup folder

## Commands Summary
```bash
# Create backup now
backup-now.bat

# Increment prompt counter (triggers backup every 5 prompts)
increment-counter.bat

# View current backups
dir backups
```

## Integration with AI Assistant
The AI assistant should run `increment-counter.bat` after each response to track prompts and trigger automatic backups.
