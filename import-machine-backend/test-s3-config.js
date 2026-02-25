const { Configuration } = require('./models');
const { getConfig, updateConfig } = require('./config/shared');

async function testS3Config() {
  try {
    console.log('Testing S3 configuration saving...');
    
    // Test user ID (assuming user 1 exists)
    const userId = 1;
    
    // Test configuration with S3 settings
    const testConfig = {
      archiveWebUI: 'https://test-archive.example.com',
      apiToken: 'test-api-token-123',
      customerGUID: 'test-guid-456',
      s3Settings: {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
      }
    };
    
    console.log('Saving test configuration...');
    console.log('Test config:', {
      ...testConfig,
      apiToken: '***' + testConfig.apiToken.slice(-4),
      s3Settings: {
        ...testConfig.s3Settings,
        secretAccessKey: '***' + testConfig.s3Settings.secretAccessKey.slice(-4)
      }
    });
    
    // Save the configuration
    const savedConfig = await updateConfig(userId, testConfig);
    
    console.log('Configuration saved successfully!');
    console.log('Saved config:', {
      ...savedConfig,
      apiToken: '***' + savedConfig.apiToken.slice(-4),
      s3Settings: {
        ...savedConfig.s3Settings,
        secretAccessKey: savedConfig.s3Settings?.secretAccessKey ? '***' + savedConfig.s3Settings.secretAccessKey.slice(-4) : 'not set'
      }
    });
    
    // Retrieve the configuration
    console.log('\nRetrieving configuration...');
    const retrievedConfig = await getConfig(userId);
    
    console.log('Retrieved config:', {
      ...retrievedConfig,
      apiToken: '***' + retrievedConfig.apiToken.slice(-4),
      s3Settings: {
        ...retrievedConfig.s3Settings,
        secretAccessKey: retrievedConfig.s3Settings?.secretAccessKey ? '***' + retrievedConfig.s3Settings.secretAccessKey.slice(-4) : 'not set'
      }
    });
    
    // Check if S3 settings were saved correctly
    const s3SettingsMatch = JSON.stringify(testConfig.s3Settings) === JSON.stringify(retrievedConfig.s3Settings);
    console.log('\nS3 Settings match:', s3SettingsMatch);
    
    if (!s3SettingsMatch) {
      console.log('Expected S3 settings:', testConfig.s3Settings);
      console.log('Actual S3 settings:', retrievedConfig.s3Settings);
    }
    
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testS3Config();
