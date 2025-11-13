const { query, pool } = require('./db-config');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'PUT') {
    return await updateOrderStatus(JSON.parse(event.body || '{}'));
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ success: false, message: 'Method not allowed' })
  };
};

async function updateOrderStatus(data) {
  const { orderId, status, staffId, notes } = data;

  if (!orderId || !status) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Order ID and status are required' 
      })
    };
  }

  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Invalid status' 
      })
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Update order status
    await client.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, orderId]
    );

    // Add status history
    await client.query(
      `INSERT INTO order_status_history (order_id, status, notes) 
       VALUES ($1, $2, $3)`,
      [orderId, status, notes || `Status updated to ${status} by staff ${staffId || 'system'}`]
    );

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: `Order status updated to ${status}`
      })
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update order status error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Failed to update order status', 
        error: error.message 
      })
    };
  } finally {
    client.release();
  }
}