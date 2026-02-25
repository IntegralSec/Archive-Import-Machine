'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('batches', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      source_system: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      created_by: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      manifest_sha256: {
        type: Sequelize.BLOB,
        allowNull: true
      },
      status: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 0,
        comment: '0=PENDING, 1=RUNNING, 2=COMPLETED, 3=FAILED, 4=CANCELLED'
      },
      file_count_expected: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      file_count_discovered: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      file_count_ingested: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('batches', ['status']);
    await queryInterface.addIndex('batches', ['created_at']);
    await queryInterface.addIndex('batches', ['source_system']);
    await queryInterface.addIndex('batches', ['created_by']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('batches');
  }
};
