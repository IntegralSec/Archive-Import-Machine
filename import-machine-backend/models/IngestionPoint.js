const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const IngestionPoint = sequelize.define('IngestionPoint', {
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
  ingestionPointId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'ingestion_point_id',
    comment: 'Original ID from the archive system'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  typeDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'type_details',
    comment: 'JSON string of type details'
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'ingestion_points',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'ingestion_point_id']
    },
    {
      fields: ['user_id', 'expires_at']
    },
    {
      fields: ['last_fetched']
    }
  ]
});

// Instance method to check if cache is expired
IngestionPoint.prototype.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Instance method to get parsed type details
IngestionPoint.prototype.getTypeDetails = function() {
  try {
    return this.typeDetails ? JSON.parse(this.typeDetails) : null;
  } catch (error) {
    console.error('Error parsing type details:', error);
    return null;
  }
};

// Instance method to get parsed raw data
IngestionPoint.prototype.getRawData = function() {
  try {
    return this.rawData ? JSON.parse(this.rawData) : null;
  } catch (error) {
    console.error('Error parsing raw data:', error);
    return null;
  }
};

module.exports = IngestionPoint;
