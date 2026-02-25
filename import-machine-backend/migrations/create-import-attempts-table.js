'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('import_attempts', {
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
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      ended_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 0,
        comment: '0=PENDING, 1=RUNNING, 2=COMPLETED, 3=FAILED, 4=CANCELLED'
      },
      error_summary: {
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

    // Add indexes for better performance
    await queryInterface.addIndex('import_attempts', ['import_id']);
    await queryInterface.addIndex('import_attempts', ['status']);
    await queryInterface.addIndex('import_attempts', ['started_at']);
    await queryInterface.addIndex('import_attempts', ['ended_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('import_attempts');
  }
};
