# Jarvis API Server Setup and Launcher

Write-Host "Setting up Jarvis AI API Server..." -ForegroundColor Cyan
Write-Host ""

# Define paths
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPath = Join-Path -Path $scriptPath -ChildPath "jarvis_api_server.py"
$requirementsPath = Join-Path -Path $scriptPath -ChildPath "api_requirements.txt"
$frontendPath = Join-Path -Path $scriptPath -ChildPath "frontend\index.html"

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "Found Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python is not installed or not in PATH. Please install Python 3.8+ and try again." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Install required dependencies
Write-Host "Installing required packages..." -ForegroundColor Yellow
try {
    if (Test-Path $requirementsPath) {
        pip install -r $requirementsPath
        Write-Host "Packages installed successfully." -ForegroundColor Green
    } else {
        pip install fastapi uvicorn websockets python-multipart pydantic
        Write-Host "Basic packages installed." -ForegroundColor Green
    }
} catch {
    Write-Host "Failed to install required packages: $_" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if API file exists
if (-not (Test-Path $apiPath)) {
    Write-Host "API file not found at: $apiPath" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Start the API server
Write-Host "Starting Jarvis API server..." -ForegroundColor Yellow
Write-Host "Server will be available at: http://localhost:8000" -ForegroundColor Green
Write-Host "API documentation will be available at: http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""

$apiProcess = Start-Process python -ArgumentList $apiPath -PassThru -WindowStyle Normal

# Check if API process started
if ($null -eq $apiProcess -or $apiProcess.HasExited) {
    Write-Host "Failed to start API server." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Wait for API server to initialize
Write-Host "Waiting for API server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Open the web interface
Write-Host "Opening Jarvis Web Interface..." -ForegroundColor Yellow
try {
    Start-Process "http://localhost:8000"
    Write-Host "Web interface opened successfully." -ForegroundColor Green
} catch {
    Write-Host "Failed to open web interface automatically." -ForegroundColor Yellow
    Write-Host "Please open your browser and go to: http://localhost:8000" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Jarvis AI API Server is now running!" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🌐 Web Interface: http://localhost:8000" -ForegroundColor Green
Write-Host "📚 API Documentation: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "🔌 WebSocket Endpoint: ws://localhost:8000/api/ws" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features available:" -ForegroundColor Yellow
Write-Host "✓ Voice input and text chat" -ForegroundColor White
Write-Host "✓ Real-time WebSocket communication" -ForegroundColor White
Write-Host "✓ Complete REST API for integration" -ForegroundColor White
Write-Host "✓ Dark/Light theme toggle" -ForegroundColor White
Write-Host "✓ Conversation history" -ForegroundColor White
Write-Host "✓ All your original Jarvis capabilities" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to stop the server and exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop the API process when exiting
if ($null -ne $apiProcess -and -not $apiProcess.HasExited) {
    Write-Host "Stopping API server..." -ForegroundColor Yellow
    Stop-Process -Id $apiProcess.Id -Force
    Write-Host "API server stopped." -ForegroundColor Green
}
