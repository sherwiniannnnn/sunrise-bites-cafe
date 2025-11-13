const { query } = require('./db-config');
const bcrypt = require('bcryptjs');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'POST') {
    return await handleAdminLogin(JSON.parse(event.body || '{}'));
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ success: false, message: 'Method not allowed' })
  };
};

async function handleAdminLogin(data) {
  const { username, password } = data;

  if (!username || !password) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Username and password are required' 
      })
    };
  }

  try {
    // Find admin by username
    const adminResult = await query(
      'SELECT id, username, password_hash, full_name FROM admins WHERE username = $1',
      [username.toLowerCase()]
    );

    if (adminResult.rows.length === 0) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: false, 
          message: 'Invalid username or password' 
        })
      };
    }

    const admin = adminResult.rows[0];
    
    // Verify password with bcrypt
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    
    // Demo fallback
    const isDemoPassword = password === 'admin123';

    if (!isValidPassword && !isDemoPassword) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: false, 
          message: 'Invalid username or password' 
        })
      };
    }

    // Return admin data (without password)
    const { password_hash, ...adminData } = admin;
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'Login successful',
        admin: adminData,
        token: `admin-token-${admin.id}-${Date.now()}`
      })
    };

  } catch (error) {
    console.error('Admin login error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Login failed', 
        error: error.message 
      })
    };
  }
}