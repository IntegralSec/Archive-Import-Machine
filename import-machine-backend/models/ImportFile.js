const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ImportFile = sequelize.define('ImportFile', {
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
    path: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 10000] // Reasonable path length limit
      }
    },
    size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    sha256: {
      type: DataTypes.BLOB,
      allowNull: false,
      validate: {
        isValidSha256(value) {
          if (!value || value.length !== 32) {
            throw new Error('SHA256 must be exactly 32 bytes');
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
        max: 6,
        isIn: {
          args: [[0, 1, 2, 3, 4, 5, 6]],
          msg: 'Status must be 0 (PENDING), 1 (QUEUED), 2 (PROCESSING), 3 (INGESTED), 4 (FAILED), 5 (SKIPPED_DEDUP), or 6 (QUARANTINED)'
        }
      }
    },
    ingested_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    attempt_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    last_error: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 10000] // Limit error message to 10KB
      }
    }
  }, {
    tableName: 'import_files',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['import_id', 'status']
      },
      {
        fields: ['sha256']
      },
      {
        fields: ['path']
      },
      {
        fields: ['ingested_at']
      },
      {
        fields: ['attempt_count']
      }
    ]
  });

  // Define status constants
  ImportFile.STATUS = {
    PENDING: 0,
    QUEUED: 1,
    PROCESSING: 2,
    INGESTED: 3,
    FAILED: 4,
    SKIPPED_DEDUP: 5,
    QUARANTINED: 6
  };

  // Helper method to get status name
  ImportFile.prototype.getStatusName = function() {
    const statusNames = {
      [ImportFile.STATUS.PENDING]: 'PENDING',
      [ImportFile.STATUS.QUEUED]: 'QUEUED',
      [ImportFile.STATUS.PROCESSING]: 'PROCESSING',
      [ImportFile.STATUS.INGESTED]: 'INGESTED',
      [ImportFile.STATUS.FAILED]: 'FAILED',
      [ImportFile.STATUS.SKIPPED_DEDUP]: 'SKIPPED_DEDUP',
      [ImportFile.STATUS.QUARANTINED]: 'QUARANTINED'
    };
    return statusNames[this.status] || 'UNKNOWN';
  };

  // Helper method to check if file is in queue (pending, queued, or processing)
  ImportFile.prototype.isInQueue = function() {
    return this.status === ImportFile.STATUS.PENDING || 
           this.status === ImportFile.STATUS.QUEUED || 
           this.status === ImportFile.STATUS.PROCESSING;
  };

  // Helper method to check if file is completed (ingested, skipped, or quarantined)
  ImportFile.prototype.isCompleted = function() {
    return this.status === ImportFile.STATUS.INGESTED || 
           this.status === ImportFile.STATUS.SKIPPED_DEDUP || 
           this.status === ImportFile.STATUS.QUARANTINED;
  };

  // Helper method to check if file failed
  ImportFile.prototype.isFailed = function() {
    return this.status === ImportFile.STATUS.FAILED;
  };

  // Helper method to check if file is ingested
  ImportFile.prototype.isIngested = function() {
    return this.status === ImportFile.STATUS.INGESTED;
  };

  // Helper method to check if file is skipped due to deduplication
  ImportFile.prototype.isSkippedDedup = function() {
    return this.status === ImportFile.STATUS.SKIPPED_DEDUP;
  };

  // Helper method to check if file is quarantined
  ImportFile.prototype.isQuarantined = function() {
    return this.status === ImportFile.STATUS.QUARANTINED;
  };

  // Helper method to get SHA256 as hex string
  ImportFile.prototype.getSha256Hex = function() {
    if (!this.sha256) return null;
    return Buffer.from(this.sha256).toString('hex');
  };

  // Helper method to set SHA256 from hex string
  ImportFile.prototype.setSha256FromHex = function(hexString) {
    if (!hexString || hexString.length !== 64) {
      throw new Error('SHA256 hex string must be exactly 64 characters');
    }
    this.sha256 = Buffer.from(hexString, 'hex');
  };

  // Helper method to mark file as ingested
  ImportFile.prototype.markIngested = async function() {
    this.status = ImportFile.STATUS.INGESTED;
    this.ingested_at = new Date();
    return await this.save();
  };

  // Helper method to mark file as failed
  ImportFile.prototype.markFailed = async function(errorMessage) {
    this.status = ImportFile.STATUS.FAILED;
    this.attempt_count += 1;
    if (errorMessage) {
      this.last_error = errorMessage;
    }
    return await this.save();
  };

  // Helper method to mark file as skipped due to deduplication
  ImportFile.prototype.markSkippedDedup = async function() {
    this.status = ImportFile.STATUS.SKIPPED_DEDUP;
    this.ingested_at = new Date();
    return await this.save();
  };

  // Helper method to mark file as quarantined
  ImportFile.prototype.markQuarantined = async function(reason) {
    this.status = ImportFile.STATUS.QUARANTINED;
    if (reason) {
      this.last_error = reason;
    }
    return await this.save();
  };

  // Helper method to increment attempt count
  ImportFile.prototype.incrementAttemptCount = async function() {
    this.attempt_count += 1;
    return await this.save();
  };

  // Helper method to get file size in human readable format
  ImportFile.prototype.getSizeFormatted = function() {
    if (!this.size_bytes) return 'Unknown';
    
    const bytes = this.size_bytes;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Static method to get queue statistics for an import
  ImportFile.getQueueStats = async function(importId) {
    const stats = await ImportFile.findAll({
      where: { import_id: importId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const result = {
      pending: 0,
      queued: 0,
      processing: 0,
      ingested: 0,
      failed: 0,
      skipped_dedup: 0,
      quarantined: 0,
      total: 0
    };

    stats.forEach(stat => {
      const count = parseInt(stat.count);
      result.total += count;
      
      switch (stat.status) {
        case ImportFile.STATUS.PENDING:
          result.pending = count;
          break;
        case ImportFile.STATUS.QUEUED:
          result.queued = count;
          break;
        case ImportFile.STATUS.PROCESSING:
          result.processing = count;
          break;
        case ImportFile.STATUS.INGESTED:
          result.ingested = count;
          break;
        case ImportFile.STATUS.FAILED:
          result.failed = count;
          break;
        case ImportFile.STATUS.SKIPPED_DEDUP:
          result.skipped_dedup = count;
          break;
        case ImportFile.STATUS.QUARANTINED:
          result.quarantined = count;
          break;
      }
    });

    return result;
  };

  return ImportFile;
};
