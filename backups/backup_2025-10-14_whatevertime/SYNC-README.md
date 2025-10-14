# 🤖 Automated GitHub Sync

This folder contains scripts to automatically sync your game files to GitHub without manual work!

## 🚀 Quick Start

### Option 1: One-Click Sync (Recommended)
1. Double-click `Quick-Sync.bat`
2. Wait for it to complete
3. Your files are now on GitHub!

### Option 2: Manual Scripts
- `sync-to-github.bat` - Simple batch file version
- `sync-to-github.ps1` - Advanced PowerShell version

## 📁 What Gets Synced

The scripts automatically copy:
- All game files (*.html, *.js, *.css, *.md, *.json, etc.)
- Backend folder (if it exists)
- Assets folder (if it exists)
- Configuration files

## ⚙️ Configuration

Edit `sync-config.json` to customize:
- Source and destination directories
- Git repository URL
- File extensions to copy
- Folders to include/exclude

## 🔧 Setup Requirements

1. **Git must be installed** and in your system PATH
2. **PowerShell** (usually pre-installed on Windows)
3. **GitHub repository** must exist and be configured

## 🎯 How It Works

1. **Copy Files**: Copies all game files from "DataManagement System 2" to "city-management-system"
2. **Git Add**: Adds all changes to Git staging
3. **Git Commit**: Creates a commit with timestamp
4. **Git Push**: Pushes changes to GitHub

## 🚨 Troubleshooting

### "Git is not recognized"
- Install Git from https://git-scm.com/
- Make sure to check "Add to PATH" during installation
- Restart your computer after installation

### "PowerShell execution policy"
- Run PowerShell as Administrator
- Execute: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### "Repository not found"
- Make sure the city-management-system folder exists
- Check that it's a Git repository (has .git folder)
- Verify the GitHub repository URL in sync-config.json

## 📝 Customization

### Change File Paths
Edit `sync-config.json`:
```json
{
  "sourceDirectory": "C:\\Your\\Source\\Path",
  "destinationDirectory": "C:\\Your\\Destination\\Path"
}
```

### Add More File Types
Add to the `fileExtensions` array in `sync-config.json`:
```json
"fileExtensions": [
  "*.html",
  "*.js",
  "*.css",
  "*.your-extension"
]
```

## 🎉 Benefits

- **No Manual Work**: Just double-click and done!
- **Automatic Timestamps**: Each commit includes the date/time
- **Error Handling**: Scripts check for common issues
- **Customizable**: Easy to modify what gets synced
- **Fast**: Only copies changed files

## 🔄 Usage Tips

1. **Run Before Testing**: Sync before testing with friends
2. **Check Console**: Look for any error messages
3. **Verify on GitHub**: Check that files appear in your repository
4. **GitHub Pages**: Your changes will be live on GitHub Pages in a few minutes

---

**Happy Coding! 🎮**

