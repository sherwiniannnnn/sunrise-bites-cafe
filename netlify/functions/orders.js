const { query, pool } = require('./db-config');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'POST') {
      return await createOrder(JSON.parse(event.body || '{}'));
    }

    if (event.httpMethod === 'GET') {
      return await getOrders(event.queryStringParameters);
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Orders API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      })
    };
  }
};

async function createOrder(data) {
  const { userId, items, specialInstructions, totalAmount } = data;

  if (!userId || !items || !Array.isArray(items) || items.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'User ID and items are required' 
      })
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Generate order number
    const orderNumber = 'SB' + Date.now();

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (order_number, user_id, total_amount, special_instructions, status) 
       VALUES ($1, $2, $3, $4, 'pending') 
       RETURNING *`,
      [orderNumber, userId, totalAmount, specialInstructions || '']
    );

    const order = orderResult.rows[0];

    // Add order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, price) 
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.menuItemId, item.quantity, item.price]
      );
    }

    await client.query('COMMIT');

    return {
      statusCode: 201,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'Order created successfully',
        order: {
          ...order,
          orderNumber
        }
      })
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Order creation error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Failed to create order', 
        error: error.message 
      })
    };
  } finally {
    client.release();
  }
}

async function getOrders(queryParams) {
  const { userId } = queryParams;

  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'User ID is required' 
      })
    };
  }

  try {
    const ordersResult = await query(`
      SELECT o.*
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      LIMIT 10
    `, [userId]);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        data: ordersResult.rows
      })
    };

  } catch (error) {
    console.error('Get orders error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Failed to fetch orders', 
        error: error.message 
      })
    };
  }
}