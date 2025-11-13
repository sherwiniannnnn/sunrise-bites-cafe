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
    return await getKitchenOrders();
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ success: false, message: 'Method not allowed' })
  };
};

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
      (order.items || []).forEach(item => {
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