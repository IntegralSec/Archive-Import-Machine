const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Batch = sequelize.define('Batch', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    source_system: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 255]
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    created_by: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 255]
      }
    },
    manifest_sha256: {
      type: DataTypes.BLOB,
      allowNull: true
    },
    status: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 4,
        isIn: {
          args: [[0, 1, 2, 3, 4]],
          msg: 'Status must be 0 (PENDING), 1 (RUNNING), 2 (COMPLETED), 3 (FAILED), or 4 (CANCELLED)'
        }
      }
    },
    file_count_expected: {
      type: DataTypes.BIGINT,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    file_count_discovered: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    file_count_ingested: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'batches',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['source_system']
      },
      {
        fields: ['created_by']
      }
    ]
  });

  // Define status constants
  Batch.STATUS = {
    PENDING: 0,
    RUNNING: 1,
    COMPLETED: 2,
    FAILED: 3,
    CANCELLED: 4
  };

  // Helper method to get status name
  Batch.prototype.getStatusName = function() {
    const statusNames = {
      [Batch.STATUS.PENDING]: 'PENDING',
      [Batch.STATUS.RUNNING]: 'RUNNING',
      [Batch.STATUS.COMPLETED]: 'COMPLETED',
      [Batch.STATUS.FAILED]: 'FAILED',
      [Batch.STATUS.CANCELLED]: 'CANCELLED'
    };
    return statusNames[this.status] || 'UNKNOWN';
  };

  // Helper method to check if batch is in progress
  Batch.prototype.isInProgress = function() {
    return this.status === Batch.STATUS.PENDING || this.status === Batch.STATUS.RUNNING;
  };

  // Helper method to check if batch is completed
  Batch.prototype.isCompleted = function() {
    return this.status === Batch.STATUS.COMPLETED;
  };

  // Helper method to check if batch failed
  Batch.prototype.isFailed = function() {
    return this.status === Batch.STATUS.FAILED;
  };

  // Helper method to check if batch is cancelled
  Batch.prototype.isCancelled = function() {
    return this.status === Batch.STATUS.CANCELLED;
  };

  // Helper method to get completion percentage
  Batch.prototype.getCompletionPercentage = function() {
    if (!this.file_count_expected || this.file_count_expected === 0) {
      return 0;
    }
    return Math.round((this.file_count_ingested / this.file_count_expected) * 100);
  };

  return Batch;
};
