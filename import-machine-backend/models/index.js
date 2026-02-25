const { sequelize, testConnection, syncDatabase } = require('../config/database');
const User = require('./User');
const Configuration = require('./Configuration');
const IngestionPoint = require('./IngestionPoint');
const ImportJob = require('./ImportJob');
const S3Bucket = require('./S3Bucket');

// Initialize database
const initializeDatabase = async () => {
  try {
    // Test connection
    await testConnection();
    
    // Set up associations
    User.hasMany(Configuration, { foreignKey: 'userId', as: 'configurations' });
    Configuration.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    User.hasMany(IngestionPoint, { foreignKey: 'userId', as: 'ingestionPoints' });
    IngestionPoint.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    User.hasMany(ImportJob, { foreignKey: 'userId', as: 'importJobs' });
    ImportJob.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    User.hasMany(S3Bucket, { foreignKey: 'userId', as: 's3Buckets' });
    S3Bucket.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Sync database (create tables)
    await syncDatabase();
    
    // Create default admin user if it doesn't exist
    const adminUser = await User.findOne({
      where: { username: 'admin' }
    });
    
    if (!adminUser) {
      await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('✅ Default admin user created (admin/admin123)');
    }
    
    console.log('✅ Database initialization completed successfully.');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Configuration,
  IngestionPoint,
  ImportJob,
  S3Bucket,
  initializeDatabase
};
