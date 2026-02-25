const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ImportJob = sequelize.define('ImportJob', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  importJobId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'import_job_id',
    comment: 'Original ID from the archive system'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ingestionPointId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'ingestion_point_id',
    comment: 'Associated ingestion point ID'
  },
  progress: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Import progress percentage (0-100)'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_time'
  },
  rawData: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'raw_data',
    comment: 'Complete JSON response from archive system'
  },
  lastFetched: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'last_fetched',
    defaultValue: DataTypes.NOW
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
    comment: 'When this cache entry expires'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    field: 'is_active',
    defaultValue: true
  }
}, {
  tableName: 'import_jobs',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'import_job_id']
    },
    {
      fields: ['user_id', 'expires_at']
    },
    {
      fields: ['user_id', 'status']
    },
    {
      fields: ['last_fetched']
    }
  ]
});

// Instance method to check if cache is expired
ImportJob.prototype.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Instance method to get parsed raw data
ImportJob.prototype.getRawData = function() {
  try {
    return this.rawData ? JSON.parse(this.rawData) : null;
  } catch (error) {
    console.error('Error parsing raw data:', error);
    return null;
  }
};

module.exports = ImportJob;

