@echo off
echo ========================================
echo   SYNCING ALL FILES TO GITHUB
echo ========================================
echo.

echo [1/4] Copying all updated files to GitHub directory...
echo.

REM Copy all the main game files
copy "index.html" "C:\Users\bryce\Documents\GitHub\city-management-system\index.html" /Y
copy "main.js" "C:\Users\bryce\Documents\GitHub\city-management-system\main.js" /Y
copy "core-map-system.js" "C:\Users\bryce\Documents\GitHub\city-management-system\core-map-system.js" /Y
copy "resource-management.js" "C:\Users\bryce\Documents\GitHub\city-management-system\resource-management.js" /Y
copy "cell-interaction.js" "C:\Users\bryce\Documents\GitHub\city-management-system\cell-interaction.js" /Y
copy "multiplayer-integration-simple.js" "C:\Users\bryce\Documents\GitHub\city-management-system\multiplayer-integration-simple.js" /Y
copy "websocket-manager.js" "C:\Users\bryce\Documents\GitHub\city-management-system\websocket-manager.js" /Y

REM Copy backend files
copy "backend\server.js" "C:\Users\bryce\Documents\GitHub\city-management-system\backend\server.js" /Y
copy "backend\package.json" "C:\Users\bryce\Documents\GitHub\city-management-system\backend\package.json" /Y
copy "backend\setup.bat" "C:\Users\bryce\Documents\GitHub\city-management-system\backend\setup.bat" /Y
copy "backend\.env" "C:\Users\bryce\Documents\GitHub\city-management-system\backend\.env" /Y
copy "backend\render.yaml" "C:\Users\bryce\Documents\GitHub\city-management-system\backend\render.yaml" /Y
copy "backend\Procfile" "C:\Users\bryce\Documents\GitHub\city-management-system\backend\Procfile" /Y

REM Copy any other important files
if exist "style.css" copy "style.css" "C:\Users\bryce\Documents\GitHub\city-management-system\style.css" /Y
if exist "script.js" copy "script.js" "C:\Users\bryce\Documents\GitHub\city-management-system\script.js" /Y

echo.
echo [2/4] Files copied successfully!
echo.

echo [3/4] Now navigate to GitHub directory and run these commands:
echo.
echo    cd "C:\Users\bryce\Documents\GitHub\city-management-system"
echo    git add .
echo    git commit -m "Updated multiplayer UI with dropdown design and all latest changes"
echo    git push origin main
echo.

echo [4/4] Sync complete! 
echo.
echo ========================================
echo   READY FOR GITHUB PUSH
echo ========================================
echo.
echo All files have been copied to:
echo C:\Users\bryce\Documents\GitHub\city-management-system
echo.
echo Run the git commands above to push to GitHub.
echo.

pause
