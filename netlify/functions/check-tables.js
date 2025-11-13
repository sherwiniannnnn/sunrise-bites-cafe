const { query } = require('./db-config');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Check if all required tables exist
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'staff', 'admins', 'categories', 'menu_items', 'orders', 'order_items', 'order_status_history')
      ORDER BY table_name;
    `;

    const result = await query(tableCheckQuery);
    const existingTables = result.rows.map(row => row.table_name);
    const requiredTables = ['users', 'staff', 'admins', 'categories', 'menu_items', 'orders', 'order_items', 'order_status_history'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        existingTables,
        missingTables,
        allTablesExist: missingTables.length === 0,
        tableCount: existingTables.length
      })
    };
  } catch (error) {
    console.error('Table check failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Failed to check tables',
        error: error.message
      })
    };
  }
};