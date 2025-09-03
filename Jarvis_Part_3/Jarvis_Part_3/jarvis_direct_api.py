"""
Simplified Jarvis Python API Server using Flask
This directly exposes your Jarvis agent functionality via a REST API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
import sys
import json
import threading
from datetime import datetime

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
    
    # Try importing the main agent if it's needed
    try:
        import agent
        AGENT_AVAILABLE = True
    except ImportError:
        AGENT_AVAILABLE = False
    
    JARVIS_MODULES_AVAILABLE = True
except ImportError as e:
    logging.error(f"Failed to import Jarvis modules: {e}")
    JARVIS_MODULES_AVAILABLE = False
    AGENT_AVAILABLE = False

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # In production, specify exact origins

# Global variables
jarvis_running = False
active_sessions = {}

class JarvisAgent:
    """Main Jarvis agent class that processes commands"""
    
    def __init__(self):
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
    
    def process_message(self, message: str, session_id: str = "default"):
        """Process a message and return response"""
        try:
            if not JARVIS_MODULES_AVAILABLE:
                return {
                    "message": "Jarvis modules are not available. Please check your installation.",
                    "success": False,
                    "error": "Modules not available"
                }
            
            logger.info(f"Processing message from session {session_id}: {message}")
            
            # Analyze the message and determine appropriate response
            response_text = self._analyze_and_respond(message)
            
            return {
                "message": response_text,
                "success": True,
                "data": {"session_id": session_id, "processed_at": datetime.now().isoformat()},
                "isFromJarvis": True  # Flag to identify Jarvis responses (similar to .NET model)
            }
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return {
                "message": f"I encountered an error: {str(e)}",
                "success": False,
                "error": str(e),
                "isFromJarvis": True
            }
    
    def _analyze_and_respond(self, message: str) -> str:
        """Analyze message and generate appropriate response"""
        message_lower = message.lower()
        
        try:
            # If agent.py is available, try to use it directly (this would be the full functionality)
            if AGENT_AVAILABLE and hasattr(agent, 'process_message'):
                try:
                    return agent.process_message(message)
                except Exception as e:
                    logger.error(f"Error using agent.py: {e}")
                    # Fall back to simplified processing
            
            # Weather queries
            if any(word in message_lower for word in ['weather', 'temperature', 'forecast']):
                location = self._extract_location(message) or "current location"
                weather_info = get_weather(location)
                return f"Weather information for {location}: {weather_info}"
            
            # Search queries
            elif any(word in message_lower for word in ['search', 'google', 'find', 'look up']):
                search_query = self._extract_search_query(message)
                if search_query:
                    search_results = google_search(search_query)
                    return f"Search results for '{search_query}': {search_results}"
                else:
                    return "Please specify what you'd like me to search for."
            
            # Time/date queries
            elif any(word in message_lower for word in ['time', 'date', 'today', 'now']):
                current_time = get_current_datetime()
                return f"Current date and time: {current_time}"
            
            # Open applications
            elif message_lower.startswith('open '):
                app_name = message_lower.replace('open ', '').strip()
                if app_name:
                    result = open(app_name)
                    return f"Opening {app_name}: {result}"
                else:
                    return "Please specify what application you'd like me to open."
            
            # Close applications
            elif message_lower.startswith('close '):
                app_name = message_lower.replace('close ', '').strip()
                if app_name:
                    result = close(app_name)
                    return f"Closing {app_name}: {result}"
                else:
                    return "Please specify what application you'd like me to close."
            
            # Play files
            elif message_lower.startswith('play '):
                file_name = message.replace('play ', '').replace('Play ', '').strip()
                if file_name:
                    result = Play_file(file_name)
                    return f"Playing {file_name}: {result}"
                else:
                    return "Please specify what file you'd like me to play."
            
            # Web browsing
            elif any(word in message_lower for word in ['browse', 'visit', 'go to', 'navigate']):
                website = self._extract_website(message)
                if website:
                    result = open_website(website)
                    return f"Opening website {website}: {result}"
                else:
                    return "Please specify which website you'd like me to open."
            
            # YouTube control
            elif 'youtube' in message_lower:
                if 'play' in message_lower or 'start' in message_lower:
                    result = youtube_control("play")
                    return f"YouTube control: {result}"
                elif 'pause' in message_lower or 'stop' in message_lower:
                    result = youtube_control("pause")
                    return f"YouTube control: {result}"
                else:
                    return "YouTube is ready. You can ask me to play, pause, or control YouTube videos."
            
            # Volume control
            elif any(word in message_lower for word in ['volume', 'sound']):
                if 'up' in message_lower or 'increase' in message_lower:
                    result = control_volume_tool("up")
                    return f"Volume control: {result}"
                elif 'down' in message_lower or 'decrease' in message_lower:
                    result = control_volume_tool("down")
                    return f"Volume control: {result}"
                elif 'mute' in message_lower:
                    result = control_volume_tool("mute")
                    return f"Volume control: {result}"
                else:
                    return "I can help you control volume. Say 'volume up', 'volume down', or 'mute'."
            
            # Default response for general queries
            else:
                return f"I received your message: '{message}'. I can help you with weather, search, time, opening applications, playing files, browsing websites, YouTube control, volume control, and much more. What would you like me to do?"
                
        except Exception as e:
            logger.error(f"Error in _analyze_and_respond: {e}")
            return f"I encountered an error while processing your request: {str(e)}"
    
    def _extract_location(self, message: str):
        """Extract location from weather query"""
        words = message.lower().split()
        location_indicators = ['in', 'at', 'for']
        
        for i, word in enumerate(words):
            if word in location_indicators and i + 1 < len(words):
                return ' '.join(words[i + 1:])
        return None
    
    def _extract_search_query(self, message: str):
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
    
    def _extract_website(self, message: str):
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

@app.route('/')
def index():
    """Root endpoint with API information"""
    return jsonify({
        "message": "Jarvis AI API is running!",
        "version": "1.0.0",
        "status": "active"
    })

@app.route('/api/status')
def get_status():
    """Get Jarvis status"""
    return jsonify({
        "is_running": jarvis_running,
        "modules_available": JARVIS_MODULES_AVAILABLE,
        "agent_available": AGENT_AVAILABLE,
        "available_tools": list(jarvis_agent.tools.keys())
    })

@app.route('/api/start', methods=['POST'])
def start_jarvis():
    """Start Jarvis"""
    global jarvis_running
    
    if not JARVIS_MODULES_AVAILABLE:
        return jsonify({
            "message": "Jarvis modules are not available",
            "success": False,
            "error": "Modules not available"
        }), 503
    
    jarvis_running = True
    return jsonify({
        "message": "Jarvis started successfully", 
        "status": "running"
    })

@app.route('/api/stop', methods=['POST'])
def stop_jarvis():
    """Stop Jarvis"""
    global jarvis_running
    jarvis_running = False
    return jsonify({
        "message": "Jarvis stopped successfully", 
        "status": "stopped"
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Send a message to Jarvis"""
    if not jarvis_running:
        return jsonify({
            "message": "Jarvis is not running. Please start Jarvis first.",
            "success": False,
            "error": "Jarvis not running"
        }), 503
    
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({
            "message": "Invalid request. 'message' field is required.",
            "success": False,
            "error": "Invalid request"
        }), 400
    
    message = data['message']
    session_id = data.get('session_id', 'default')
    is_voice_input = data.get('is_voice_input', False)
    
    response = jarvis_agent.process_message(message, session_id)
    return jsonify(response)

@app.route('/api/tools')
def get_available_tools():
    """Get list of available tools"""
    return jsonify({
        "tools": list(jarvis_agent.tools.keys()),
        "total_count": len(jarvis_agent.tools),
        "modules_available": JARVIS_MODULES_AVAILABLE
    })

# Audio processing endpoint could be added here if you want to handle voice input/output

if __name__ == "__main__":
    # Configuration
    HOST = "localhost"
    PORT = 8080
    
    logger.info(f"Starting Jarvis API server on {HOST}:{PORT}")
    logger.info(f"Jarvis modules available: {JARVIS_MODULES_AVAILABLE}")
    logger.info(f"Available tools: {len(jarvis_agent.tools)}")
    
    # Auto-start Jarvis
    jarvis_running = True
    
    # Start the server
    app.run(host=HOST, port=PORT, debug=True)
