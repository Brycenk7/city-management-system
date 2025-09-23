@echo off
title Quick Sync to GitHub
color 0A

echo.
echo  ╔══════════════════════════════════════╗
echo  ║        QUICK SYNC TO GITHUB          ║
echo  ║                                      ║
echo  ║  This will copy your game files      ║
echo  ║  and push them to GitHub automatically ║
echo  ╚══════════════════════════════════════╝
echo.

REM Change to GitHub directory first
cd /d "C:\Users\bryce\Documents\GitHub"

REM Check if PowerShell is available
powershell -Command "Get-Command git" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git and try again.
    pause
    exit /b 1
)

echo Starting sync process...
echo Current directory: %CD%
echo.

REM Run the PowerShell script from the DataManagement System 2 folder
powershell -ExecutionPolicy Bypass -File "C:\Users\bryce\Desktop\Cursor\DataManagement System 2\sync-to-github.ps1"

echo.
echo Sync process completed!
pause
