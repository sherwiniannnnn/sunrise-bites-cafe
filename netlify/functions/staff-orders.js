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
    
    switch (path) {
      case 'staff-orders':
        if (event.httpMethod === 'GET') {
          return await getStaffOrders(event.queryStringParameters);
        }
        break;
      
      case 'update-order-status':
        if (event.httpMethod === 'PUT') {
          return await updateOrderStatus(JSON.parse(event.body || '{}'));
        }
        break;
      
      case 'kitchen-orders':
        if (event.httpMethod === 'GET') {
          return await getKitchenOrders();
        }
        break;
      
      case 'completed-orders':
        if (event.httpMethod === 'GET') {
          return await getCompletedOrders(event.queryStringParameters);
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
    console.error('Staff orders API error:', error);
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

async function getStaffOrders(queryParams = {}) {
  try {
    const { status, limit = 50 } = queryParams;
    
    let whereClause = '';
    let params = [];
    
    if (status && status !== 'all') {
      whereClause = 'WHERE o.status = $1';
      params = [status];
    }

    const ordersResult = await query(`
      SELECT 
        o.*,
        u.full_name as customer_name,
        u.phone as customer_phone,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', oi.id,
            'menu_item_id', oi.menu_item_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'name', mi.name,
            'preparation_time', mi.preparation_time
          )
        ) as items,
        (SELECT status FROM order_status_history osh 
         WHERE osh.order_id = o.id 
         ORDER BY osh.created_at DESC 
         LIMIT 1) as current_status,
        (SELECT created_at FROM order_status_history osh 
         WHERE osh.order_id = o.id 
         ORDER BY osh.created_at DESC 
         LIMIT 1) as status_time
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      ${whereClause}
      GROUP BY o.id, u.id
      ORDER BY o.created_at DESC
      LIMIT $${params.length + 1}
    `, [...params, parseInt(limit)]);

    // Calculate estimated completion time and total preparation time
    const orders = ordersResult.rows.map(order => {
      const items = order.items || [];
      const totalPrepTime = items.reduce((total, item) => {
        return total + (item.preparation_time * item.quantity);
      }, 0);
      
      const orderTime = new Date(order.created_at);
      const estimatedReady = new Date(orderTime.getTime() + totalPrepTime * 60000);
      
      return {
        ...order,
        total_prep_time: totalPrepTime,
        estimated_ready_time: estimatedReady.toISOString()
      };
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        data: orders,
        count: orders.length
      })
    };

  } catch (error) {
    console.error('Get staff orders error:', error);
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

  const client = await dbConfig.pool.connect();

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

async function getKitchenOrders() {
  try {
    const ordersResult = await query(`
      SELECT 
        o.*,
        u.full_name as customer_name,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', oi.id,
            'menu_item_id', oi.menu_item_id,
            'quantity', oi.quantity,
            'name', mi.name,
            'preparation_time', mi.preparation_time,
            'category_name', c.name as category_name
          )
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE o.status IN ('confirmed', 'preparing')
      GROUP BY o.id, u.id
      ORDER BY 
        CASE o.status 
          WHEN 'preparing' THEN 1 
          WHEN 'confirmed' THEN 2 
          ELSE 3 
        END,
        o.created_at ASC
    `);

    // Group items by category for kitchen display
    const orders = ordersResult.rows.map(order => {
      const itemsByCategory = {};
      order.items.forEach(item => {
        if (!itemsByCategory[item.category_name]) {
          itemsByCategory[item.category_name] = [];
        }
        itemsByCategory[item.category_name].push(item);
      });
      
      return {
        ...order,
        items_by_category: itemsByCategory
      };
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        data: orders
      })
    };

  } catch (error) {
    console.error('Get kitchen orders error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Failed to fetch kitchen orders', 
        error: error.message 
      })
    };
  }
}

async function getCompletedOrders(queryParams = {}) {
  try {
    const { hours = 24 } = queryParams;
    
    const ordersResult = await query(`
      SELECT 
        o.*,
        u.full_name as customer_name,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', oi.id,
            'menu_item_id', oi.menu_item_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'name', mi.name
          )
        ) as items,
        (SELECT created_at FROM order_status_history osh 
         WHERE osh.order_id = o.id AND osh.status = 'completed'
         ORDER BY osh.created_at DESC 
         LIMIT 1) as completed_time
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.status = 'completed'
        AND o.updated_at >= NOW() - INTERVAL '${hours} hours'
      GROUP BY o.id, u.id
      ORDER BY o.updated_at DESC
      LIMIT 100
    `);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        data: ordersResult.rows,
        count: ordersResult.rows.length
      })
    };

  } catch (error) {
    console.error('Get completed orders error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Failed to fetch completed orders', 
        error: error.message 
      })
    };
  }
}