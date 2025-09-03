const express = require('express');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 8000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Store running Jarvis processes
const jarvisProcesses = new Map();

// WebSocket server for real-time communication
const wss = new WebSocket.Server({ port: 8001 });

// Jarvis Web Bridge script path - Updated to use the new bridge
const JARVIS_BRIDGE_PATH = path.join(__dirname, '../Jarvis_Part_3/Jarvis_Part_3/jarvis_web_bridge.py');

class JarvisManager {
    constructor() {
        this.activeProcesses = new Map();
        this.websocketClients = new Set();
        this.bridgeWebSocket = null;
        this.bridgeProcess = null;
        this.isRunning = false;
        this.sessionId = null;
    }

    async startJarvis(sessionId, config = {}) {
        try {
            console.log(`Starting Jarvis Bridge for session: ${sessionId}`);
            
            // Check if already running
            if (this.isRunning) {
                return { success: false, error: 'Jarvis Bridge already running' };
            }

            // Check if bridge script exists
            if (!fs.existsSync(JARVIS_BRIDGE_PATH)) {
                throw new Error(`Bridge script not found: ${JARVIS_BRIDGE_PATH}`);
            }

            // Spawn the Python Jarvis Bridge process
            this.bridgeProcess = spawn('python', [JARVIS_BRIDGE_PATH], {
                cwd: path.dirname(JARVIS_BRIDGE_PATH),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Store the process
            this.activeProcesses.set(sessionId, {
                process: this.bridgeProcess,
                config: config,
                startTime: new Date()
            });

            this.isRunning = true;
            this.sessionId = sessionId;

            // Handle process output - Parse JSON responses from Bridge
            this.bridgeProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                console.log(`Bridge stdout [${sessionId}]:`, output);
                
                // Try to parse each line as JSON
                const lines = output.split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        try {
                            const jsonResponse = JSON.parse(line.trim());
                            console.log('Parsed Bridge response:', jsonResponse);
                            
                            // Broadcast all bridge messages to web clients
                            this.broadcastToWebSocket({
                                ...jsonResponse,
                                sessionId: sessionId
                            });
                            
                        } catch (e) {
                            // If not JSON, treat as regular output
                            this.broadcastToWebSocket({
                                type: 'bridge_output',
                                sessionId: sessionId,
                                content: line.trim()
                            });
                        }
                    }
                });
            });

            this.bridgeProcess.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`Bridge stderr [${sessionId}]:`, error);
                this.broadcastToWebSocket({
                    type: 'bridge_error',
                    sessionId: sessionId,
                    error: error
                });
            });

            this.bridgeProcess.on('close', (code) => {
                console.log(`Bridge process [${sessionId}] exited with code ${code}`);
                this.activeProcesses.delete(sessionId);
                this.isRunning = false;
                this.sessionId = null;
                this.bridgeProcess = null;
                
                if (this.bridgeWebSocket) {
                    this.bridgeWebSocket.close();
                    this.bridgeWebSocket = null;
                }
                
                this.broadcastToWebSocket({
                    type: 'bridge_stopped',
                    sessionId: sessionId,
                    exitCode: code
                });
            });

            this.bridgeProcess.on('error', (error) => {
                console.error(`Bridge process [${sessionId}] error:`, error);
                this.activeProcesses.delete(sessionId);
                this.isRunning = false;
                this.sessionId = null;
                this.bridgeProcess = null;
                
                this.broadcastToWebSocket({
                    type: 'bridge_error',
                    sessionId: sessionId,
                    error: error.message
                });
            });

            // Give it a moment to start, then connect to bridge WebSocket
            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.connectToBridge();

            return { success: true, sessionId: sessionId };

        } catch (error) {
            console.error('Error starting Jarvis Bridge:', error);
            this.isRunning = false;
            this.sessionId = null;
            return { success: false, error: error.message };
        }
    }

    async connectToBridge() {
        try {
            console.log('Connecting to Jarvis Web Bridge WebSocket...');
            
            this.bridgeWebSocket = new WebSocket('ws://localhost:8002');

            this.bridgeWebSocket.on('open', () => {
                console.log('Connected to Jarvis Web Bridge WebSocket');
                
                // Send start command to bridge
                this.bridgeWebSocket.send(JSON.stringify({
                    type: 'start_jarvis',
                    session_id: this.sessionId
                }));
            });

            this.bridgeWebSocket.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log('Bridge WebSocket message:', message);
                    
                    // Broadcast to web clients
                    this.broadcastToWebSocket({
                        ...message,
                        sessionId: this.sessionId
                    });
                } catch (e) {
                    console.error('Error parsing bridge WebSocket message:', e);
                }
            });

            this.bridgeWebSocket.on('close', () => {
                console.log('Disconnected from Jarvis Web Bridge WebSocket');
                this.bridgeWebSocket = null;
            });

            this.bridgeWebSocket.on('error', (error) => {
                console.error('Bridge WebSocket error:', error);
                this.bridgeWebSocket = null;
            });

        } catch (error) {
            console.error('Error connecting to bridge WebSocket:', error);
        }
    }

    async stopJarvis(sessionId) {
        try {
            const processInfo = this.activeProcesses.get(sessionId);
            if (!processInfo && !this.isRunning) {
                return { success: false, error: 'No Jarvis process found for this session' };
            }

            // Send stop command to bridge if connected
            if (this.bridgeWebSocket && this.bridgeWebSocket.readyState === WebSocket.OPEN) {
                this.bridgeWebSocket.send(JSON.stringify({
                    type: 'stop_jarvis',
                    session_id: sessionId
                }));
            }

            // Kill the bridge process
            if (this.bridgeProcess) {
                this.bridgeProcess.kill('SIGTERM');
            }
            
            // Remove from active processes
            this.activeProcesses.delete(sessionId);
            this.isRunning = false;
            this.sessionId = null;
            this.bridgeProcess = null;

            if (this.bridgeWebSocket) {
                this.bridgeWebSocket.close();
                this.bridgeWebSocket = null;
            }

            console.log(`Stopped Jarvis Bridge for session: ${sessionId}`);
            return { success: true };

        } catch (error) {
            console.error('Error stopping Jarvis Bridge:', error);
            return { success: false, error: error.message };
        }
    }

    sendMessageToJarvis(sessionId, message) {
        try {
            if (!this.isRunning || !this.bridgeWebSocket || this.bridgeWebSocket.readyState !== WebSocket.OPEN) {
                throw new Error('Jarvis Bridge not connected');
            }

            // Send message to bridge via WebSocket
            const messageData = {
                type: 'message',
                content: message,
                session_id: sessionId,
                timestamp: new Date().toISOString()
            };
            
            this.bridgeWebSocket.send(JSON.stringify(messageData));
            
            console.log(`Sent message to Jarvis Bridge [${sessionId}]:`, messageData);
            
            return { success: true };

        } catch (error) {
            console.error('Error sending message to Jarvis Bridge:', error);
            return { success: false, error: error.message };
        }
    }

    broadcastToWebSocket(message) {
        const messageStr = JSON.stringify(message);
        this.websocketClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }

    getActiveProcesses() {
        const processes = [];
        for (const [sessionId, processInfo] of this.activeProcesses) {
            processes.push({
                sessionId: sessionId,
                startTime: processInfo.startTime,
                config: processInfo.config,
                isRunning: this.isRunning
            });
        }
        return processes;
    }
}

