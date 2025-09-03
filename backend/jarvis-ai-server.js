const express = require('express');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');

const { randomUUID } = require('crypto');

const app = express();
const HTTP_PORT = 8000;
const WS_PORT = 8001;

// Middleware
app.use(cors());
app.use(express.json());

// Store active Jarvis processes and sessions
const activeSessions = new Map();
const wsClients = new Set();
const fs = require('fs');
const logFile = path.join(__dirname, 'jarvis-ai-server.log');

// WebSocket Server
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    wsClients.add(ws);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
        wsClients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        wsClients.delete(ws);
    });
});

function broadcastToClients(message) {
    const messageStr = JSON.stringify(message);
    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

function handleWebSocketMessage(ws, data) {
    if (data.type === 'message' && data.sessionId) {
        const session = activeSessions.get(data.sessionId);
        if (session && session.process) {
            // Send message to your Jarvis AI process
            const messageData = {
                type: 'message',
                content: data.content
            };
            session.process.stdin.write(JSON.stringify(messageData) + '\n');
        } else {
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Jarvis session not found or not running'
            }));
        }
    }
}

// API Routes
app.get('/api/jarvis/status', (req, res) => {
    const runningSessions = Array.from(activeSessions.values()).filter(s => s.process && !s.process.killed);
    res.json({
        running: runningSessions.length > 0,
        sessions: runningSessions.length
    });
});

