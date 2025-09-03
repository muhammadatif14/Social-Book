@echo off
echo.
echo ========================================
echo    Jarvis AI API Server Launcher
echo ========================================
echo.

REM Install required dependencies
echo Installing required packages...
pip install fastapi uvicorn websockets python-multipart pydantic

echo.
echo Starting Jarvis API server...
echo Server will be available at: http://localhost:8000
echo.

REM Start the API server
start cmd /k "python %~dp0jarvis_api_server.py"

REM Wait for server to start
timeout /t 3 /nobreak > nul

REM Open the web interface
echo Opening Jarvis Web Interface...
start "" "http://localhost:8000"

echo.
echo Jarvis AI API Server is now running!
echo Web Interface: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
echo Press any key to exit this window...
pause > nul
