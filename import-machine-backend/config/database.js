const { Sequelize } = require('sequelize');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || '192.168.50.216',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'import-machine',
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false, // Disable all database statement logging
  define: {
    timestamps: true,
    underscored: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
};

// Validate required environment variables
if (!dbConfig.username || !dbConfig.password) {
  console.error('❌ Database configuration error: DB_USER and DB_PASSWORD must be set in environment variables');
  process.exit(1);
}

const sequelize = new Sequelize(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

// Sync database (create tables if they don't exist)
const syncDatabase = async () => {
  try {
    // Check if tables exist first
    const tableExists = await sequelize.getQueryInterface().showAllTables();
    
    if (tableExists.length === 0) {
      // No tables exist, safe to create them
      await sequelize.sync({ force: false });
    } else {
      // Tables exist, check if they need to be updated
      // Try to sync without altering existing tables
      await sequelize.sync({ force: false, alter: false });
    }
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    
    // If the error is due to foreign key constraints, we need to handle it differently
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      try {
        const { User, Configuration, IngestionPoint, ImportJob, S3Bucket } = require('../models');
        
        // Try to create tables individually with force: false
        await User.sync({ force: false });
        await Configuration.sync({ force: false });
        await IngestionPoint.sync({ force: false });
        await ImportJob.sync({ force: false });
        await S3Bucket.sync({ force: false });
      } catch (individualError) {
        console.error('❌ Failed to create tables individually:', individualError);
        
        // Last resort: recreate all tables
        // Force recreate all tables
        await sequelize.sync({ force: true });
      }
    } else {
      throw error;
    }
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
};
