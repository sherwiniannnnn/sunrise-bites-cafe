const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function finalVerification() {
  console.log('🔍 Starting final system verification...\n');
  
  try {
    // 1. Database Connection Test
    console.log('1. Testing database connection...');
    const connectionTest = await pool.query('SELECT NOW() as time, version() as version');
    console.log('   ✅ Database connected successfully');
    console.log(`   📊 PostgreSQL: ${connectionTest.rows[0].version.split(' ')[1]}`);
    console.log(`   ⏰ Server time: ${connectionTest.rows[0].time.toLocaleString()}\n`);

    // 2. Table Verification
    console.log('2. Verifying database tables...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const expectedTables = [
      'users', 'staff', 'admins', 'categories', 
      'menu_items', 'orders', 'order_items', 'order_status_history'
    ];
    
    const existingTables = tables.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('   ✅ All tables present');
      existingTables.forEach(table => console.log(`      📋 ${table}`));
    } else {
      console.log('   ❌ Missing tables:', missingTables);
    }
    console.log('');

    // 3. Data Verification
    console.log('3. Verifying sample data...');
    
    const checks = [
      { name: 'Categories', query: 'SELECT COUNT(*) FROM categories', min: 1 },
      { name: 'Menu Items', query: 'SELECT COUNT(*) FROM menu_items', min: 1 },
      { name: 'Users', query: 'SELECT COUNT(*) FROM users', min: 1 },
      { name: 'Staff', query: 'SELECT COUNT(*) FROM staff', min: 1 },
      { name: 'Admins', query: 'SELECT COUNT(*) FROM admins', min: 1 }
    ];

    for (const check of checks) {
      const result = await pool.query(check.query);
      const count = parseInt(result.rows[0].count);
      
      if (count >= check.min) {
        console.log(`   ✅ ${check.name}: ${count} records`);
      } else {
        console.log(`   ❌ ${check.name}: Only ${count} records (expected at least ${check.min})`);
      }
    }
    console.log('');

    // 4. Demo Accounts Verification
    console.log('4. Verifying demo accounts...');
    
    const demoAccounts = [
      { type: 'Customer', query: 'SELECT email FROM users WHERE email = $1', value: 'customer@example.com' },
      { type: 'Staff Chef', query: 'SELECT staff_id FROM staff WHERE staff_id = $1', value: 'SB001' },
      { type: 'Staff Server', query: 'SELECT staff_id FROM staff WHERE staff_id = $1', value: 'SB002' },
      { type: 'Staff Manager', query: 'SELECT staff_id FROM staff WHERE staff_id = $1', value: 'SB003' },
      { type: 'Admin', query: 'SELECT username FROM admins WHERE username = $1', value: 'admin' }
    ];

    for (const account of demoAccounts) {
      const result = await pool.query(account.query, [account.value]);
      
      if (result.rows.length > 0) {
        console.log(`   ✅ ${account.type}: ${account.value} exists`);
      } else {
        console.log(`   ❌ ${account.type}: ${account.value} missing`);
      }
    }
    console.log('');

    // 5. System Readiness
    console.log('5. System readiness check...');
    
    const readinessChecks = [
      { name: 'Database connection', check: () => true }, // Already verified
      { name: 'Table structure', check: () => missingTables.length === 0 },
      { name: 'Sample data', check: () => checks.every(c => {
        const count = parseInt(pool.query(c.query).rows[0].count);
        return count >= c.min;
      })},
      { name: 'Demo accounts', check: () => demoAccounts.every(a => {
        const result = pool.query(a.query, [a.value]);
        return result.rows.length > 0;
      })}
    ];

    let allReady = true;
    for (const check of readinessChecks) {
      const isReady = await check.check();
      if (isReady) {
        console.log(`   ✅ ${check.name}: Ready`);
      } else {
        console.log(`   ❌ ${check.name}: Not ready`);
        allReady = false;
      }
    }
    console.log('');

    // Final Summary
    console.log('🎯 FINAL VERIFICATION SUMMARY');
    console.log('=' .repeat(40));
    
    if (allReady) {
      console.log('✅ SYSTEM READY FOR PRODUCTION');
      console.log('\n🎉 Congratulations! Your Sunrise Bites Cafe system is fully configured and ready for deployment.');
      console.log('\n📋 Next steps:');
      console.log('   1. Deploy to Netlify: npm run deploy');
      console.log('   2. Set environment variables in Netlify dashboard');
      console.log('   3. Run the final test suite: https://your-site.netlify.app/test/final-test.html');
      console.log('   4. Share your live demo!');
    } else {
      console.log('�️ SYSTEM NEEDS ATTENTION');
      console.log('\n⚠️  Please address the issues above before deployment.');
      console.log('   Run: npm run setup-db to reset the database');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run verification if called directly
if (require.main === module) {
  finalVerification();
}

module.exports = { finalVerification };