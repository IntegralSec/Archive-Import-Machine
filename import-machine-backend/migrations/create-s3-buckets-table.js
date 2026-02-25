const { sequelize } = require('../config/database');

async function createS3BucketsTable() {
  try {
    console.log('🔄 Creating S3 buckets table...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS s3_buckets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(63) NOT NULL UNIQUE,
        region VARCHAR(20) NOT NULL DEFAULT 'us-east-1',
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'creating',
        size BIGINT NOT NULL DEFAULT 0,
        object_count INTEGER NOT NULL DEFAULT 0,
        last_sync_at TIMESTAMP,
        metadata TEXT,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_s3_buckets_user_id ON s3_buckets (user_id)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_s3_buckets_status ON s3_buckets (status)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_s3_buckets_name ON s3_buckets (name)
    `);

    console.log('✅ S3 buckets table created successfully');
    
    // Verify table creation (PostgreSQL syntax)
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 's3_buckets'"
    );
    if (tables[0].length > 0) {
      console.log('✅ S3 buckets table verification successful');
    } else {
      console.log('❌ S3 buckets table verification failed');
    }

  } catch (error) {
    console.error('❌ Error creating S3 buckets table:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  createS3BucketsTable()
    .then(() => {
      console.log('🎉 S3 buckets migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 S3 buckets migration failed:', error);
      process.exit(1);
    });
}

module.exports = createS3BucketsTable;
