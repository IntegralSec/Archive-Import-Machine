const { Configuration } = require('./models');
const { updateConfig, getConfig } = require('./config/shared');

async function testConfigSave() {
  try {
    console.log('Testing configuration save functionality...');
    
    // Test data
    const testUserId = 1; // Assuming admin user has ID 1
    const testConfig = {
      archiveWebUI: 'https://test-archive.example.com',
      apiToken: 'PWSAK2testToken123=',
      customerGUID: 'test-guid-123',
      s3Settings: {
        accessKeyId: 'AKIATEST123',
        secretAccessKey: 'testSecretKey123'
      }
    };
    
    console.log('Saving test configuration...');
    const savedConfig = await updateConfig(testUserId, testConfig);
    console.log('Configuration saved successfully:', {
      archiveWebUI: savedConfig.archiveWebUI,
      apiToken: savedConfig.apiToken ? '***' + savedConfig.apiToken.slice(-4) : 'not set',
      customerGUID: savedConfig.customerGUID,
      s3Settings: savedConfig.s3Settings
    });
    
    console.log('Retrieving saved configuration...');
    const retrievedConfig = await getConfig(testUserId);
    console.log('Configuration retrieved successfully:', {
      archiveWebUI: retrievedConfig.archiveWebUI,
      apiToken: retrievedConfig.apiToken ? '***' + retrievedConfig.apiToken.slice(-4) : 'not set',
      customerGUID: retrievedConfig.customerGUID,
      s3Settings: retrievedConfig.s3Settings
    });
    
    // Verify the data matches
    const archiveWebUIMatch = savedConfig.archiveWebUI === retrievedConfig.archiveWebUI;
    const apiTokenMatch = savedConfig.apiToken === retrievedConfig.apiToken;
    const customerGUIDMatch = savedConfig.customerGUID === retrievedConfig.customerGUID;
    const s3SettingsMatch = JSON.stringify(savedConfig.s3Settings) === JSON.stringify(retrievedConfig.s3Settings);
    
    console.log('Verification results:');
    console.log('- Archive Web UI match:', archiveWebUIMatch);
    console.log('- API Token match:', apiTokenMatch);
    console.log('- Customer GUID match:', customerGUIDMatch);
    console.log('- S3 Settings match:', s3SettingsMatch);
    
    if (archiveWebUIMatch && apiTokenMatch && customerGUIDMatch && s3SettingsMatch) {
      console.log('✅ All tests passed! Configuration save/retrieve is working correctly.');
    } else {
      console.log('❌ Some tests failed. Configuration save/retrieve has issues.');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
testConfigSave();
