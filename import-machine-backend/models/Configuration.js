const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Configuration = sequelize.define('Configuration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  archiveWebUI: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  apiToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  customerGUID: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  s3Settings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      accessKeyId: '',
      secretAccessKey: ''
    }
  }
}, {
  tableName: 'configurations',
  timestamps: true
});

// Class method to get current configuration for a specific user
Configuration.getCurrent = async function(userId) {
  const config = await this.findOne({
    where: { userId },
    order: [['createdAt', 'DESC']]
  });
  
  if (!config) {
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
  
  return config.toJSON();
};

// Class method to update configuration for a specific user
Configuration.updateCurrent = async function(userId, newConfig) {
  const currentConfig = await this.findOne({
    where: { userId },
    order: [['createdAt', 'DESC']]
  });
  
  // Ensure all required fields have at least empty string values
  const configToSave = {
    archiveWebUI: newConfig.archiveWebUI || '',
    apiToken: newConfig.apiToken || '',
    customerGUID: newConfig.customerGUID || '',
    s3Settings: {
      accessKeyId: newConfig.s3Settings?.accessKeyId || '',
      secretAccessKey: newConfig.s3Settings?.secretAccessKey || ''
    }
  };
  
  if (currentConfig) {
    // Update existing configuration
    await currentConfig.update(configToSave);
    return currentConfig.toJSON();
  } else {
    // Create new configuration
    const config = await this.create({
      ...configToSave,
      userId
    });
    return config.toJSON();
  }
};

// Class method to reset configuration for a specific user
Configuration.reset = async function(userId) {
  await this.destroy({
    where: { userId }
  });
  
  return {
    archiveWebUI: '',
    apiToken: '',
    customerGUID: '',
    s3Settings: {
      accessKeyId: '',
      secretAccessKey: ''
    }
  };
};

// Instance method to get configuration without sensitive data
Configuration.prototype.toSafeJSON = function() {
  const config = this.toJSON();
  return {
    ...config,
    apiToken: config.apiToken ? '***' + config.apiToken.slice(-4) : '',
    s3Settings: {
      ...config.s3Settings,
      secretAccessKey: config.s3Settings?.secretAccessKey ? '***' + config.s3Settings.secretAccessKey.slice(-4) : ''
    }
  };
};

module.exports = Configuration;
