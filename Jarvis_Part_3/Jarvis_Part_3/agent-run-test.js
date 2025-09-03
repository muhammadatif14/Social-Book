const { spawn } = require('child_process');
const path = require('path');
const jarvisPath = path.resolve(__dirname);
const webAgent = path.join(jarvisPath, 'web_agent.py');

console.log('Starting web_agent.py in web mode...');
const p = spawn('python', ['-u', webAgent, 'web'], { cwd: jarvisPath });

p.stdout.on('data', (data) => {
  process.stdout.write('[AGENT STDOUT] ' + data.toString());
});

p.stderr.on('data', (data) => {
  process.stderr.write('[AGENT STDERR] ' + data.toString());
});

p.on('close', (code) => {
  console.log('Agent exited with', code);
  process.exit(0);
});

// Send a message after a short delay to allow agent to initialize
setTimeout(() => {
  const msg = JSON.stringify({ type: 'message', content: 'Hello agent, please stream a short reply.' }) + '\n';
  console.log('Sending message to agent stdin...');
  p.stdin.write(msg);
}, 2000);

// Close after 25s
setTimeout(() => {
  try { p.stdin.write(JSON.stringify({ type: 'shutdown' }) + '\n'); } catch (e) {}
  // give a moment
  setTimeout(() => p.kill(), 1000);
}, 25000);
