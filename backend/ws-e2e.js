const WebSocket = require('ws');
const fetch = global.fetch || require('node-fetch');
const sessionId = process.argv[2];
if (!sessionId) { console.error('Usage: node ws-e2e.js <sessionId>'); process.exit(2); }
const ws = new WebSocket('ws://localhost:8001');

ws.on('open', async () => {
  console.log('WS open');
  try {
    // Send an HTTP message to the server which forwards to the agent
    const resp = await fetch('http://localhost:8000/api/jarvis/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: 'Hello, can you stream a reply?' })
    });
    const json = await resp.json();
    console.log('HTTP send result:', json);
  } catch (e) {
    console.error('HTTP send error', e);
  }
});

ws.on('message', (msg) => {
  try { console.log('WS RECV:', JSON.parse(msg)); } catch (e) { console.log('WS RAW:', msg.toString()); }
});

ws.on('close', () => console.log('WS closed'));
ws.on('error', (e) => console.error('WS ERR', e));

setTimeout(() => { console.log('E2E test complete, closing'); ws.close(); process.exit(0); }, 30000);
