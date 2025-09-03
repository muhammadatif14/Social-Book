"""
Jarvis Web Bridge - Connects the original LiveKit Jarvis agent to the web interface
"""

import sys
import os
import json
import asyncio
import threading
import signal
import subprocess
import time
from typing import Optional, Dict, Any
import websockets
import websockets.server
from dataclasses import dataclass

# Add the Jarvis directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

@dataclass
class WebMessage:
    type: str
    content: str
    session_id: str
    timestamp: str
    is_voice: bool = False

class JarvisWebBridge:
    def __init__(self):
        self.is_running = True
        self.websocket_clients = set()
        self.jarvis_process = None
        self.session_id = None
        
        # WebSocket server configuration
        self.websocket_host = "localhost"
        self.websocket_port = 8002  # Different port to avoid conflicts
        
        print(json.dumps({
            "type": "bridge_ready",
            "message": "Jarvis Web Bridge is initializing..."
        }))

    async def start_jarvis_agent(self):
        """Start the Jarvis console interface"""
        try:
            # Start the console interface instead of the original agent
            self.jarvis_process = subprocess.Popen(
                [sys.executable, "jarvis_console.py", "console"],
                cwd=os.path.dirname(os.path.abspath(__file__)),
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            print(json.dumps({
                "type": "jarvis_started",
                "message": "Jarvis Console Interface started successfully"
            }))
            
            # Start monitoring the Jarvis process output
            asyncio.create_task(self.monitor_jarvis_output())
            
            return True
            
        except Exception as e:
            print(json.dumps({
                "type": "error",
                "error": f"Failed to start Jarvis console: {str(e)}"
            }))
            return False

    async def monitor_jarvis_output(self):
        """Monitor Jarvis agent output and relay to web clients"""
        if not self.jarvis_process:
            return
            
        try:
            while self.jarvis_process.poll() is None:
                # Read output from Jarvis
                output = self.jarvis_process.stdout.readline()
                if output:
                    output = output.strip()
                    if output:
                        # Send output to all connected web clients
                        await self.broadcast_to_web_clients({
                            "type": "jarvis_response",
                            "content": output,
                            "session_id": self.session_id,
                            "is_voice": False
                        })
                
                await asyncio.sleep(0.1)
                
        except Exception as e:
            print(json.dumps({
                "type": "error",
                "error": f"Error monitoring Jarvis output: {str(e)}"
            }))

    async def send_to_jarvis(self, message: str):
        """Send message to the original Jarvis agent"""
        try:
            if self.jarvis_process and self.jarvis_process.stdin:
                # Send message to Jarvis agent stdin
                self.jarvis_process.stdin.write(f"{message}\n")
                self.jarvis_process.stdin.flush()
                
                print(json.dumps({
                    "type": "message_sent",
                    "message": f"Sent to Jarvis: {message}"
                }))
                
                return True
            else:
                raise Exception("Jarvis agent not running")
                
        except Exception as e:
            print(json.dumps({
                "type": "error",
                "error": f"Error sending message to Jarvis: {str(e)}"
            }))
            return False

    async def handle_web_message(self, websocket, message_data: Dict[str, Any]):
        """Handle incoming messages from web clients"""
        try:
            if message_data.get("type") == "message":
                content = message_data.get("content", "")
                session_id = message_data.get("session_id", "")
                
                if content:
                    # Store session ID
                    self.session_id = session_id
                    
                    # Send message to Jarvis agent
                    success = await self.send_to_jarvis(content)
                    
                    if not success:
                        await websocket.send(json.dumps({
                            "type": "error",
                            "error": "Failed to send message to Jarvis agent"
                        }))
                        
            elif message_data.get("type") == "start_jarvis":
                # Start the Jarvis agent
                success = await self.start_jarvis_agent()
                await websocket.send(json.dumps({
                    "type": "jarvis_start_response",
                    "success": success
                }))
                
            elif message_data.get("type") == "stop_jarvis":
                # Stop the Jarvis agent
                await self.stop_jarvis_agent()
                await websocket.send(json.dumps({
                    "type": "jarvis_stopped",
                    "message": "Jarvis agent stopped"
                }))
                
        except Exception as e:
            await websocket.send(json.dumps({
                "type": "error",
                "error": f"Error handling web message: {str(e)}"
            }))

    async def stop_jarvis_agent(self):
        """Stop the Jarvis agent process"""
        try:
            if self.jarvis_process:
                self.jarvis_process.terminate()
                self.jarvis_process.wait(timeout=5)
                self.jarvis_process = None
                
                print(json.dumps({
                    "type": "jarvis_stopped",
                    "message": "Jarvis agent stopped"
                }))
                
        except Exception as e:
            print(json.dumps({
                "type": "error",
                "error": f"Error stopping Jarvis agent: {str(e)}"
            }))

    async def broadcast_to_web_clients(self, message: Dict[str, Any]):
        """Broadcast message to all connected web clients"""
        if self.websocket_clients:
            message_json = json.dumps(message)
            disconnected_clients = []
            
            for client in self.websocket_clients:
                try:
                    await client.send(message_json)
                except websockets.exceptions.ConnectionClosed:
                    disconnected_clients.append(client)
                except Exception as e:
                    print(f"Error sending to client: {e}")
                    disconnected_clients.append(client)
            
            # Remove disconnected clients
            for client in disconnected_clients:
                self.websocket_clients.discard(client)

    async def websocket_handler(self, websocket, path):
        """Handle WebSocket connections from web clients"""
        self.websocket_clients.add(websocket)
        print(json.dumps({
            "type": "client_connected",
            "message": f"Web client connected. Total clients: {len(self.websocket_clients)}"
        }))
        
        try:
            async for message in websocket:
                try:
                    message_data = json.loads(message)
                    await self.handle_web_message(websocket, message_data)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "error": "Invalid JSON message"
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "error": f"Error processing message: {str(e)}"
                    }))
                    
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            self.websocket_clients.discard(websocket)
            print(json.dumps({
                "type": "client_disconnected",
                "message": f"Web client disconnected. Total clients: {len(self.websocket_clients)}"
            }))

    async def run_websocket_server(self):
        """Run the WebSocket server"""
        try:
            server = await websockets.server.serve(
                self.websocket_handler,
                self.websocket_host,
                self.websocket_port
            )
            
            print(json.dumps({
                "type": "websocket_server_started",
                "message": f"WebSocket server started on ws://{self.websocket_host}:{self.websocket_port}"
            }))
            
            await server.wait_closed()
            
        except Exception as e:
            print(json.dumps({
                "type": "error",
                "error": f"WebSocket server error: {str(e)}"
            }))

    async def run(self):
        """Run the bridge"""
        try:
            print(json.dumps({
                "type": "bridge_starting",
                "message": "Starting Jarvis Web Bridge..."
            }))
            
            # Start WebSocket server
            await self.run_websocket_server()
            
        except KeyboardInterrupt:
            print(json.dumps({
                "type": "bridge_stopping",
                "message": "Stopping Jarvis Web Bridge..."
            }))
        except Exception as e:
            print(json.dumps({
                "type": "error",
                "error": f"Bridge error: {str(e)}"
            }))
        finally:
            await self.cleanup()

    async def cleanup(self):
        """Cleanup resources"""
        try:
            # Stop Jarvis agent
            await self.stop_jarvis_agent()
            
            # Close all WebSocket connections
            if self.websocket_clients:
                for client in self.websocket_clients.copy():
                    await client.close()
                self.websocket_clients.clear()
                
            print(json.dumps({
                "type": "bridge_stopped",
                "message": "Jarvis Web Bridge stopped"
            }))
            
        except Exception as e:
            print(json.dumps({
                "type": "error",
                "error": f"Cleanup error: {str(e)}"
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
    
    # Create and run bridge
    bridge = JarvisWebBridge()
    await bridge.run()

if __name__ == "__main__":
    # Install websockets if not available
    try:
        import websockets
    except ImportError:
        print("Installing websockets...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "websockets"])
        import websockets
    
    # Run the bridge
    asyncio.run(main())