const jarvisManager = new JarvisManager();

// REST API endpoints
app.post('/api/jarvis/start', async (req, res) => {
    try {
        const { sessionId, config } = req.body;
        const result = await jarvisManager.startJarvis(sessionId || generateSessionId(), config);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/jarvis/stop', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const result = await jarvisManager.stopJarvis(sessionId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/jarvis/message', async (req, res) => {
    try {
        const { sessionId, message, isVoice } = req.body;
        
        // Send message to Jarvis
        const result = jarvisManager.sendMessageToJarvis(sessionId, message);
        
        if (result.success) {
            // Message sent successfully, Jarvis will respond via stdout
            console.log(`Message queued for Jarvis [${sessionId}]: ${message}`);
            
            res.json({
                success: true,
                message: 'Message sent to Jarvis',
                sessionId: sessionId
            });
        } else {
            res.json(result);
        }
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/jarvis/status', (req, res) => {
    try {
        const processes = jarvisManager.getActiveProcesses();
        res.json({ success: true, processes: processes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// WebSocket handling
wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    jarvisManager.websocketClients.add(ws);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('WebSocket message received:', data);

            switch (data.type) {
                case 'message':
                    jarvisManager.sendMessageToJarvis(data.sessionId, data.content);
                    break;
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
                default:
                    console.log('Unknown WebSocket message type:', data.type);
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
        jarvisManager.websocketClients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        jarvisManager.websocketClients.delete(ws);
    });
});

// Utility functions
function generateSessionId() {
    return `jarvis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        activeProcesses: jarvisManager.getActiveProcesses().length
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    
    // Stop all Jarvis processes
    for (const [sessionId] of jarvisManager.activeProcesses) {
        jarvisManager.stopJarvis(sessionId);
    }
    
    // Close WebSocket server
    wss.close();
    
    process.exit(0);
});

app.listen(port, () => {
    console.log(`Jarvis Backend Server running on http://localhost:${port}`);
    console.log(`WebSocket Server running on ws://localhost:8001`);
    console.log(`Jarvis Bridge Path: ${JARVIS_BRIDGE_PATH}`);
});

module.exports = { app, jarvisManager };
