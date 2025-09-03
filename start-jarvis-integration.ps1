# Jarvis AI Integration Startup Script
# This script starts all necessary services for the Jarvis AI integration

Write-Host "🤖 Starting Jarvis AI Integration Services..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Function to check if a command exists
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-CommandExists "node")) {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

if (-not (Test-CommandExists "python")) {
    Write-Host "❌ Python is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

if (-not (Test-CommandExists "ng")) {
    Write-Host "❌ Angular CLI is not installed. Install with: npm install -g @angular/cli" -ForegroundColor Red
    exit 1
}

Write-Host "✅ All prerequisites found!" -ForegroundColor Green

# Get the current directory (should be the root of the social-media project)
$projectRoot = Get-Location

# Start Jarvis Backend Server
Write-Host "`n🚀 Starting Jarvis Backend Server..." -ForegroundColor Yellow
$backendPath = Join-Path $projectRoot "backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend directory not found at: $backendPath" -ForegroundColor Red
    exit 1
}

# Check if package.json exists and install dependencies if needed
$packageJsonPath = Join-Path $backendPath "package.json"
if (Test-Path $packageJsonPath) {
    $nodeModulesPath = Join-Path $backendPath "node_modules"
    if (-not (Test-Path $nodeModulesPath)) {
        Write-Host "📦 Installing backend dependencies..." -ForegroundColor Blue
        Set-Location $backendPath
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
            exit 1
        }
        Set-Location $projectRoot
    }
}

# Start the backend server in a new PowerShell window
$backendScript = @"
Write-Host 'Starting Jarvis Backend Server...' -ForegroundColor Green
Set-Location '$backendPath'
node jarvis-server.js
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

Write-Host "✅ Jarvis Backend Server started on http://localhost:8000" -ForegroundColor Green

# Wait a moment for the backend to start
Start-Sleep -Seconds 3

# Check Jarvis Python dependencies
Write-Host "`n🐍 Checking Jarvis Python dependencies..." -ForegroundColor Yellow
$jarvisPath = Join-Path $projectRoot "Jarvis_Part_3\Jarvis_Part_3"

if (-not (Test-Path $jarvisPath)) {
    Write-Host "❌ Jarvis directory not found at: $jarvisPath" -ForegroundColor Red
    Write-Host "Please ensure the Jarvis_Part_3 folder is in the project root" -ForegroundColor Yellow
} else {
    $requirementsPath = Join-Path $jarvisPath "requirements.txt"
    if (Test-Path $requirementsPath) {
        Write-Host "📋 Jarvis requirements.txt found" -ForegroundColor Green
        Write-Host "💡 Make sure to install Python dependencies with: pip install -r requirements.txt" -ForegroundColor Blue
    }
}

# Start Angular Frontend
Write-Host "`n🅰️ Starting Angular Frontend..." -ForegroundColor Yellow
$frontendPath = Join-Path $projectRoot "frontend"

if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Frontend directory not found at: $frontendPath" -ForegroundColor Red
    exit 1
}

# Check if node_modules exists and install dependencies if needed
$frontendNodeModulesPath = Join-Path $frontendPath "node_modules"
if (-not (Test-Path $frontendNodeModulesPath)) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
    Set-Location $frontendPath
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
        exit 1
    }
    Set-Location $projectRoot
}

# Start the frontend server in a new PowerShell window
$frontendScript = @"
Write-Host 'Starting Angular Frontend...' -ForegroundColor Green
Set-Location '$frontendPath'
ng serve
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript

Write-Host "✅ Angular Frontend starting on http://localhost:4200" -ForegroundColor Green

# Display final instructions
Write-Host "`n🎉 All services are starting up!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Wait for both servers to fully start (check the opened windows)" -ForegroundColor White
Write-Host "2. Open your browser and go to http://localhost:4200" -ForegroundColor White
Write-Host "3. Navigate to the AI Assistant page" -ForegroundColor White
Write-Host "4. Click 'Start Jarvis' to initialize the AI agent" -ForegroundColor White
Write-Host "5. Switch to 'Jarvis' mode and start chatting!" -ForegroundColor White

Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Yellow
Write-Host "- Backend Server: http://localhost:8000/api/health" -ForegroundColor White
Write-Host "- WebSocket: ws://localhost:8001" -ForegroundColor White
Write-Host "- Frontend: http://localhost:4200" -ForegroundColor White

Write-Host "`n⚠️ Important Notes:" -ForegroundColor Red
Write-Host "- Make sure to install Python dependencies: pip install -r requirements.txt" -ForegroundColor White
Write-Host "- Ensure your API keys are configured in the .env file" -ForegroundColor White
Write-Host "- Grant microphone permissions for voice features" -ForegroundColor White

Write-Host "`n🤖 Jarvis AI Integration is ready!" -ForegroundColor Cyan
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
