@echo off
echo Starting Jarvis Direct API...
echo.

REM Install required dependencies if not already installed
echo Checking and installing required packages...
pip install flask flask-cors

REM Start the Python API server
echo Starting Jarvis API server...
start cmd /k "python %~dp0jarvis_direct_api.py"

REM Wait for API server to start
echo Waiting for API server to start...
timeout /t 5 /nobreak > nul

REM Open the web UI in the default browser
echo Opening Jarvis Web Interface...
start "" "file:///%~dp0jarvis_direct_web/index.html"

echo.
echo Jarvis Direct Web Interface started successfully!
echo API running at: http://localhost:8080
echo.
echo Press any key to exit this window...
pause > nul
