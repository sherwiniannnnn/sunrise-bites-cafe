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
    return await getRevenueReport(event.queryStringParameters);
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ success: false, message: 'Method not allowed' })
  };
};

async function getRevenueReport(queryParams = {}) {
  try {
    const { period = 'month' } = queryParams;
    
    let groupBy, interval;
    switch (period) {
      case 'day':
        groupBy = 'DATE(created_at)';
        interval = '7 days';
        break;
      case 'week':
        groupBy = 'EXTRACT(YEAR FROM created_at) || \'-\' || EXTRACT(WEEK FROM created_at)';
        interval = '12 weeks';
        break;
      case 'month':
      default:
        groupBy = 'EXTRACT(YEAR FROM created_at) || \'-\' || EXTRACT(MONTH FROM created_at)';
        interval = '12 months';
        break;
    }

    const result = await query(`
      SELECT 
        ${groupBy} as period,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as revenue,
        AVG(CASE WHEN status = 'completed' THEN total_amount ELSE NULL END) as avg_order_value
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${interval}'
      GROUP BY ${groupBy}
      ORDER BY period ASC
    `);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        data: result.rows,
        period: period
      })
    };

  } catch (error) {
    console.error('Get revenue report error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Failed to fetch revenue report', 
        error: error.message 
      })
    };
  }
}