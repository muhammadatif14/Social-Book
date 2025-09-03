const WebSocket = require('ws');
const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: node ws-test-client.js <sessionId>');
  process.exit(2);
}
const ws = new WebSocket('ws://localhost:8001');
ws.on('open', () => {
  console.log('WS open, sending test message');
  ws.send(JSON.stringify({ type: 'message', sessionId, content: 'Hello from test client' }));
});
ws.on('message', (msg) => {
  try { console.log('RECV:', JSON.parse(msg)); } catch (e) { console.log('RECV raw:', msg.toString()); }
});
ws.on('error', (e) => console.error('WS ERR', e));
setTimeout(() => { console.log('Closing test client'); ws.close(); process.exit(0); }, 20000);
