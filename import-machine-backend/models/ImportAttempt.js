const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ImportAttempt = sequelize.define('ImportAttempt', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    import_id: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        isUUID: 4
      }
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
        isAfterStartDate(value) {
          if (value && this.started_at && new Date(value) <= new Date(this.started_at)) {
            throw new Error('Ended at must be after started at');
          }
        }
      }
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
    error_summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 10000] // Limit error summary to 10KB
      }
    }
  }, {
    tableName: 'import_attempts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['import_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['started_at']
      },
      {
        fields: ['ended_at']
      }
    ]
  });

  // Define status constants
  ImportAttempt.STATUS = {
    PENDING: 0,
    RUNNING: 1,
    COMPLETED: 2,
    FAILED: 3,
    CANCELLED: 4
  };

  // Helper method to get status name
  ImportAttempt.prototype.getStatusName = function() {
    const statusNames = {
      [ImportAttempt.STATUS.PENDING]: 'PENDING',
      [ImportAttempt.STATUS.RUNNING]: 'RUNNING',
      [ImportAttempt.STATUS.COMPLETED]: 'COMPLETED',
      [ImportAttempt.STATUS.FAILED]: 'FAILED',
      [ImportAttempt.STATUS.CANCELLED]: 'CANCELLED'
    };
    return statusNames[this.status] || 'UNKNOWN';
  };

  // Helper method to check if attempt is in progress
  ImportAttempt.prototype.isInProgress = function() {
    return this.status === ImportAttempt.STATUS.PENDING || this.status === ImportAttempt.STATUS.RUNNING;
  };

  // Helper method to check if attempt is completed
  ImportAttempt.prototype.isCompleted = function() {
    return this.status === ImportAttempt.STATUS.COMPLETED;
  };

  // Helper method to check if attempt failed
  ImportAttempt.prototype.isFailed = function() {
    return this.status === ImportAttempt.STATUS.FAILED;
  };

  // Helper method to check if attempt is cancelled
  ImportAttempt.prototype.isCancelled = function() {
    return this.status === ImportAttempt.STATUS.CANCELLED;
  };

  // Helper method to get duration in milliseconds
  ImportAttempt.prototype.getDuration = function() {
    if (!this.ended_at || !this.started_at) {
      return null;
    }
    return new Date(this.ended_at) - new Date(this.started_at);
  };

  // Helper method to get duration in human readable format
  ImportAttempt.prototype.getDurationFormatted = function() {
    const duration = this.getDuration();
    if (!duration) {
      return null;
    }

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Helper method to mark attempt as completed
  ImportAttempt.prototype.markCompleted = async function() {
    this.status = ImportAttempt.STATUS.COMPLETED;
    this.ended_at = new Date();
    return await this.save();
  };

  // Helper method to mark attempt as failed
  ImportAttempt.prototype.markFailed = async function(errorSummary) {
    this.status = ImportAttempt.STATUS.FAILED;
    this.ended_at = new Date();
    if (errorSummary) {
      this.error_summary = errorSummary;
    }
    return await this.save();
  };

  // Helper method to mark attempt as cancelled
  ImportAttempt.prototype.markCancelled = async function() {
    this.status = ImportAttempt.STATUS.CANCELLED;
    this.ended_at = new Date();
    return await this.save();
  };

  return ImportAttempt;
};
