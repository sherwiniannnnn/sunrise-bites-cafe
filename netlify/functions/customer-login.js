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
    return await handleCustomerLogin(JSON.parse(event.body || '{}'));
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ success: false, message: 'Method not allowed' })
  };
};

async function handleCustomerLogin(data) {
  const { email, password } = data;

  if (!email || !password) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Email and password are required' 
      })
    };
  }

  try {
    // Find user by email
    const userResult = await query(
      'SELECT id, email, password_hash, full_name, phone FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: false, 
          message: 'Invalid email or password' 
        })
      };
    }

    const user = userResult.rows[0];
    
    // Demo password for demo@example.com
    const demoPasswords = {
      'demo@example.com': 'demo123'
    };
    
    const isDemoPassword = demoPasswords[email] === password;
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword && !isDemoPassword) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: false, 
          message: 'Invalid email or password' 
        })
      };
    }

    // Return user data (without password)
    const { password_hash, ...userData } = user;
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'Login successful',
        user: userData,
        token: `demo-token-${user.id}-${Date.now()}`
      })
    };

  } catch (error) {
    console.error('Login error:', error);
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