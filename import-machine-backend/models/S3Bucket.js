const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const S3Bucket = sequelize.define('S3Bucket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 63], // AWS S3 bucket name constraints
      is: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/ // AWS S3 bucket naming rules
    }
  },
  region: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'us-east-1',
    validate: {
      notEmpty: true,
      isIn: [
        'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
        'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-southeast-2',
        'ap-northeast-1', 'sa-east-1'
      ]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('creating', 'active', 'deleting', 'deleted', 'error'),
    allowNull: false,
    defaultValue: 'creating'
  },
  size: {
    type: DataTypes.BIGINT, // Store size in bytes
    allowNull: false,
    defaultValue: 0
  },
  objectCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 's3_buckets',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['name']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    }
  ]
});

// Instance methods
S3Bucket.prototype.formatSize = function() {
  const bytes = this.size;
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

S3Bucket.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  values.formattedSize = this.formatSize();
  return values;
};

// Class methods
S3Bucket.findByUser = function(userId) {
  return this.findAll({
    where: { user_id: userId },
    order: [['createdAt', 'DESC']]
  });
};

S3Bucket.findByUserAndName = function(userId, name) {
  return this.findOne({
    where: { user_id: userId, name }
  });
};

S3Bucket.createForUser = function(userId, bucketData) {
  return this.create({
    ...bucketData,
    user_id: userId
  });
};

module.exports = S3Bucket;
