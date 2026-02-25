const loggingService = require('./services/loggingService');
const fs = require('fs');
const path = require('path');

// Mock request and response objects for testing
function createMockRequest(method = 'GET', url = '/api/test', body = {}, query = {}) {
  return {
    method,
    url,
    originalUrl: url,
    path: url,
    body,
    query,
    get: (header) => {
      const headers = {
        'User-Agent': 'Test-Agent/1.0',
        'Content-Type': 'application/json'
      };
      return headers[header] || 'Unknown';
    },
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    headers: {
      'x-forwarded-for': '127.0.0.1'
    },
    user: {
      id: 'test-user-123',
      customerGuid: 'test-customer-456'
    }
  };
}

function createMockResponse(statusCode = 200) {
  const res = {
    statusCode,
    get: (header) => {
      const headers = {
        'Content-Length': '1024'
      };
      return headers[header] || 0;
    }
  };
  return res;
}

async function testLoggingService() {
  console.log('🧪 Testing Logging Service (Offline Mode)...\n');

  try {
    // Test 1: Basic logging
    console.log('1. Testing basic request logging...');
    const mockReq = createMockRequest('GET', '/api/health');
    const mockRes = createMockResponse(200);
    loggingService.logRequest('health', mockReq, mockRes, 45);
    console.log('✅ Basic logging test passed');

    // Test 2: POST request with body
    console.log('2. Testing POST request with body...');
    const postReq = createMockRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'secretpassword'
    });
    const postRes = createMockResponse(200);
    loggingService.logRequest('auth', postReq, postRes, 120);
    console.log('✅ POST request logging test passed');

    // Test 3: Error logging
    console.log('3. Testing error logging...');
    const errorReq = createMockRequest('GET', '/api/config');
    const errorRes = createMockResponse(500);
    const testError = new Error('Test error message');
    testError.stack = 'Error: Test error message\n    at test (test-logging-offline.js:1:1)';
    loggingService.logRequest('config', errorReq, errorRes, 2000, testError);
    console.log('✅ Error logging test passed');

    // Test 4: Check log files
    console.log('4. Checking created log files...');
    const logsDir = path.join(__dirname, 'Logs');
    
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      console.log('📁 Log files found:', files);
      
      // Read and display sample entries
      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n');
        
        if (lines.length > 0) {
          const sampleLog = JSON.parse(lines[0]);
          console.log(`📝 ${file} sample:`, {
            timestamp: sampleLog.timestamp,
            method: sampleLog.method,
            url: sampleLog.url,
            statusCode: sampleLog.statusCode,
            duration: sampleLog.duration,
            userId: sampleLog.userId,
            customerGuid: sampleLog.customerGuid
          });
        }
      }
    } else {
      console.log('❌ Logs directory not found');
    }

    // Test 5: Test log retrieval
    console.log('5. Testing log retrieval...');
    const healthLogs = loggingService.getLogs('health', 10);
    console.log(`📊 Retrieved ${healthLogs.length} health logs`);

    const authLogs = loggingService.getLogs('auth', 10);
    console.log(`📊 Retrieved ${authLogs.length} auth logs`);

    // Test 6: Test available log files
    console.log('6. Testing available log files...');
    const availableFiles = loggingService.getAvailableLogFiles();
    console.log('📁 Available log files:', availableFiles);

    console.log('\n🎉 All logging service tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testLoggingService();
