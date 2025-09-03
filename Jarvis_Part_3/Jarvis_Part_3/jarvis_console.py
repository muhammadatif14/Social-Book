"""
Enhanced Jarvis Console Interface - Provides console mode for the original LiveKit agent
"""

import sys
import os
import json
import asyncio
import threading
from typing import Optional, Dict, Any
import signal
import traceback
from datetime import datetime

# Add the Jarvis directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import openai
    from dotenv import load_dotenv
    load_dotenv()
    
    # Import the original functions and modules
    from jarvis_get_whether import get_weather
    from Jarvis_google_search import search_google
    from Jarvis_file_opner import open_file
    from Jarvis_window_CTRL import open_app, close_app
    from keyboard_mouse_CTRL import (
        move_cursor_tool,
        mouse_click_tool, 
        scroll_cursor_tool,
        type_text_tool,
        press_key_tool,
        press_hotkey_tool,
        control_volume_tool,
        swipe_gesture_tool
    )
    from Jarvis_prompts import Reply_prompts
    
except ImportError as e:
    print(json.dumps({
        "type": "error",
        "error": f"Import error: {str(e)}. Please install required dependencies."
    }))
    sys.exit(1)

class JarvisConsole:
    def __init__(self):
        self.running = False
        self.client = None
        self.conversation_history = []
        
        # Initialize OpenAI client
        try:
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError("OPENAI_API_KEY not found in environment")
                
            self.client = openai.OpenAI(api_key=api_key)
            
            print(json.dumps({
                "type": "jarvis_ready",
                "message": "Jarvis Console Interface initialized successfully!"
            }))
            
        except Exception as e:
            print(json.dumps({
                "type": "error",
                "error": f"Failed to initialize OpenAI client: {str(e)}"
            }))
            
    def get_available_tools(self):
        """Define the tools available to Jarvis"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "Get current weather information for a location",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "The city or location to get weather for"
                            }
                        },
                        "required": ["location"]
                    }
                }
            },
            {
                "type": "function", 
                "function": {
                    "name": "search_google",
                    "description": "Search Google for information",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query"
                            }
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "open_file",
                    "description": "Open a file on the system",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "file_path": {
                                "type": "string",
                                "description": "Path to the file to open"
                            }
                        },
                        "required": ["file_path"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "open_app",
                    "description": "Open an application",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "app_name": {
                                "type": "string",
                                "description": "Name of the application to open"
                            }
                        },
                        "required": ["app_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "type_text",
                    "description": "Type text on the keyboard",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "text": {
                                "type": "string",
                                "description": "Text to type"
                            }
                        },
                        "required": ["text"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "control_volume",
                    "description": "Control system volume",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "action": {
                                "type": "string",
                                "enum": ["up", "down", "mute", "unmute"],
                                "description": "Volume control action"
                            }
                        },
                        "required": ["action"]
                    }
                }
            }
        ]
    
    def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """Execute a tool function"""
        try:
            if tool_name == "get_weather":
                return get_weather(arguments.get("location", ""))
            elif tool_name == "search_google":
                return search_google(arguments.get("query", ""))
            elif tool_name == "open_file":
                return open_file(arguments.get("file_path", ""))
            elif tool_name == "open_app":
                return open_app(arguments.get("app_name", ""))
            elif tool_name == "type_text":
                return type_text_tool(arguments.get("text", ""))
            elif tool_name == "control_volume":
                return control_volume_tool(arguments.get("action", ""))
            else:
                return f"Unknown tool: {tool_name}"
                
        except Exception as e:
            return f"Error executing {tool_name}: {str(e)}"
    
    async def process_message(self, message: str) -> str:
        """Process a message using OpenAI with tool support"""
        try:
            # Add user message to conversation history
            self.conversation_history.append({
                "role": "user",
                "content": message
            })
            
            # Prepare system message with Jarvis personality
            system_message = {
                "role": "system",
                "content": Reply_prompts
            }
            
            # Create messages list with system message and conversation history
            messages = [system_message] + self.conversation_history[-10:]  # Keep last 10 messages
            
            # Make API call with tools
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                tools=self.get_available_tools(),
                tool_choice="auto",
                temperature=0.9
            )
            
            message_obj = response.choices[0].message
            
            # Handle tool calls
            if message_obj.tool_calls:
                # Add assistant message with tool calls to history
                self.conversation_history.append({
                    "role": "assistant",
                    "content": message_obj.content,
                    "tool_calls": [tc.model_dump() for tc in message_obj.tool_calls]
                })
                
                # Execute tools and add results
                for tool_call in message_obj.tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    print(json.dumps({
                        "type": "tool_execution",
                        "tool": function_name,
                        "arguments": function_args
                    }))
                    
                    # Execute the tool
                    tool_result = self.execute_tool(function_name, function_args)
                    
                    # Add tool result to conversation
                    self.conversation_history.append({
                        "role": "tool",
                        "content": str(tool_result),
                        "tool_call_id": tool_call.id
                    })
                
                # Get final response after tool execution
                final_response = self.client.chat.completions.create(
                    model="gpt-4",
                    messages=[system_message] + self.conversation_history[-15:],
                    temperature=0.9
                )
                
                final_message = final_response.choices[0].message.content
            else:
                final_message = message_obj.content
            
            # Add assistant response to history
            self.conversation_history.append({
                "role": "assistant",
                "content": final_message
            })
            
            return final_message
            
        except Exception as e:
            error_msg = f"Error processing message: {str(e)}"
            print(json.dumps({
                "type": "error",
                "error": error_msg,
                "traceback": traceback.format_exc()
            }))
            return error_msg
    
    async def run_console_mode(self):
        """Run in console mode for web integration"""
        self.running = True
        
        print(json.dumps({
            "type": "jarvis_started",
            "message": "Jarvis Console Mode started. Send messages via stdin."
        }))
        
        try:
            while self.running:
                try:
                    # Read input from stdin (non-blocking)
                    line = sys.stdin.readline()
                    if not line:
                        await asyncio.sleep(0.1)
                        continue
                        
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Handle special commands
                    if line.lower() in ['quit', 'exit', 'stop']:
                        break
                    
                    # Process the message
                    response = await self.process_message(line)
                    
                    # Output response as JSON
                    print(json.dumps({
                        "type": "jarvis_response",
                        "content": response,
                        "original_message": line,
                        "timestamp": datetime.now().isoformat()
                    }))
                    
                except KeyboardInterrupt:
                    break
                except Exception as e:
                    print(json.dumps({
                        "type": "error", 
                        "error": f"Console error: {str(e)}"
                    }))
                    
        finally:
            self.running = False
            print(json.dumps({
                "type": "jarvis_stopped",
                "message": "Jarvis Console Mode stopped"
            }))

def signal_handler(sig, frame):
    """Handle shutdown signals"""
    print(json.dumps({
        "type": "signal_received",
        "message": "Shutdown signal received"
    }))
    sys.exit(0)

async def main():
    """Main function"""
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Check command line arguments
    if len(sys.argv) > 1 and sys.argv[1] == "console":
        # Create and run console
        console = JarvisConsole()
        await console.run_console_mode()
    else:
        print(json.dumps({
            "type": "error",
            "error": "Usage: python jarvis_console.py console"
        }))

if __name__ == "__main__":
    asyncio.run(main())
