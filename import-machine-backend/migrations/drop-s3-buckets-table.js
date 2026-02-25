const { sequelize } = require('../config/database');

async function dropS3BucketsTable() {
  try {
    console.log('🔄 Dropping S3 buckets table...');
    
    // Drop indexes first
    await sequelize.query(`
      DROP INDEX IF EXISTS idx_s3_buckets_name
    `);

    await sequelize.query(`
      DROP INDEX IF EXISTS idx_s3_buckets_status
    `);

    await sequelize.query(`
      DROP INDEX IF EXISTS idx_s3_buckets_user_id
    `);

    // Drop the table
    await sequelize.query(`
      DROP TABLE IF EXISTS s3_buckets CASCADE
    `);

    console.log('✅ S3 buckets table dropped successfully');
    
    // Verify table deletion (PostgreSQL syntax)
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 's3_buckets'"
    );
    if (tables[0].length === 0) {
      console.log('✅ S3 buckets table deletion verification successful');
    } else {
      console.log('❌ S3 buckets table deletion verification failed');
    }

  } catch (error) {
    console.error('❌ Error dropping S3 buckets table:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  dropS3BucketsTable()
    .then(() => {
      console.log('🎉 S3 buckets table drop migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 S3 buckets table drop migration failed:', error);
      process.exit(1);
    });
}

module.exports = dropS3BucketsTable;
