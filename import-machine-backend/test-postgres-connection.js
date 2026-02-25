#!/usr/bin/env node

require('dotenv').config();
const { sequelize, testConnection } = require('./config/database');

async function testPostgreSQLConnection() {
  try {
    console.log('🔍 Testing PostgreSQL connection...');
    console.log('📋 Database configuration:');
    console.log(`   Host: ${process.env.DB_HOST || '192.168.50.216'}`);
    console.log(`   Port: ${process.env.DB_PORT || 5432}`);
    console.log(`   Database: ${process.env.DB_NAME || 'import-machine'}`);
    console.log(`   Username: ${process.env.DB_USER || 'NOT SET'}`);
    console.log(`   Password: ${process.env.DB_PASSWORD ? '***SET***' : 'NOT SET'}`);
    
    // Test connection
    await testConnection();
    
    // Test a simple query
    const result = await sequelize.query('SELECT version()', { type: sequelize.QueryTypes.SELECT });
    console.log('✅ PostgreSQL version:', result[0].version);
    
    // Test if we can create a simple table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS test_connection (
        id SERIAL PRIMARY KEY,
        test_field VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Test table creation successful');
    
    // Clean up test table
    await sequelize.query('DROP TABLE IF EXISTS test_connection');
    console.log('✅ Test table cleanup successful');
    
    console.log('🎉 PostgreSQL connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ PostgreSQL connection test failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

testPostgreSQLConnection();
