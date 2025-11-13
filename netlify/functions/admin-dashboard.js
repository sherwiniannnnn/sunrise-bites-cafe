const { query } = require('./db-config');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return await getDashboardStats();
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ success: false, message: 'Method not allowed' })
  };
};

async function getDashboardStats() {
  try {
    // Simple queries that won't fail with empty tables
    const totalOrdersResult = await query('SELECT COUNT(*) as count FROM orders');
    const totalUsersResult = await query('SELECT COUNT(*) as count FROM users');
    const activeStaffResult = await query('SELECT COUNT(*) as count FROM staff WHERE is_active = true');
    const menuItemsResult = await query('SELECT COUNT(*) as count FROM menu_items');

    // Safe revenue query
    const revenueResult = await query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = $1', ['completed']);

    // Safe popular items query
    const popularItemsResult = await query(`
      SELECT mi.name, COALESCE(SUM(oi.quantity), 0) as total_quantity
      FROM menu_items mi
      LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
      GROUP BY mi.id, mi.name
      ORDER BY total_quantity DESC
      LIMIT 5
    `);

    // Order status
    const orderStatusResult = await query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
    `);

    const stats = {
      total_orders: parseInt(totalOrdersResult.rows[0].count) || 0,
      today_orders: 0, // Simplified for now
      total_revenue: parseFloat(revenueResult.rows[0].total) || 0,
      today_revenue: 0, // Simplified for now
      total_users: parseInt(totalUsersResult.rows[0].count) || 0,
      active_staff: parseInt(activeStaffResult.rows[0].count) || 0,
      total_menu_items: parseInt(menuItemsResult.rows[0].count) || 0,
      popular_items: popularItemsResult.rows || [],
      order_status: orderStatusResult.rows || []
    };

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        data: stats
      })
    };

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Failed to fetch dashboard stats', 
        error: error.message 
      })
    };
  }
}