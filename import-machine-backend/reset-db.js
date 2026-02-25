const { sequelize } = require('./config/database');
const { User, Configuration } = require('./models');

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...');
    
    // Drop all tables and recreate them
    await sequelize.sync({ force: true });
    console.log('✅ Database tables recreated');
    
    // Create default admin user
    await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log('✅ Default admin user created (admin/admin123)');
    
    console.log('🎉 Database reset completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
