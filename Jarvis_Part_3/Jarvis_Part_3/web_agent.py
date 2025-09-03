import sys
import os
import json
import asyncio
import threading
from io import StringIO
import signal

# Add the Jarvis directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# For OpenAI
import openai
from dotenv import load_dotenv

load_dotenv()

class JarvisWebAgent:
    def __init__(self):
        self.is_running = True
        try:
            self.openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        except Exception as e:
            print(json.dumps({
                "type": "jarvis_error",
                "error": f"OpenAI initialization failed: {str(e)}"
            }))
            return
            
        self.conversation_history = []
        
        # Output function to send responses back to the web
        self.send_response = print
        
        print(json.dumps({
            "type": "jarvis_ready",
            "message": "Jarvis AI Agent is now online and ready to assist you!"
        }))

    def process_message(self, message):
        """Process incoming message and generate response"""
        try:
            # Add user message to conversation
            self.conversation_history.append({
                "role": "user",
                "content": message
            })
            
            # Create system message
            system_message = {
                "role": "system",
                "content": """You are Jarvis, an advanced AI assistant with the ability to control computer systems, search the web, manage files, and perform various automated tasks. 
                You have access to powerful tools including:
                - System control (opening apps, controlling windows)
                - Web browsing and search capabilities
                - File management operations
                - Weather information
                - Voice recognition and synthesis
                - Mouse and keyboard automation
                
                Respond helpfully and naturally. When users ask for system operations, acknowledge that you can perform them with your integrated tools."""
            }
            
            # Prepare messages for OpenAI (keep last 10 messages for context)
            messages = [system_message] + self.conversation_history[-10:]
            
            # Call OpenAI API with streaming to provide partial results in real-time
            ai_response = ""
            try:
                # Use streaming if available in the client to send partials
                stream_iter = self.openai_client.chat.completions.create(
                    model="gpt-4",
                    messages=messages,
                    max_tokens=500,
                    temperature=0.9,
                    stream=True
                )

                for chunk in stream_iter:
                    try:
                        # Different SDK versions expose content under different keys
                        delta = None
                        if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                            choice = chunk.choices[0]
                            # choice may be a dict-like or object
                            if isinstance(choice, dict):
                                delta = choice.get('delta') or choice.get('message') or {}
                            else:
                                delta = getattr(choice, 'delta', None) or getattr(choice, 'message', None)

                        content_piece = None
                        if isinstance(delta, dict):
                            content_piece = delta.get('content')
                        elif delta is not None:
                            # attempt to access .content
                            content_piece = getattr(delta, 'content', None)

                        if content_piece:
                            ai_response += content_piece
                            # Emit partial to stdout so the Node bridge can forward it
                            self.send_response(json.dumps({
                                "type": "jarvis_response_partial",
                                "message": content_piece
                            }))
                    except Exception:
                        # ignore per-chunk errors and continue
                        continue

                # After streaming completes, ai_response contains the full text
                # Add AI response to conversation
                self.conversation_history.append({
                    "role": "assistant",
                    "content": ai_response
                })

            except Exception as e:
                # Fallback to non-streaming call if streaming fails
                try:
                    response = self.openai_client.chat.completions.create(
                        model="gpt-4",
                        messages=messages,
                        max_tokens=500,
                        temperature=0.9
                    )
                    ai_response = response.choices[0].message.content
                    self.conversation_history.append({
                        "role": "assistant",
                        "content": ai_response
                    })
                except Exception as e2:
                    raise e
            
            # Check if we need to use any tools based on the message
            tool_response = self.check_and_execute_tools(message)
            if tool_response:
                ai_response += f"\n\n{tool_response}"
            
            # Send the final (complete) response back
            self.send_response(json.dumps({
                "type": "jarvis_response",
                "message": ai_response,
                "original_message": message
            }))
            
        except Exception as e:
            error_msg = f"Error processing message: {str(e)}"
            self.send_response(json.dumps({
                "type": "jarvis_error",
                "error": error_msg
            }))

    def check_and_execute_tools(self, message):
        """Check if message requires tool execution"""
        message_lower = message.lower()
        
        try:
            # Import tools only when needed to avoid import errors
            if any(word in message_lower for word in ['search', 'google', 'find online']):
                try:
                    from Jarvis_google_search import google_search
                    search_query = message.replace('search', '').replace('google', '').strip()
                    if search_query:
                        result = google_search(search_query)
                        return f"Search results: {result}"
                except Exception as e:
                    return f"Search tool error: {str(e)}"
            
            # Weather
            elif any(word in message_lower for word in ['weather', 'temperature', 'climate']):
                try:
                    from jarvis_get_whether import get_weather
                    result = get_weather("current location")
                    return f"Weather information: {result}"
                except Exception as e:
                    return f"Weather tool error: {str(e)}"
            
            # Time/Date
            elif any(word in message_lower for word in ['time', 'date', 'today', 'now']):
                try:
                    import datetime
                    now = datetime.datetime.now()
                    result = now.strftime("%A, %B %d, %Y at %I:%M %p")
                    return f"Current date and time: {result}"
                except Exception as e:
                    return f"DateTime tool error: {str(e)}"
            
            # Application control
            elif any(word in message_lower for word in ['open app', 'open application', 'launch']):
                try:
                    from Jarvis_window_CTRL import open
                    app_name = message_lower.replace('open', '').replace('app', '').replace('application', '').replace('launch', '').strip()
                    if app_name:
                        result = open(app_name)
                        return f"Attempted to open {app_name}: {result}"
                except Exception as e:
                    return f"App control tool error: {str(e)}"
            
            # Volume control
            elif any(word in message_lower for word in ['volume', 'sound', 'audio']):
                try:
                    from keyboard_mouse_CTRL import control_volume_tool
                    if 'up' in message_lower or 'increase' in message_lower:
                        result = control_volume_tool("increase")
                        return f"Volume increased: {result}"
                    elif 'down' in message_lower or 'decrease' in message_lower:
                        result = control_volume_tool("decrease")
                        return f"Volume decreased: {result}"
                    elif 'mute' in message_lower:
                        result = control_volume_tool("mute")
                        return f"Volume muted: {result}"
                except Exception as e:
                    return f"Volume control tool error: {str(e)}"
            
        except Exception as e:
            return f"Tool execution error: {str(e)}"
        
        return None

    def run(self):
        """Main loop to handle incoming messages"""
        try:
            while self.is_running:
                # Read input from stdin
                line = sys.stdin.readline()
                if not line:
                    break
                
                try:
                    # Debug: log raw input
                    self.send_response(json.dumps({"type": "debug_input_received", "raw": line.strip()}))

                    # Parse JSON input
                    data = json.loads(line.strip())
                    # Debug: log parsed input
                    self.send_response(json.dumps({"type": "debug_parsed", "data": data}))
                    if data.get('type') == 'message':
                        message = data.get('content', '')
                        # Debug: acknowledge message processing
                        self.send_response(json.dumps({"type": "debug_processing", "message": message}))
                        if message:
                            self.process_message(message)
                    elif data.get('type') == 'shutdown':
                        self.is_running = False
                        break
                except json.JSONDecodeError:
                    # If not JSON, treat as plain text message
                    message = line.strip()
                    if message and message != 'exit':
                        self.process_message(message)
                    elif message == 'exit':
                        self.is_running = False
                        break
                        
        except KeyboardInterrupt:
            self.is_running = False
        except Exception as e:
            self.send_response(json.dumps({
                "type": "jarvis_error",
                "error": f"Main loop error: {str(e)}"
            }))

    def shutdown(self):
        """Graceful shutdown"""
        self.is_running = False
        self.send_response(json.dumps({
            "type": "jarvis_shutdown",
            "message": "Jarvis AI Agent is shutting down."
        }))

def signal_handler(sig, frame):
    """Handle shutdown signals"""
    if 'agent' in globals():
        agent.shutdown()
    sys.exit(0)

if __name__ == "__main__":
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create and run agent
    agent = JarvisWebAgent()
    
    if len(sys.argv) > 1 and sys.argv[1] == 'web':
        # Web mode - JSON I/O
        agent.run()
    else:
        # Interactive mode
        print("Jarvis Web Agent - Interactive Mode")
        print("Type 'exit' to quit")
        try:
            while True:
                user_input = input("You: ")
                if user_input.lower() == 'exit':
                    break
                agent.process_message(user_input)
        except KeyboardInterrupt:
            print("\nShutting down...")
        finally:
            agent.shutdown()
