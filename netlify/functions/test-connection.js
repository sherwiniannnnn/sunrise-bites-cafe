const { query } = require('./db-config');

exports.handler = async (event, context) => {
  // Enable CORS
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
    // Test query to check database connection
    const result = await query('SELECT NOW() as current_time, version() as postgres_version');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Database connection successful',
        data: result.rows[0],
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Database connection test failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Database connection failed',
        error: error.message
      })
    };
  }
};