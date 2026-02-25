#!/usr/bin/env node

const { sequelize } = require('./config/database');
const { QueryTypes } = require('sequelize');

async function addCustomerGUIDColumn() {
  try {
    console.log('🔄 Starting migration: Adding customerGUID column to configurations table...');
    
    // Check if the column already exists (PostgreSQL syntax)
    const tableInfo = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'configurations' AND column_name = 'customer_g_u_i_d'",
      { type: QueryTypes.SELECT }
    );
    
    const customerGUIDExists = tableInfo.length > 0;
    
    if (customerGUIDExists) {
      console.log('✅ customerGUID column already exists in configurations table.');
      return;
    }
    
    // Add the customerGUID column (using snake_case as Sequelize expects)
    await sequelize.query(
      "ALTER TABLE configurations ADD COLUMN customer_g_u_i_d VARCHAR(255)",
      { type: QueryTypes.RAW }
    );
    
    console.log('✅ Successfully added customerGUID column to configurations table.');
    
    // Verify the column was added
    const updatedTableInfo = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'configurations' AND column_name = 'customer_g_u_i_d'",
      { type: QueryTypes.SELECT }
    );
    
    const columnAdded = updatedTableInfo.length > 0;
    if (columnAdded) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('❌ Migration failed: Column was not added.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addCustomerGUIDColumn()
  .then(() => {
    console.log('🎉 Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
