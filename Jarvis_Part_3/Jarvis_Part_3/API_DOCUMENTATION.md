# Jarvis AI API Documentation

## Overview

This is a complete API implementation of your Jarvis_Part_3 project. It provides both a modern web interface and a comprehensive REST API that you can integrate into any website or application.

## Features

### 🌐 Web Interface
- Modern, responsive design with dark/light themes
- Real-time chat with voice input/output
- WebSocket support for instant messaging
- Conversation history
- Typing indicators and status updates

### 🔌 REST API
- Complete RESTful endpoints
- WebSocket support for real-time communication
- Session management
- Voice message processing (ready for integration)
- Comprehensive error handling

### 🤖 Jarvis Integration
- Direct integration with your original agent.py
- All existing tools and capabilities preserved
- Fallback to direct tool usage when agent is unavailable
- Real-time status monitoring

## Quick Start

### Option 1: PowerShell (Recommended)
```powershell
.\Start-JarvisAPI.ps1
```

### Option 2: Batch File
```batch
start_jarvis_api.bat
```

### Option 3: Manual Start
```bash
pip install fastapi uvicorn websockets python-multipart pydantic
python jarvis_api_server.py
```

## API Endpoints

### Core Endpoints

#### `GET /`
Returns the web interface or API information.

#### `GET /api/status`
Get current Jarvis status and capabilities.

**Response:**
```json
{
  "is_running": true,
  "modules_available": true,
  "available_tools": ["google_search", "get_weather", ...],
  "uptime": "00:05:23"
}
```

#### `POST /api/start`
Start the Jarvis agent.

**Response:**
```json
{
  "message": "Jarvis started successfully",
  "status": "running"
}
```

#### `POST /api/stop`
Stop the Jarvis agent.

#### `POST /api/restart`
Restart the Jarvis agent.

### Communication Endpoints

#### `POST /api/chat`
Send a text message to Jarvis.

**Request:**
```json
{
  "message": "What time is it?",
  "session_id": "optional_session_id",
  "is_voice_input": false
}
```

**Response:**
```json
{
  "message": "The current time is 2:30 PM",
  "success": true,
  "error": null,
  "data": {
    "session_id": "session_123",
    "processed_at": "2025-08-22T14:30:00"
  },
  "timestamp": "2025-08-22T14:30:00",
  "message_id": "msg_abc123"
}
```

#### `POST /api/voice`
Process voice messages (ready for speech-to-text integration).

**Request:**
```json
{
  "audio_data": "base64_encoded_audio",
  "session_id": "optional_session_id"
}
```

### Session Management

#### `GET /api/conversation/{session_id}`
Get conversation history for a specific session.

#### `DELETE /api/conversation/{session_id}`
Clear conversation history for a session.

### Tools and Capabilities

#### `GET /api/tools`
Get list of available Jarvis tools and capabilities.

**Response:**
```json
{
  "tools": ["google_search", "get_weather", "open", "close", ...],
  "total_count": 21,
  "modules_available": true
}
```

## WebSocket API

### Connection
Connect to: `ws://localhost:8000/api/ws`

### Message Types

#### Send Chat Message
```json
{
  "type": "chat",
  "message": "Hello Jarvis",
  "session_id": "session_123"
}
```

#### Request Status Update
```json
{
  "type": "status_request"
}
```

### Received Message Types

#### Connection Confirmation
```json
{
  "type": "connection",
  "data": {
    "message": "Connected to Jarvis API",
    "status": {"is_running": true, "modules_available": true}
  }
}
```

#### Chat Response
```json
{
  "type": "chat_response",
  "data": {
    "message": "Hello! How can I help you?",
    "success": true,
    "timestamp": "2025-08-22T14:30:00"
  }
}
```

#### Status Update
```json
{
  "type": "status_update",
  "data": {"is_running": true}
}
```

## Integration Examples

### JavaScript/HTML Integration

```html
<!-- Include in your website -->
<div id="jarvis-chat"></div>

<script>
// Connect to Jarvis API
const jarvisAPI = 'http://localhost:8000/api';

async function sendToJarvis(message) {
    const response = await fetch(`${jarvisAPI}/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            message: message,
            session_id: 'your_session_id'
        })
    });
    
    const data = await response.json();
    return data.message;
}

// Usage
sendToJarvis("What's the weather?").then(response => {
    console.log('Jarvis says:', response);
});
</script>
```

### Python Integration

```python
import requests

# Connect to your Jarvis API
API_URL = "http://localhost:8000/api"

def send_to_jarvis(message, session_id="default"):
    response = requests.post(f"{API_URL}/chat", json={
        "message": message,
        "session_id": session_id
    })
    return response.json()

# Usage
result = send_to_jarvis("Open notepad")
print(f"Jarvis response: {result['message']}")
```

### Node.js Integration

```javascript
const axios = require('axios');

const jarvisAPI = 'http://localhost:8000/api';

async function sendToJarvis(message, sessionId = 'default') {
    try {
        const response = await axios.post(`${jarvisAPI}/chat`, {
            message: message,
            session_id: sessionId
        });
        
        return response.data;
    } catch (error) {
        console.error('Error communicating with Jarvis:', error);
        return null;
    }
}

// Usage
sendToJarvis("Search for AI news").then(response => {
    if (response && response.success) {
        console.log('Jarvis says:', response.message);
    }
});
```

## Configuration

### Environment Variables
Create a `.env` file with your API keys:
```
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
WEATHER_API_KEY=your_weather_key
```

### Server Configuration
Modify `jarvis_api_server.py` to change:
- Host and port (default: 0.0.0.0:8000)
- CORS settings for production
- Authentication requirements

## Security Considerations

### For Production Use:
1. **CORS Configuration**: Restrict `allow_origins` to your specific domains
2. **Authentication**: Add API key or JWT token authentication
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **HTTPS**: Use HTTPS in production
5. **Input Validation**: Add comprehensive input validation

### Example Production CORS:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Change the port in `jarvis_api_server.py`
   - Or kill the process using the port: `netstat -ano | findstr :8000`

2. **Modules Not Found**
   - Ensure all your Jarvis modules are in the same directory
   - Check that Python can import your modules

3. **WebSocket Connection Failed**
   - Check firewall settings
   - Ensure the server is running
   - Verify the WebSocket URL

4. **Voice Input Not Working**
   - Enable microphone permissions in your browser
   - Use HTTPS for voice features in production

### Logs
Check the console output where you started `jarvis_api_server.py` for detailed error messages.

## Extending the API

### Adding New Endpoints
```python
@app.post("/api/custom-endpoint")
async def custom_endpoint(data: YourModel):
    # Your custom logic here
    return {"result": "success"}
```

### Adding Authentication
```python
from fastapi.security import HTTPBearer

security = HTTPBearer()

@app.post("/api/protected")
async def protected_endpoint(token: str = Depends(security)):
    # Verify token logic
    pass
```

## Support

For issues or questions:
1. Check the server logs for error messages
2. Verify all dependencies are installed
3. Ensure your original Jarvis modules are working
4. Check the API documentation at `/docs`

## License

This API wrapper maintains the same license as your original Jarvis project.
