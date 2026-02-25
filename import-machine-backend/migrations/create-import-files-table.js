'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('import_files', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      import_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'imports',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      path: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      size_bytes: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      sha256: {
        type: Sequelize.BLOB,
        allowNull: false
      },
      status: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 0,
        comment: '0=PENDING, 1=QUEUED, 2=PROCESSING, 3=INGESTED, 4=FAILED, 5=SKIPPED_DEDUP, 6=QUARANTINED'
      },
      ingested_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      attempt_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      last_error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for better performance (big-table aware)
    
    // Core work-queue filter index
    await queryInterface.addIndex('import_files', ['import_id', 'status']);
    
    // Partial index for the queue (only pending/queued/processing files)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_files_queue 
      ON import_files (import_id, status, created_at) 
      WHERE status IN (0, 1, 2)
    `);
    
    // Index for sha256 lookups
    await queryInterface.addIndex('import_files', ['sha256']);
    
    // Index for path lookups
    await queryInterface.addIndex('import_files', ['path']);
    
    // Index for ingested_at for reporting
    await queryInterface.addIndex('import_files', ['ingested_at']);
    
    // Index for attempt_count for retry logic
    await queryInterface.addIndex('import_files', ['attempt_count']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the partial index first
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_import_files_queue
    `);
    
    // Drop the table
    await queryInterface.dropTable('import_files');
  }
};
