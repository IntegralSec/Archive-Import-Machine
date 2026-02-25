// Shared configuration storage for the backend
// This ensures all routes use the same configuration data from the database

const { Configuration } = require('../models');

// Function to get current configuration for a specific user
const getConfig = async (userId) => {
  try {
    const config = await Configuration.getCurrent(userId);
    return config;
  } catch (error) {
    console.error('Error getting configuration:', error);
    return {
      archiveWebUI: '',
      apiToken: '',
      customerGUID: '',
      s3Settings: {
        accessKeyId: '',
        secretAccessKey: ''
      }
    };
  }
};

// Function to update configuration for a specific user
const updateConfig = async (userId, newConfig) => {
  try {
    if (!userId) {
      throw new Error('User ID is required for configuration update');
    }
    
    const updatedConfig = await Configuration.updateCurrent(userId, newConfig);
    return updatedConfig;
  } catch (error) {
    console.error('Error updating configuration:', error);
    throw error;
  }
};

// Function to reset configuration to defaults for a specific user
const resetConfig = async (userId) => {
  try {
    await Configuration.reset(userId);
  } catch (error) {
    console.error('Error resetting configuration:', error);
    throw error;
  }
};

// Function to check if configuration is complete for a specific user
const isConfigComplete = async (userId) => {
  try {
    const config = await getConfig(userId);
    return !!(config.archiveWebUI && config.apiToken);
  } catch (error) {
    console.error('Error checking configuration completeness:', error);
    return false;
  }
};

module.exports = {
  getConfig,
  updateConfig,
  resetConfig,
  isConfigComplete
};