app.post('/api/jarvis/start', async (req, res) => {
    // Allow caller to provide a sessionId or let server generate one
    const { sessionId: providedSessionId } = req.body || {};
    const sessionId = providedSessionId && typeof providedSessionId === 'string' ? providedSessionId : randomUUID();

    // Check if session already exists and is running
    if (activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId);
        if (session.process && !session.process.killed) {
            return res.status(409).json({
                success: false,
                error: 'Jarvis AI Agent already running',
                sessionId: sessionId
            });
        }
    }
    
    try {
        // Path to your Jarvis AI Python files
        const jarvisPath = path.join(__dirname, '..', 'Jarvis_Part_3', 'Jarvis_Part_3');
        const webAgentPath = path.join(jarvisPath, 'web_agent.py');
        
        console.log('Starting Jarvis AI Agent:', webAgentPath);
        
        // Start your Jarvis AI web agent process
        // Spawn Python in unbuffered mode so stdout/stderr are flushed immediately
        const jarvisProcess = spawn('python', ['-u', webAgentPath, 'web'], {
            cwd: jarvisPath,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Store session
        const session = {
            id: sessionId,
            process: jarvisProcess,
            startTime: new Date()
        };
        
        activeSessions.set(sessionId, session);
        
        // Handle process output from your AI
        jarvisProcess.stdout.on('data', (data) => {
            const output = data.toString();
            try { fs.appendFileSync(logFile, `[STDOUT ${sessionId}] ${output}\n`); } catch(e){}
            const trimmed = output.trim();
            const lines = trimmed ? trimmed.split('\n') : [];
            // Use the parsed lines below
            if (output) {
                console.log('Jarvis AI Output (raw):', output);
                try {
                    lines.forEach(line => {
                        if (line.trim()) {
                            try {
                                const parsed = JSON.parse(line.trim());
                                // Forward partials and final messages as-is with sessionId
                                if (parsed.type === 'jarvis_response_partial') {
                                    broadcastToClients({
                                        type: 'jarvis_response_partial',
                                        content: parsed.message,
                                        sessionId: sessionId
                                    });
                                } else {
                                    broadcastToClients({
                                        ...parsed,
                                        sessionId: sessionId
                                    });
                                }
                            } catch (e) {
                                // If not JSON, send as plain text
                                broadcastToClients({
                                    type: 'jarvis_response',
                                    content: line.trim(),
                                    sessionId: sessionId
                                });
                            }
                        }
                    });
                } catch (e) {
                    // Send as plain text response
                    broadcastToClients({
                        type: 'jarvis_response',
                        content: output.trim(),
                        sessionId: sessionId
                    });
                }
            }
        });
        
        jarvisProcess.stderr.on('data', (data) => {
            const errOutput = data.toString();
            try { fs.appendFileSync(logFile, `[STDERR ${sessionId}] ${errOutput}\n`); } catch(e){}
            console.error('Jarvis AI Error:', errOutput);
            broadcastToClients({
                type: 'jarvis_error',
                error: errOutput.trim(),
                sessionId: sessionId
            });
        });
        
        jarvisProcess.on('close', (code) => {
            console.log(`Jarvis AI process exited with code ${code}`);
            activeSessions.delete(sessionId);
            broadcastToClients({
                type: 'jarvis_stopped',
                sessionId: sessionId,
                code: code
            });
        });
        
        jarvisProcess.on('error', (error) => {
            console.error('Failed to start Jarvis AI process:', error);
            activeSessions.delete(sessionId);
            broadcastToClients({
                type: 'jarvis_error',
                error: error.message,
                sessionId: sessionId
            });
        });
        
        // Give the process a moment to start
        setTimeout(() => {
            if (jarvisProcess && !jarvisProcess.killed) {
                broadcastToClients({
                    type: 'jarvis_ready',
                    message: 'Your Jarvis AI Agent is ready for interaction!',
                    sessionId: sessionId
                });
            }
        }, 2000);
        
        res.json({
            success: true,
            message: 'Jarvis AI Agent started successfully',
            sessionId: sessionId,
            pid: jarvisProcess.pid
        });
        
    } catch (error) {
        console.error('Error starting Jarvis AI:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/jarvis/stop', (req, res) => {
    const { sessionId } = req.body;
    
    if (!sessionId) {
        return res.status(400).json({
            success: false,
            error: 'Session ID is required'
        });
    }
    
    const session = activeSessions.get(sessionId);
    if (!session || !session.process) {
        return res.status(404).json({
            success: false,
            error: 'Jarvis AI session not found'
        });
    }
    
    try {
        // Try to gracefully shutdown the agent
        try {
            session.process.stdin.write(JSON.stringify({ type: 'shutdown' }) + '\n');
            // also attempt to close stdin
            try { session.process.stdin.end(); } catch (e) {}
        } catch (e) {
            console.warn('Error sending shutdown to Jarvis process stdin:', e.message || e);
        }

        // Force kill after timeout (safe cross-platform)
        setTimeout(() => {
            try {
                if (session.process && !session.process.killed) {
                    // On Windows, SIGTERM is not supported; use .kill() default
                    session.process.kill();
                }
            } catch (e) {
                console.warn('Error killing process:', e.message || e);
            }
        }, 3000);

        activeSessions.delete(sessionId);

        broadcastToClients({ type: 'jarvis_stopped', sessionId: sessionId });

        res.json({ success: true, message: 'Jarvis AI stop initiated', sessionId: sessionId });
        
    } catch (error) {
        console.error('Error stopping Jarvis AI:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// List active sessions
app.get('/api/jarvis/sessions', (req, res) => {
    const sessions = Array.from(activeSessions.values()).map(s => ({
        id: s.id,
        pid: s.process ? s.process.pid : null,
        startTime: s.startTime,
        running: s.process ? !s.process.killed : false
    }));
    res.json({ success: true, sessions });
});

// Get specific session info
app.get('/api/jarvis/session/:id', (req, res) => {
    const id = req.params.id;
    const session = activeSessions.get(id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({
        success: true,
        session: {
            id: session.id,
            pid: session.process ? session.process.pid : null,
            startTime: session.startTime,
            running: session.process ? !session.process.killed : false
        }
    });
});

// Send raw JSON to the agent process stdin (useful for debugging)
app.post('/api/jarvis/sendRaw', (req, res) => {
    const { sessionId, payload } = req.body || {};
    if (!sessionId || !payload) return res.status(400).json({ success: false, error: 'sessionId and payload are required' });
    const session = activeSessions.get(sessionId);
    if (!session || !session.process) return res.status(404).json({ success: false, error: 'Session not found' });
    try {
        session.process.stdin.write(JSON.stringify(payload) + '\n');
        res.json({ success: true, message: 'Raw payload sent' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message || e });
    }
});

app.post('/api/jarvis/message', (req, res) => {
    const { sessionId, message, isVoice } = req.body;
    
    if (!sessionId || !message) {
        return res.status(400).json({
            success: false,
            error: 'Session ID and message are required'
        });
    }
    
    const session = activeSessions.get(sessionId);
    if (!session || !session.process) {
        return res.status(404).json({
            success: false,
            error: 'Jarvis AI session not found'
        });
    }
    
    try {
        // Send message to your Jarvis AI process
        const messageData = {
            type: 'message',
            content: message,
            isVoice: isVoice || false
        };
        
        session.process.stdin.write(JSON.stringify(messageData) + '\n');
        
        res.json({
            success: true,
            message: 'Message sent to Jarvis AI'
        });
        
    } catch (error) {
        console.error('Error sending message to Jarvis AI:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const activeSessions_array = Array.from(activeSessions.values());
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        activeProcesses: activeSessions_array.length,
        jarvisPath: path.join(__dirname, '..', 'Jarvis_Part_3', 'Jarvis_Part_3', 'web_agent.py')
    });
});

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('Shutting down Jarvis AI server...');
    
    // Kill all active Jarvis processes
    activeSessions.forEach((session) => {
        if (session.process && !session.process.killed) {
            session.process.kill('SIGTERM');
        }
    });
    
    process.exit(0);
});

// Start HTTP server
app.listen(HTTP_PORT, () => {
    console.log(`Jarvis AI Backend Server running on http://localhost:${HTTP_PORT}`);
    console.log(`WebSocket Server running on ws://localhost:${WS_PORT}`);
    console.log(`Your AI Agent Path: ${path.join(__dirname, '..', 'Jarvis_Part_3', 'Jarvis_Part_3', 'web_agent.py')}`);
    console.log('Ready to start your Jarvis AI model!');
});
