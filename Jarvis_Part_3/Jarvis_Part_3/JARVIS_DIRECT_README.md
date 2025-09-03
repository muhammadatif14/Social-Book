# Jarvis Direct Web Interface

This is a simplified web interface for your Jarvis AI assistant that directly connects your frontend to your Python Jarvis agent without requiring a .NET middleman.

## Features

- Simple HTML/CSS/JavaScript frontend
- Direct connection to Python backend
- Real-time chat interface
- Voice input/output capabilities
- Light and dark mode
- Responsive design

## How to Start

### Option 1: PowerShell Script (Recommended)

1. Open PowerShell
2. Navigate to the project folder
3. Run `.\Start-JarvisDirect.ps1`

### Option 2: Batch File

1. Double-click on `start_jarvis_direct.bat`

### Option 3: Manual Start

1. Open a terminal and install the required packages:
   ```
   pip install flask flask-cors
   ```

2. Start the Python API server:
   ```
   python jarvis_direct_api.py
   ```

3. Open `jarvis_direct_web/index.html` in your browser

## Architecture

This implementation uses a simplified architecture:

```
Frontend (HTML/JS) <---> Python API Server <---> Jarvis Agent
```

The Python API server (`jarvis_direct_api.py`) exposes REST endpoints that the frontend can call directly. This eliminates the need for a separate .NET API server and a Python bridge.

## API Endpoints

- `GET /api/status` - Get Jarvis status
- `POST /api/start` - Start Jarvis
- `POST /api/stop` - Stop Jarvis
- `POST /api/chat` - Send a message to Jarvis
- `GET /api/tools` - Get list of available tools

## Technical Details

- The frontend is a simple HTML/CSS/JavaScript application
- The backend is a Python Flask server
- Communication happens via HTTP REST API calls
- Voice recognition uses the Web Speech API

## Requirements

- Python 3.6 or higher
- Flask and Flask-CORS packages
- A modern web browser

## Troubleshooting

- If the API server fails to start, check if port 8080 is available
- If the web interface doesn't connect, check browser console for errors
- If you see CORS errors, make sure Flask-CORS is installed and working

## Next Steps

You can enhance this implementation by:

1. Adding WebSocket support for real-time updates
2. Implementing proper authentication
3. Adding more advanced voice features
4. Creating a more sophisticated UI with frameworks like React/Vue/Angular
