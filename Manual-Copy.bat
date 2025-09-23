@echo off
echo Copying key files manually...

copy "multiplayer-integration-simple.js" "C:\Users\bryce\Documents\GitHub\city-management-system\"
copy "cell-interaction.js" "C:\Users\bryce\Documents\GitHub\city-management-system\"
copy "resource-management.js" "C:\Users\bryce\Documents\GitHub\city-management-system\"
copy "core-map-system.js" "C:\Users\bryce\Documents\GitHub\city-management-system\"
copy "main.js" "C:\Users\bryce\Documents\GitHub\city-management-system\"
copy "index.html" "C:\Users\bryce\Documents\GitHub\city-management-system\"
copy "script.js" "C:\Users\bryce\Documents\GitHub\city-management-system\"
copy "styles.css" "C:\Users\bryce\Documents\GitHub\city-management-system\"

echo Files copied! Now go to your GitHub folder and run:
echo git add .
echo git commit -m "Updated multiplayer UI"
echo git push origin main

pause
