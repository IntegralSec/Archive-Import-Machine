#!/usr/bin/env node

/**
 * Test script to verify user configuration isolation
 * This script tests that users can only access their own configuration
 */

const { User } = require('./models');
const { Configuration } = require('./models');
const { getConfig, updateConfig, resetConfig } = require('./config/shared');
const { createUser, generateToken } = require('./middleware/auth');

async function testUserIsolation() {
  console.log('🧪 Testing User Configuration Isolation...\n');

  try {
    // Clean up any existing test users
    await User.destroy({ where: { username: { $like: 'testuser%' } } });
    await Configuration.destroy({ where: { userId: { $in: [999, 998, 997] } } });

    // Create test users
    console.log('📝 Creating test users...');
    const user1 = await createUser('testuser1', 'test1@example.com', 'password123');
    const user2 = await createUser('testuser2', 'test2@example.com', 'password123');
    const user3 = await createUser('testuser3', 'test3@example.com', 'password123');

    console.log(`✅ Created users: ${user1.username} (ID: ${user1.id}), ${user2.username} (ID: ${user2.id}), ${user3.username} (ID: ${user3.id})\n`);

    // Test 1: Set different configurations for each user
    console.log('🔧 Setting different configurations for each user...');
    
    const config1 = {
      archiveWebUI: 'http://archive1.example.com',
      apiToken: 'token1-secret-key',
      s3Settings: { accessKeyId: 'key1', secretAccessKey: 'secret1' }
    };
    
    const config2 = {
      archiveWebUI: 'http://archive2.example.com',
      apiToken: 'token2-secret-key',
      s3Settings: { accessKeyId: 'key2', secretAccessKey: 'secret2' }
    };
    
    const config3 = {
      archiveWebUI: 'http://archive3.example.com',
      apiToken: 'token3-secret-key',
      s3Settings: { accessKeyId: 'key3', secretAccessKey: 'secret3' }
    };

    await updateConfig(user1.id, config1);
    await updateConfig(user2.id, config2);
    await updateConfig(user3.id, config3);

    console.log('✅ Set configurations for all users\n');

    // Test 2: Verify each user can only see their own configuration
    console.log('🔍 Testing configuration isolation...');
    
    const retrievedConfig1 = await getConfig(user1.id);
    const retrievedConfig2 = await getConfig(user2.id);
    const retrievedConfig3 = await getConfig(user3.id);

    console.log(`User ${user1.username} config:`, {
      archiveWebUI: retrievedConfig1.archiveWebUI,
      apiToken: retrievedConfig1.apiToken ? `${retrievedConfig1.apiToken.substring(0, 10)}...` : 'none',
      s3AccessKey: retrievedConfig1.s3Settings?.accessKeyId
    });

    console.log(`User ${user2.username} config:`, {
      archiveWebUI: retrievedConfig2.archiveWebUI,
      apiToken: retrievedConfig2.apiToken ? `${retrievedConfig2.apiToken.substring(0, 10)}...` : 'none',
      s3AccessKey: retrievedConfig2.s3Settings?.accessKeyId
    });

    console.log(`User ${user3.username} config:`, {
      archiveWebUI: retrievedConfig3.archiveWebUI,
      apiToken: retrievedConfig3.apiToken ? `${retrievedConfig3.apiToken.substring(0, 10)}...` : 'none',
      s3AccessKey: retrievedConfig3.s3Settings?.accessKeyId
    });

    // Verify configurations are different
    const configsAreDifferent = 
      retrievedConfig1.archiveWebUI !== retrievedConfig2.archiveWebUI &&
      retrievedConfig1.archiveWebUI !== retrievedConfig3.archiveWebUI &&
      retrievedConfig2.archiveWebUI !== retrievedConfig3.archiveWebUI &&
      retrievedConfig1.apiToken !== retrievedConfig2.apiToken &&
      retrievedConfig1.apiToken !== retrievedConfig3.apiToken &&
      retrievedConfig2.apiToken !== retrievedConfig3.apiToken;

    if (configsAreDifferent) {
      console.log('✅ PASS: Each user has their own unique configuration\n');
    } else {
      console.log('❌ FAIL: Configurations are not properly isolated\n');
      return false;
    }

    // Test 3: Verify that updating one user's config doesn't affect others
    console.log('🔄 Testing configuration update isolation...');
    
    const newConfig1 = {
      archiveWebUI: 'http://updated-archive1.example.com',
      apiToken: 'updated-token1-secret-key',
      s3Settings: { accessKeyId: 'updated-key1', secretAccessKey: 'updated-secret1' }
    };

    await updateConfig(user1.id, newConfig1);

    const updatedConfig1 = await getConfig(user1.id);
    const unchangedConfig2 = await getConfig(user2.id);
    const unchangedConfig3 = await getConfig(user3.id);

    // Verify user1's config was updated
    if (updatedConfig1.archiveWebUI === newConfig1.archiveWebUI) {
      console.log('✅ User 1 configuration was updated successfully');
    } else {
      console.log('❌ User 1 configuration was not updated properly');
      return false;
    }

    // Verify other users' configs were not affected
    if (unchangedConfig2.archiveWebUI === config2.archiveWebUI && 
        unchangedConfig3.archiveWebUI === config3.archiveWebUI) {
      console.log('✅ Other users\' configurations were not affected\n');
    } else {
      console.log('❌ Other users\' configurations were affected by the update\n');
      return false;
    }

    // Test 4: Test configuration reset isolation
    console.log('🔄 Testing configuration reset isolation...');
    
    await resetConfig(user2.id);

    const resetConfig2 = await getConfig(user2.id);
    const stillConfig1 = await getConfig(user1.id);
    const stillConfig3 = await getConfig(user3.id);

    // Verify user2's config was reset
    if (!resetConfig2.archiveWebUI && !resetConfig2.apiToken) {
      console.log('✅ User 2 configuration was reset successfully');
    } else {
      console.log('❌ User 2 configuration was not reset properly');
      return false;
    }

    // Verify other users' configs were not affected
    if (stillConfig1.archiveWebUI === newConfig1.archiveWebUI && 
        stillConfig3.archiveWebUI === config3.archiveWebUI) {
      console.log('✅ Other users\' configurations were not affected by reset\n');
    } else {
      console.log('❌ Other users\' configurations were affected by the reset\n');
      return false;
    }

    // Test 5: Test new user starts with empty configuration
    console.log('🆕 Testing new user configuration...');
    
    const newUser = await createUser('testuser4', 'test4@example.com', 'password123');
    const newUserConfig = await getConfig(newUser.id);

    if (!newUserConfig.archiveWebUI && !newUserConfig.apiToken) {
      console.log('✅ New user starts with empty configuration\n');
    } else {
      console.log('❌ New user does not start with empty configuration\n');
      return false;
    }

    // Clean up
    console.log('🧹 Cleaning up test data...');
    await User.destroy({ where: { username: { $like: 'testuser%' } } });
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 ALL TESTS PASSED! User configuration isolation is working correctly.');
    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testUserIsolation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testUserIsolation };
