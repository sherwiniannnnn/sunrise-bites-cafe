const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupProduction() {
  try {
    console.log('🚀 Setting up production database...');
    
    const fs = require('fs');
    const path = require('path');
    
    // Read SQL files
    const setupSQL = fs.readFileSync(path.join(__dirname, '../sql/setup.sql'), 'utf8');
    const sampleDataSQL = fs.readFileSync(path.join(__dirname, '../sql/sample-data.sql'), 'utf8');
    
    console.log('📝 Creating production tables...');
    await pool.query(setupSQL);
    console.log('✅ Production tables created!');
    
    console.log('📊 Inserting production data...');
    await pool.query(sampleDataSQL);
    console.log('✅ Production data inserted!');
    
    // Verify setup
    console.log('🔍 Verifying setup...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Production tables:');
    tables.rows.forEach(table => {
      console.log(`   ✅ ${table.table_name}`);
    });
    
    console.log('\n🎉 Production database setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Deploy to Netlify: npm run deploy');
    console.log('2. Set DATABASE_URL in Netlify environment variables');
    console.log('3. Test the live application');
    
  } catch (error) {
    console.error('❌ Production setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupProduction();