const { query } = require('./db-config');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const path = event.path.split('/').pop();
    const data = JSON.parse(event.body || '{}');

    switch (path) {
      case 'orders':
        if (event.httpMethod === 'POST') {
          return await createOrder(data);
        }
        if (event.httpMethod === 'GET') {
          return await getOrders(event.queryStringParameters);
        }
        break;
      
      case 'order-status':
        if (event.httpMethod === 'GET') {
          return await getOrderStatus(event.queryStringParameters);
        }
        break;
      
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, message: 'Endpoint not found' })
        };
    }
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

  const client = await dbConfig.pool.connect();

  try {
    await client.query('BEGIN');

    // Generate order number
    const orderNumber = 'SB' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (order_number, user_id, total_amount, special_instructions, status) 
       VALUES ($1, $2, $3, $4, 'pending') 
       RETURNING *`,
      [orderNumber, userId, totalAmount, specialInstructions]
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

    // Add initial status history
    await client.query(
      `INSERT INTO order_status_history (order_id, status, notes) 
       VALUES ($1, 'pending', 'Order placed successfully')`,
      [order.id]
    );

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
      SELECT o.*, 
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', oi.id,
                 'menuItemId', oi.menu_item_id,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'name', mi.name
               )
             ) as items,
             (SELECT status FROM order_status_history osh 
              WHERE osh.order_id = o.id 
              ORDER BY osh.created_at DESC 
              LIMIT 1) as current_status
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.user_id = $1
      GROUP BY o.id
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

async function getOrderStatus(queryParams) {
  const { orderId } = queryParams;

  if (!orderId) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Order ID is required' 
      })
    };
  }

  try {
    const statusResult = await query(`
      SELECT status, notes, created_at
      FROM order_status_history
      WHERE order_id = $1
      ORDER BY created_at DESC
    `, [orderId]);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        data: statusResult.rows
      })
    };

  } catch (error) {
    console.error('Get order status error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Failed to fetch order status', 
        error: error.message 
      })
    };
  }
}