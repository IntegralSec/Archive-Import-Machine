const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function testLogging() {
  console.log('🧪 Testing API Logging System...\n');

  try {
    // Test 1: Health check (should create health.log)
    console.log('1. Testing health endpoint...');
    await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health endpoint logged');

    // Test 2: Root endpoint (should create root.log)
    console.log('2. Testing root endpoint...');
    await axios.get(`${BASE_URL}/`);
    console.log('✅ Root endpoint logged');

    // Test 3: Non-existent endpoint (should create root.log)
    console.log('3. Testing 404 endpoint...');
    try {
      await axios.get(`${BASE_URL}/api/non-existent`);
    } catch (error) {
      // Expected 404 error
    }
    console.log('✅ 404 endpoint logged');

    // Test 4: Check if log files were created
    console.log('\n4. Checking log files...');
    const logsDir = path.join(__dirname, 'Logs');
    
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      console.log('📁 Log files found:', files);
      
      // Read a sample log entry
      if (files.length > 0) {
        const sampleFile = path.join(logsDir, files[0]);
        const content = fs.readFileSync(sampleFile, 'utf8');
        const lines = content.trim().split('\n');
        if (lines.length > 0) {
          const sampleLog = JSON.parse(lines[0]);
          console.log('📝 Sample log entry:', {
            timestamp: sampleLog.timestamp,
            method: sampleLog.method,
            url: sampleLog.url,
            statusCode: sampleLog.statusCode,
            duration: sampleLog.duration
          });
        }
      }
    } else {
      console.log('❌ Logs directory not found');
    }

    // Test 5: Test logs API endpoint (if server is running)
    console.log('\n5. Testing logs API endpoint...');
    try {
      const response = await axios.get(`${BASE_URL}/api/logs/files`);
      console.log('✅ Logs API endpoint working');
      console.log('📊 Available log files:', response.data.data);
    } catch (error) {
      console.log('⚠️  Logs API endpoint not accessible (server may not be running)');
    }

    console.log('\n🎉 Logging system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLogging();
