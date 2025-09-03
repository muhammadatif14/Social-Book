"""
Jarvis Direct Bridge API
This API acts as a bridge between a web frontend and the actual Jarvis agent.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
import sys
import json
import subprocess
import threading
import queue
import time
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables
jarvis_process = None
message_queue = queue.Queue()
response_queue = queue.Queue()
jarvis_running = False

class JarvisBridge:
    """Bridge between API and Jarvis agent"""
    
    def __init__(self):
        self.jarvis_process = None
        self.output_thread = None
        self.stop_thread = False
    
    def start_jarvis(self):
        """Start the Jarvis agent process"""
        global jarvis_running
        
        if self.jarvis_process and self.jarvis_process.poll() is None:
            logger.info("Jarvis is already running")
            return True
        
        try:
            # Start Jarvis agent in console mode
            self.jarvis_process = subprocess.Popen(
                ["python", "agent.py", "console"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,  # Line buffered
                cwd=os.path.dirname(os.path.abspath(__file__))
            )
            
            # Start thread to read output
            self.stop_thread = False
            self.output_thread = threading.Thread(target=self._process_output)
            self.output_thread.daemon = True
            self.output_thread.start()
            
            logger.info("Jarvis process started")
            jarvis_running = True
            return True
            
        except Exception as e:
            logger.error(f"Error starting Jarvis: {e}")
            return False
    
    def stop_jarvis(self):
        """Stop the Jarvis agent process"""
        global jarvis_running
        
        if self.jarvis_process:
            try:
                # Signal thread to stop
                self.stop_thread = True
                
                # Send exit command to Jarvis if possible
                try:
                    self.jarvis_process.stdin.write("exit\n")
                    self.jarvis_process.stdin.flush()
                except:
                    pass
                
                # Wait a moment for graceful exit
                time.sleep(1)
                
                # Terminate process if still running
                if self.jarvis_process.poll() is None:
                    self.jarvis_process.terminate()
                    time.sleep(0.5)
                    
                    # Force kill if still running
                    if self.jarvis_process.poll() is None:
                        self.jarvis_process.kill()
                
                self.jarvis_process = None
                jarvis_running = False
                logger.info("Jarvis process stopped")
                return True
                
            except Exception as e:
                logger.error(f"Error stopping Jarvis: {e}")
                return False
        
        return True  # Already stopped
    
    def send_message(self, message):
        """Send a message to the Jarvis agent"""
        if not self.jarvis_process or self.jarvis_process.poll() is not None:
            logger.error("Jarvis is not running")
            return {
                "message": "Jarvis is not running. Please start Jarvis first.",
                "success": False,
                "error": "Jarvis not running"
            }
        
        try:
            # Clear the response queue before sending new message
            while not response_queue.empty():
                response_queue.get_nowait()
            
            # Send message to Jarvis
            message_queue.put(message)
            self.jarvis_process.stdin.write(f"{message}\n")
            self.jarvis_process.stdin.flush()
            
            # Wait for response with timeout
            try:
                response = response_queue.get(timeout=10)
                return {
                    "message": response,
                    "success": True,
                    "isFromJarvis": True
                }
            except queue.Empty:
                return {
                    "message": "Jarvis did not respond in time. It may be processing your request.",
                    "success": False,
                    "error": "Timeout waiting for response",
                    "isFromJarvis": True
                }
                
        except Exception as e:
            logger.error(f"Error sending message to Jarvis: {e}")
            return {
                "message": f"Error communicating with Jarvis: {str(e)}",
                "success": False,
                "error": str(e),
                "isFromJarvis": True
            }
    
    def _process_output(self):
        """Process output from Jarvis in a separate thread"""
        buffer = ""
        
        while not self.stop_thread:
            # Check if process is still running
            if self.jarvis_process.poll() is not None:
                logger.info("Jarvis process has ended")
                break
            
            # Read a character from stdout
            try:
                char = self.jarvis_process.stdout.read(1)
                if char:
                    buffer += char
                    
                    # Process complete lines
                    if char == '\n':
                        line = buffer.strip()
                        buffer = ""
                        
                        # Log the output
                        logger.info(f"Jarvis output: {line}")
                        
                        # Check if this is a response to our message
                        if not message_queue.empty():
                            sent_message = message_queue.get()
                            
                            # This is a simplistic way to identify responses
                            # You might want to improve this logic based on your Jarvis's output format
                            if sent_message.lower() not in line.lower():  # If the line is not echo of our input
                                response_queue.put(line)
                else:
                    # No more output, wait a bit
                    time.sleep(0.1)
                    
            except Exception as e:
                logger.error(f"Error reading Jarvis output: {e}")
                time.sleep(0.5)  # Avoid tight loop on error

# Initialize JarvisBridge
jarvis_bridge = JarvisBridge()

@app.route('/')
def index():
    """Root endpoint with API information"""
    return jsonify({
        "message": "Jarvis Direct Bridge API is running!",
        "version": "1.0.0",
        "status": "active"
    })

@app.route('/api/status')
def get_status():
    """Get Jarvis status"""
    global jarvis_running
    return jsonify({
        "is_running": jarvis_running,
        "process_active": jarvis_bridge.jarvis_process is not None and jarvis_bridge.jarvis_process.poll() is None
    })

@app.route('/api/start', methods=['POST'])
def start_jarvis():
    """Start Jarvis"""
    success = jarvis_bridge.start_jarvis()
    
    if success:
        return jsonify({
            "message": "Jarvis started successfully", 
            "status": "running"
        })
    else:
        return jsonify({
            "message": "Failed to start Jarvis",
            "status": "error"
        }), 500

@app.route('/api/stop', methods=['POST'])
def stop_jarvis():
    """Stop Jarvis"""
    success = jarvis_bridge.stop_jarvis()
    
    if success:
        return jsonify({
            "message": "Jarvis stopped successfully", 
            "status": "stopped"
        })
    else:
        return jsonify({
            "message": "Failed to stop Jarvis",
            "status": "error"
        }), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    """Send a message to Jarvis"""
    global jarvis_running
    
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
    
    # Send message to Jarvis and get response
    response = jarvis_bridge.send_message(message)
    return jsonify(response)

@app.route('/api/restart', methods=['POST'])
def restart_jarvis():
    """Restart Jarvis"""
    jarvis_bridge.stop_jarvis()
    time.sleep(1)  # Give it a moment to fully stop
    success = jarvis_bridge.start_jarvis()
    
    if success:
        return jsonify({
            "message": "Jarvis restarted successfully", 
            "status": "running"
        })
    else:
        return jsonify({
            "message": "Failed to restart Jarvis",
            "status": "error"
        }), 500

if __name__ == "__main__":
    # Configuration
    HOST = "localhost"
    PORT = 8080
    
    logger.info(f"Starting Jarvis Bridge API server on {HOST}:{PORT}")
    
    # Auto-start Jarvis
    jarvis_bridge.start_jarvis()
    
    # Start the server
    app.run(host=HOST, port=PORT, debug=True, use_reloader=False)  # Disable reloader to avoid duplicate processes
