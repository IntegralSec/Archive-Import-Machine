#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');

// Get the local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
const PORT = process.env.PORT || 5000;

console.log(`🌐 Starting Import Machine Backend on ${localIP}:${PORT}`);

// Set environment variables for network access
process.env.NODE_ENV = 'development';

// Start the server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: { ...process.env }
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

server.on('close', (code) => {
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});
