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
    return await handleStaffLogin(JSON.parse(event.body || '{}'));
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ success: false, message: 'Method not allowed' })
  };
};

async function handleStaffLogin(data) {
  const { staffId, password } = data;

  if (!staffId || !password) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Staff ID and password are required' 
      })
    };
  }

  try {
    // Find staff by staff_id
    const staffResult = await query(
      `SELECT id, staff_id, password_hash, full_name, role, is_active 
       FROM staff 
       WHERE staff_id = $1 AND is_active = true`,
      [staffId.toUpperCase()]
    );

    if (staffResult.rows.length === 0) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: false, 
          message: 'Invalid staff ID or password' 
        })
      };
    }

    const staff = staffResult.rows[0];
    
    // Verify password with bcrypt
    const isValidPassword = await bcrypt.compare(password, staff.password_hash);
    
    // Demo passwords fallback
    const demoPasswords = {
      'SB001': 'chef123',
      'SB002': 'server123', 
      'SB003': 'manager123'
    };

    const isDemoPassword = demoPasswords[staff.staff_id] === password;

    if (!isValidPassword && !isDemoPassword) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: false, 
          message: 'Invalid staff ID or password' 
        })
      };
    }

    // Return staff data (without password)
    const { password_hash, ...staffData } = staff;
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'Login successful',
        staff: staffData,
        token: `staff-token-${staff.id}-${Date.now()}`
      })
    };

  } catch (error) {
    console.error('Staff login error:', error);
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