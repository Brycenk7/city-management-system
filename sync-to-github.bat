@echo off
echo ========================================
echo    Automated Sync to GitHub
echo ========================================
echo.

REM Set source and destination paths
set "SOURCE_DIR=C:\Users\bryce\Desktop\Cursor\DataManagement System 2"
set "DEST_DIR=C:\Users\bryce\Documents\GitHub\city-management-system"

echo [1/4] Copying files from DataManagement System 2 to city-management-system...
echo.

REM Copy all game files (excluding system files)
xcopy "%SOURCE_DIR%\*.html" "%DEST_DIR%\" /Y /Q
xcopy "%SOURCE_DIR%\*.js" "%DEST_DIR%\" /Y /Q
xcopy "%SOURCE_DIR%\*.css" "%DEST_DIR%\" /Y /Q
xcopy "%SOURCE_DIR%\*.md" "%DEST_DIR%\" /Y /Q
xcopy "%SOURCE_DIR%\*.json" "%DEST_DIR%\" /Y /Q
xcopy "%SOURCE_DIR%\*.bat" "%DEST_DIR%\" /Y /Q
xcopy "%SOURCE_DIR%\*.yaml" "%DEST_DIR%\" /Y /Q
xcopy "%SOURCE_DIR%\*.yml" "%DEST_DIR%\" /Y /Q

REM Copy backend folder
if exist "%SOURCE_DIR%\backend" (
    echo Copying backend folder...
    xcopy "%SOURCE_DIR%\backend" "%DEST_DIR%\backend\" /E /Y /Q
)

REM Copy any other important folders
if exist "%SOURCE_DIR%\assets" (
    echo Copying assets folder...
    xcopy "%SOURCE_DIR%\assets" "%DEST_DIR%\assets\" /E /Y /Q
)

echo.
echo [2/4] Files copied successfully!
echo.

REM Navigate to destination directory
cd /d "%DEST_DIR%"

echo [3/4] Adding files to Git...
git add .

echo.
echo [4/4] Committing and pushing to GitHub...
git commit -m "Auto-sync: Updated game files from DataManagement System 2 - %date% %time%"
git push origin main

echo.
echo ========================================
echo    Sync Complete! 
echo ========================================
echo.
echo Files have been copied and pushed to GitHub.
echo You can now share the GitHub Pages link with friends!
echo.
pause
