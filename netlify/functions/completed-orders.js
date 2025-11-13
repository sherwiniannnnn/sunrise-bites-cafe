const { query } = require('./db-config');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return await getCompletedOrders(event.queryStringParameters);
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ success: false, message: 'Method not allowed' })
  };
};

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