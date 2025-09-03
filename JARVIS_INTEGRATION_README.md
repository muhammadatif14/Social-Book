# Jarvis AI Agent Integration

This document explains how to set up and use the Jarvis AI Agent integration in your social media application.

## Overview

The Jarvis AI Agent is integrated into the AI Assistant page, providing advanced capabilities including:

- System control and automation
- Web search functionality
- File management operations
- Weather information
- Voice recognition and commands
- Real-time chat interface

## Setup Instructions

### Prerequisites

1. **Python Environment**: Ensure Python 3.8+ is installed
2. **Node.js**: Ensure Node.js 16+ is installed for the backend server
3. **Required Dependencies**: Install all Python and Node.js dependencies

### Backend Setup

1. **Install Node.js Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Install Python Dependencies**:
   ```bash
   cd Jarvis_Part_3/Jarvis_Part_3
   pip install -r requirements.txt
   ```

3. **Configure Environment**:
   - Ensure you have all necessary API keys configured in your `.env` file
   - Update the `agent.py` file with your specific API keys if needed

### Starting the Services

1. **Start the Jarvis Backend Server**:
   ```bash
   cd backend
   npm start
   ```
   This will start the server on `http://localhost:8000` and WebSocket on `ws://localhost:8001`

2. **Start your Angular Frontend**:
   ```bash
   cd frontend
   ng serve
   ```

3. **Navigate to AI Assistant Page**:
   - Open your web browser and go to your social media application
   - Click on "AI Assistant" in the navigation

## Using Jarvis AI Agent

### Starting Jarvis

1. **On the AI Assistant page**, you'll see two modes:
   - **Gemini**: Regular AI assistant
   - **Jarvis**: Advanced AI agent with system capabilities

2. **Click the "Start Jarvis" button** to initialize the AI agent
   - The system will start the Python Jarvis process
   - You'll see a status indicator showing "Jarvis Online & Ready"

3. **Switch to Jarvis Mode** by clicking the "Jarvis" toggle button

### Features Available

#### Voice Commands
- **Hold the microphone button** to give voice commands
- Jarvis can understand and respond to voice input
- Automatic speech-to-text conversion

#### Text Chat
- Type messages in the chat input
- Jarvis will respond with advanced capabilities
- Real-time conversation history

#### System Operations
- **File Management**: Open, create, delete files and folders
- **Application Control**: Launch and close applications
- **Web Browsing**: Control web browsers and search
- **System Information**: Get weather, time, system status

#### Advanced Capabilities
- **Web Search**: Perform Google searches
- **Weather Information**: Get current weather data
- **System Control**: Control mouse, keyboard, volume
- **Window Management**: Manage application windows

### Example Commands

You can try these example commands with Jarvis:

- "Open notepad"
- "Search for artificial intelligence on Google"
- "What's the weather like today?"
- "Show me the current time"
- "Open my documents folder"
- "Close the browser"
- "Turn up the volume"

## Architecture

### Frontend (Angular)
- **JarvisService**: Manages communication with backend
- **AI Assistant Component**: Provides the user interface
- **WebSocket Connection**: Real-time communication
- **Voice Recognition**: Browser-based speech recognition

### Backend (Node.js)
- **Express Server**: REST API endpoints
- **WebSocket Server**: Real-time communication
- **Process Management**: Spawns and manages Python processes
- **Session Management**: Handles multiple user sessions

### Jarvis Agent (Python)
- **LiveKit Agents**: Real-time AI capabilities
- **OpenAI Integration**: GPT-4 powered responses
- **System Tools**: File, web, and system control tools
- **Voice Processing**: Speech recognition and synthesis

## Troubleshooting

### Common Issues

1. **Jarvis Won't Start**:
   - Check if Python dependencies are installed
   - Verify the path to `agent.py` is correct
   - Check console logs for error messages

2. **WebSocket Connection Failed**:
   - Ensure the backend server is running on port 8000
   - Check if port 8001 is available for WebSocket
   - Verify no firewall is blocking the connections

3. **Voice Recognition Not Working**:
   - Ensure microphone permissions are granted
   - Check if browser supports speech recognition
   - Verify audio input device is working

4. **Commands Not Executing**:
   - Check if Jarvis has necessary system permissions
   - Verify API keys are configured correctly
   - Review Python console output for errors

### Logs and Debugging

- **Frontend Logs**: Check browser console (F12)
- **Backend Logs**: Check terminal where `npm start` was run
- **Python Logs**: Check the Jarvis process output

## Security Considerations

- **System Access**: Jarvis has system-level permissions
- **API Keys**: Keep your API keys secure and private
- **Network**: Backend runs on localhost by default
- **Permissions**: Grant only necessary permissions

## Customization

You can customize Jarvis by:

1. **Modifying Tools**: Edit the tools in `agent.py`
2. **Adding Commands**: Extend the command recognition
3. **UI Customization**: Modify the Angular components
4. **Voice Settings**: Adjust voice recognition parameters

## Future Enhancements

Potential improvements include:

- **Multi-user Support**: Handle multiple concurrent users
- **Enhanced Security**: Add authentication and authorization
- **Mobile Support**: Optimize for mobile devices
- **Custom Commands**: User-defined command creation
- **Integration APIs**: Connect with more external services

## Support

For issues and questions:

1. Check the console logs for error messages
2. Verify all dependencies are installed correctly
3. Ensure all services are running properly
4. Review the troubleshooting section above

## License

This integration is part of your social media application and follows the same licensing terms.
