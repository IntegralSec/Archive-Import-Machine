#!/usr/bin/env node

// Start the server with minimal console logging
process.env.VERBOSE_LOGGING = 'false';
// Database logging is now completely disabled regardless of NODE_ENV

console.log('🚀 Starting Import Machine Backend with minimal logging...');

// Start the server
require('../server.js');
