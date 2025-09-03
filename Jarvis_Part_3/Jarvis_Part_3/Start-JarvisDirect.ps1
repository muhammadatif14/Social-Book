# Jarvis Direct Web Interface Starter Script

Write-Host "Starting Jarvis Direct Web Interface..." -ForegroundColor Cyan
Write-Host ""

# Define paths
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPath = Join-Path -Path $scriptPath -ChildPath "jarvis_direct_api.py"
$webPath = Join-Path -Path $scriptPath -ChildPath "jarvis_direct_web\index.html"

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "Found Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python is not installed or not in PATH. Please install Python and try again." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Install required dependencies
Write-Host "Installing required packages..." -ForegroundColor Yellow
try {
    pip install flask flask-cors
    Write-Host "Packages installed successfully." -ForegroundColor Green
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

# Check if web interface file exists
if (-not (Test-Path $webPath)) {
    Write-Host "Web interface file not found at: $webPath" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Start the Python API server
Write-Host "Starting Jarvis API server..." -ForegroundColor Yellow
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
Start-Sleep -Seconds 5

# Open the web UI in the default browser
Write-Host "Opening Jarvis Web Interface..." -ForegroundColor Yellow
try {
    # Convert file path to URI
    $webUri = [System.Uri]::new($webPath)
    Start-Process $webUri.AbsoluteUri
    Write-Host "Web interface opened successfully." -ForegroundColor Green
} catch {
    Write-Host "Failed to open web interface: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Jarvis Direct Web Interface started successfully!" -ForegroundColor Cyan
Write-Host "API running at: http://localhost:8080" -ForegroundColor Green
Write-Host "Web interface: $webPath" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to stop Jarvis and exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop the API process when exiting
if ($null -ne $apiProcess -and -not $apiProcess.HasExited) {
    Write-Host "Stopping API server..." -ForegroundColor Yellow
    Stop-Process -Id $apiProcess.Id -Force
    Write-Host "API server stopped." -ForegroundColor Green
}
