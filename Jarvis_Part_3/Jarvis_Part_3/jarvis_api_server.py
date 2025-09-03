"""
Jarvis API Server
A comprehensive FastAPI-based server that exposes your Jarvis agent as a REST API
with WebSocket support for real-time communication.
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import asyncio
import json
import logging
import uvicorn
from datetime import datetime
import os
import sys
import subprocess
import threading
import queue
import time
import uuid
import base64
import io

# Add current directory to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    # Import your Jarvis modules
    from Jarvis_prompts import behavior_prompts, Reply_prompts
    from Jarvis_google_search import google_search, get_current_datetime
    from jarvis_get_whether import get_weather
    from Jarvis_window_CTRL import open, close, folder_file, open_website, search_on_website, youtube_control, click_first_video, close_edge, open_edge
    from Jarvis_file_opner import Play_file
    from keyboard_mouse_CTRL import move_cursor_tool, mouse_click_tool, scroll_cursor_tool, type_text_tool, press_key_tool, swipe_gesture_tool, press_hotkey_tool, control_volume_tool
    
    JARVIS_MODULES_AVAILABLE = True
except ImportError as e:
    logging.error(f"Failed to import Jarvis modules: {e}")
    JARVIS_MODULES_AVAILABLE = False

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Jarvis AI API",
    description="Complete API for Jarvis AI Assistant with voice and text capabilities",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for frontend
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    is_voice_input: bool = False

class ChatResponse(BaseModel):
    message: str
    success: bool = True
    error: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    audio_url: Optional[str] = None
    timestamp: datetime = datetime.now()
    message_id: str = str(uuid.uuid4())

class JarvisStatus(BaseModel):
    is_running: bool
    modules_available: bool
    available_tools: List[str]
    uptime: Optional[str] = None

class VoiceMessage(BaseModel):
    audio_data: str  # base64 encoded audio
    session_id: Optional[str] = "default"

# Global variables
jarvis_running = False
jarvis_start_time = None
connected_websockets: List[WebSocket] = []
conversation_history: Dict[str, List[Dict]] = {}

class JarvisAgent:
    """Enhanced Jarvis agent class with full functionality"""
    
    def __init__(self):
        self.agent_process = None
        self.message_queue = queue.Queue()
        self.response_queue = queue.Queue()
        self.output_thread = None
        self.stop_thread = False
        
        # Available tools
        self.tools = {
            'google_search': google_search if JARVIS_MODULES_AVAILABLE else None,
            'get_current_datetime': get_current_datetime if JARVIS_MODULES_AVAILABLE else None,
            'get_weather': get_weather if JARVIS_MODULES_AVAILABLE else None,
            'open': open if JARVIS_MODULES_AVAILABLE else None,
            'close': close if JARVIS_MODULES_AVAILABLE else None,
            'folder_file': folder_file if JARVIS_MODULES_AVAILABLE else None,
            'open_website': open_website if JARVIS_MODULES_AVAILABLE else None,
            'search_on_website': search_on_website if JARVIS_MODULES_AVAILABLE else None,
            'youtube_control': youtube_control if JARVIS_MODULES_AVAILABLE else None,
            'click_first_video': click_first_video if JARVIS_MODULES_AVAILABLE else None,
            'close_edge': close_edge if JARVIS_MODULES_AVAILABLE else None,
            'open_edge': open_edge if JARVIS_MODULES_AVAILABLE else None,
            'Play_file': Play_file if JARVIS_MODULES_AVAILABLE else None,
            'move_cursor_tool': move_cursor_tool if JARVIS_MODULES_AVAILABLE else None,
            'mouse_click_tool': mouse_click_tool if JARVIS_MODULES_AVAILABLE else None,
            'scroll_cursor_tool': scroll_cursor_tool if JARVIS_MODULES_AVAILABLE else None,
            'type_text_tool': type_text_tool if JARVIS_MODULES_AVAILABLE else None,
            'press_key_tool': press_key_tool if JARVIS_MODULES_AVAILABLE else None,
            'swipe_gesture_tool': swipe_gesture_tool if JARVIS_MODULES_AVAILABLE else None,
            'press_hotkey_tool': press_hotkey_tool if JARVIS_MODULES_AVAILABLE else None,
            'control_volume_tool': control_volume_tool if JARVIS_MODULES_AVAILABLE else None
        }
        
        # Filter out None tools
        self.tools = {k: v for k, v in self.tools.items() if v is not None}
    
    async def start_agent(self):
        """Start the Jarvis agent process"""
        global jarvis_running, jarvis_start_time
        
        if self.agent_process and self.agent_process.poll() is None:
            logger.info("Agent is already running")
            return True
        
        try:
            # Start agent process
            self.agent_process = subprocess.Popen(
                ["python", "agent.py", "console"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                cwd=os.path.dirname(os.path.abspath(__file__))
            )
            
            # Start output processing thread
            self.stop_thread = False
            self.output_thread = threading.Thread(target=self._process_agent_output)
            self.output_thread.daemon = True
            self.output_thread.start()
            
            jarvis_running = True
            jarvis_start_time = datetime.now()
            logger.info("Jarvis agent started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error starting Jarvis agent: {e}")
            return False
    
    async def stop_agent(self):
        """Stop the Jarvis agent process"""
        global jarvis_running
        
        self.stop_thread = True
        
        if self.agent_process:
            try:
                self.agent_process.terminate()
                self.agent_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.agent_process.kill()
            except Exception as e:
                logger.error(f"Error stopping agent: {e}")
            
            self.agent_process = None
        
        jarvis_running = False
        logger.info("Jarvis agent stopped")
        return True
    
    async def process_message(self, message: str, session_id: str = "default") -> ChatResponse:
        """Process a message and return response"""
        try:
            if not jarvis_running:
                return ChatResponse(
                    message="Jarvis is not running. Please start Jarvis first.",
                    success=False,
                    error="Agent not running"
                )
            
            logger.info(f"Processing message from session {session_id}: {message}")
            
            # Store message in conversation history
            if session_id not in conversation_history:
                conversation_history[session_id] = []
            
            conversation_history[session_id].append({
                "type": "user",
                "message": message,
                "timestamp": datetime.now().isoformat()
            })
            
            # Process message through agent or fallback to direct tool usage
            if self.agent_process and self.agent_process.poll() is None:
                response_text = await self._send_to_agent(message)
            else:
                response_text = await self._process_with_tools(message)
            
            # Store response in conversation history
            conversation_history[session_id].append({
                "type": "jarvis",
                "message": response_text,
                "timestamp": datetime.now().isoformat()
            })
            
            response = ChatResponse(
                message=response_text,
                success=True,
                data={"session_id": session_id, "processed_at": datetime.now().isoformat()}
            )
            
            # Broadcast to WebSocket clients
            await self._broadcast_message({
                "type": "chat_response",
                "data": response.dict()
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return ChatResponse(
                message=f"I encountered an error: {str(e)}",
                success=False,
                error=str(e)
            )
    
    async def _send_to_agent(self, message: str) -> str:
        """Send message to the running agent process"""
        try:
            # Clear response queue
            while not self.response_queue.empty():
                self.response_queue.get_nowait()
            
            # Send message
            self.message_queue.put(message)
            self.agent_process.stdin.write(f"{message}\n")
            self.agent_process.stdin.flush()
            
            # Wait for response
            response = self.response_queue.get(timeout=15)
            return response
            
        except queue.Empty:
            return "I'm processing your request. Please wait a moment or try again."
        except Exception as e:
            logger.error(f"Error communicating with agent: {e}")
            return f"Error communicating with agent: {str(e)}"
    
    async def _process_with_tools(self, message: str) -> str:
        """Process message using available tools directly"""
        message_lower = message.lower()
        
        try:
            # Weather queries
            if any(word in message_lower for word in ['weather', 'temperature', 'forecast']):
                location = self._extract_location(message) or "current location"
                try:
                    weather_info = get_weather(location)
                    return f"Weather information for {location}: {weather_info}"
                except Exception as e:
                    return f"Sorry, I couldn't get weather information: {str(e)}"
            
            # Search queries
            elif any(word in message_lower for word in ['search', 'google', 'find', 'look up']):
                search_query = self._extract_search_query(message)
                if search_query:
                    try:
                        search_results = google_search(search_query)
                        return f"Search results for '{search_query}': {search_results}"
                    except Exception as e:
                        return f"Sorry, I couldn't perform the search: {str(e)}"
                else:
                    return "Please specify what you'd like me to search for."
            
            # Time/date queries
            elif any(word in message_lower for word in ['time', 'date', 'today', 'now']):
                try:
                    current_time = get_current_datetime()
                    return f"Current date and time: {current_time}"
                except Exception as e:
                    return f"Sorry, I couldn't get the current time: {str(e)}"
            
            # Application control
            elif message_lower.startswith('open '):
                app_name = message_lower.replace('open ', '').strip()
                if app_name:
                    try:
                        result = open(app_name)
                        return f"Opening {app_name}: {result}"
                    except Exception as e:
                        return f"Sorry, I couldn't open {app_name}: {str(e)}"
                else:
                    return "Please specify what application you'd like me to open."
            
            elif message_lower.startswith('close '):
                app_name = message_lower.replace('close ', '').strip()
                if app_name:
                    try:
                        result = close(app_name)
                        return f"Closing {app_name}: {result}"
                    except Exception as e:
                        return f"Sorry, I couldn't close {app_name}: {str(e)}"
                else:
                    return "Please specify what application you'd like me to close."
            
            # File operations
            elif message_lower.startswith('play '):
                file_name = message.replace('play ', '').replace('Play ', '').strip()
                if file_name:
                    try:
                        result = Play_file(file_name)
                        return f"Playing {file_name}: {result}"
                    except Exception as e:
                        return f"Sorry, I couldn't play {file_name}: {str(e)}"
                else:
                    return "Please specify what file you'd like me to play."
            
            # Web browsing
            elif any(word in message_lower for word in ['browse', 'visit', 'go to', 'navigate']):
                website = self._extract_website(message)
                if website:
                    try:
                        result = open_website(website)
                        return f"Opening website {website}: {result}"
                    except Exception as e:
                        return f"Sorry, I couldn't open {website}: {str(e)}"
                else:
                    return "Please specify which website you'd like me to open."
            
            # Volume control
            elif any(word in message_lower for word in ['volume', 'sound']):
                if 'up' in message_lower or 'increase' in message_lower:
                    try:
                        result = control_volume_tool("up")
                        return f"Volume increased: {result}"
                    except Exception as e:
                        return f"Sorry, I couldn't control volume: {str(e)}"
                elif 'down' in message_lower or 'decrease' in message_lower:
                    try:
                        result = control_volume_tool("down")
                        return f"Volume decreased: {result}"
                    except Exception as e:
                        return f"Sorry, I couldn't control volume: {str(e)}"
                elif 'mute' in message_lower:
                    try:
                        result = control_volume_tool("mute")
                        return f"Volume muted: {result}"
                    except Exception as e:
                        return f"Sorry, I couldn't mute volume: {str(e)}"
                else:
                    return "I can help you control volume. Say 'volume up', 'volume down', or 'mute'."
            
            # Default response
            else:
                return f"I received your message: '{message}'. I can help you with weather, search, time, opening applications, playing files, browsing websites, volume control, and much more. What would you like me to do?"
                
        except Exception as e:
            logger.error(f"Error in tool processing: {e}")
            return f"I encountered an error while processing your request: {str(e)}"
    
    def _process_agent_output(self):
        """Process output from agent in separate thread"""
        buffer = ""
        
        while not self.stop_thread and self.agent_process:
            try:
                if self.agent_process.poll() is not None:
                    break
                
                char = self.agent_process.stdout.read(1)
                if char:
                    buffer += char
                    if char == '\n':
                        line = buffer.strip()
                        buffer = ""
                        
                        if line and not self.message_queue.empty():
                            sent_message = self.message_queue.get()
                            if sent_message.lower() not in line.lower():
                                self.response_queue.put(line)
                else:
                    time.sleep(0.1)
                    
            except Exception as e:
                logger.error(f"Error reading agent output: {e}")
                time.sleep(0.5)
    
    async def _broadcast_message(self, message: dict):
        """Broadcast message to all connected WebSocket clients"""
        if connected_websockets:
            disconnected = []
            for websocket in connected_websockets:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to WebSocket: {e}")
                    disconnected.append(websocket)
            
            for ws in disconnected:
                connected_websockets.remove(ws)
    
    def _extract_location(self, message: str) -> Optional[str]:
        """Extract location from weather query"""
        words = message.lower().split()
        location_indicators = ['in', 'at', 'for']
        
        for i, word in enumerate(words):
            if word in location_indicators and i + 1 < len(words):
                return ' '.join(words[i + 1:])
        return None
    
    def _extract_search_query(self, message: str) -> Optional[str]:
        """Extract search query from message"""
        message_lower = message.lower()
        search_terms = ['search', 'google', 'find', 'look up']
        
        for term in search_terms:
            if term in message_lower:
                query = message_lower.split(term, 1)[-1].strip()
                if query.startswith('for '):
                    query = query[4:]
                return query if query else None
        return None
    
    def _extract_website(self, message: str) -> Optional[str]:
        """Extract website URL from message"""
        words = message.split()
        for word in words:
            if '.' in word and any(tld in word for tld in ['.com', '.org', '.net', '.edu', '.gov']):
                return word
            elif word.lower() in ['google', 'youtube', 'facebook', 'twitter', 'github']:
                return f"{word.lower()}.com"
        return None

# Initialize Jarvis agent
jarvis_agent = JarvisAgent()

# API Routes
@app.get("/")
async def root():
    """Root endpoint - serves the frontend if available"""
    frontend_path = os.path.join(os.path.dirname(__file__), "frontend", "index.html")
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path)
    else:
        return {
            "message": "Jarvis AI API is running!",
            "version": "2.0.0",
            "docs": "/docs",
            "status": "active"
        }

@app.get("/api/status", response_model=JarvisStatus)
async def get_status():
    """Get Jarvis status"""
    global jarvis_start_time
    
    uptime = None
    if jarvis_running and jarvis_start_time:
        uptime_delta = datetime.now() - jarvis_start_time
        uptime = str(uptime_delta).split('.')[0]  # Remove microseconds
    
    return JarvisStatus(
        is_running=jarvis_running,
        modules_available=JARVIS_MODULES_AVAILABLE,
        available_tools=list(jarvis_agent.tools.keys()),
        uptime=uptime
    )

@app.post("/api/start")
async def start_jarvis():
    """Start Jarvis"""
    success = await jarvis_agent.start_agent()
    
    if success:
        return {"message": "Jarvis started successfully", "status": "running"}
    else:
        raise HTTPException(status_code=503, detail="Failed to start Jarvis")

@app.post("/api/stop")
async def stop_jarvis():
    """Stop Jarvis"""
    success = await jarvis_agent.stop_agent()
    
    if success:
        return {"message": "Jarvis stopped successfully", "status": "stopped"}
    else:
        raise HTTPException(status_code=500, detail="Failed to stop Jarvis")

@app.post("/api/restart")
async def restart_jarvis():
    """Restart Jarvis"""
    await jarvis_agent.stop_agent()
    await asyncio.sleep(1)
    success = await jarvis_agent.start_agent()
    
    if success:
        return {"message": "Jarvis restarted successfully", "status": "running"}
    else:
        raise HTTPException(status_code=503, detail="Failed to restart Jarvis")

@app.post("/api/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """Send a message to Jarvis"""
    response = await jarvis_agent.process_message(message.message, message.session_id)
    return response

@app.post("/api/voice", response_model=ChatResponse)
async def chat_voice(voice_message: VoiceMessage):
    """Process voice message (placeholder for speech-to-text integration)"""
    # For now, return a placeholder response
    # You can integrate with speech-to-text services like Google Speech API, Azure Speech, etc.
    
    return ChatResponse(
        message="Voice message received. Speech-to-text processing would be implemented here.",
        success=True,
        data={"session_id": voice_message.session_id, "audio_length": len(voice_message.audio_data)}
    )

@app.get("/api/conversation/{session_id}")
async def get_conversation_history(session_id: str):
    """Get conversation history for a session"""
    history = conversation_history.get(session_id, [])
    return {"session_id": session_id, "messages": history}

@app.delete("/api/conversation/{session_id}")
async def clear_conversation_history(session_id: str):
    """Clear conversation history for a session"""
    if session_id in conversation_history:
        del conversation_history[session_id]
    return {"message": f"Conversation history cleared for session {session_id}"}

@app.get("/api/tools")
async def get_available_tools():
    """Get list of available tools"""
    return {
        "tools": list(jarvis_agent.tools.keys()),
        "total_count": len(jarvis_agent.tools),
        "modules_available": JARVIS_MODULES_AVAILABLE
    }

# WebSocket endpoint for real-time communication
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time communication"""
    await websocket.accept()
    connected_websockets.append(websocket)
    
    try:
        # Send initial status
        await websocket.send_json({
            "type": "connection",
            "data": {
                "message": "Connected to Jarvis API",
                "status": {
                    "is_running": jarvis_running,
                    "modules_available": JARVIS_MODULES_AVAILABLE
                }
            }
        })
        
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "chat":
                # Process chat message
                message = message_data.get("message", "")
                session_id = message_data.get("session_id", "default")
                
                response = await jarvis_agent.process_message(message, session_id)
                await websocket.send_json({
                    "type": "chat_response",
                    "data": response.dict()
                })
            
            elif message_data.get("type") == "status_request":
                # Send status update
                status = await get_status()
                await websocket.send_json({
                    "type": "status_update",
                    "data": status.dict()
                })
                
    except WebSocketDisconnect:
        connected_websockets.remove(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in connected_websockets:
            connected_websockets.remove(websocket)

if __name__ == "__main__":
    # Configuration
    HOST = "0.0.0.0"  # Allow connections from any IP
    PORT = 8000
    
    logger.info(f"Starting Jarvis API server on {HOST}:{PORT}")
    logger.info(f"Jarvis modules available: {JARVIS_MODULES_AVAILABLE}")
    logger.info(f"Available tools: {len(jarvis_agent.tools)}")
    
    # Start the server
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        log_level="info"
    )
