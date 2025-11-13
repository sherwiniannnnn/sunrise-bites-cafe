const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'import' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  try {
    console.log('🔗 Connecting to Neon PostgreSQL database...');
    
    // Read and execute setup SQL
    const fs = require('fs');
    const path = require('path');
    
    const setupSQL = fs.readFileSync(path.join(__dirname, '../sql/setup.sql'), 'utf8');
    const sampleDataSQL = fs.readFileSync(path.join(__dirname, '../sql/sample-data.sql'), 'utf8');
    
    console.log('📝 Creating tables...');
    await pool.query(setupSQL);
    console.log('✅ Tables created successfully!');
    
    console.log('📊 Inserting sample data...');
    await pool.query(sampleDataSQL);
    console.log('✅ Sample data inserted successfully!');
    
    console.log('🎉 Database setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the connection using the db-test.html page');
    console.log('2. Deploy to Netlify with environment variables');
    console.log('3. Configure your DATABASE_URL in Netlify dashboard');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();