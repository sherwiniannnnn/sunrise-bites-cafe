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

  try {
    if (event.httpMethod === 'GET') {
      return await getMenuData();
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Menu API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: 'Failed to fetch menu',
        error: error.message 
      })
    };
  }
};

async function getMenuData() {
  try {
    // Get all active categories first
    const categoriesResult = await query(`
      SELECT * FROM categories 
      WHERE is_active = true 
      ORDER BY name
    `);

    // Get all available menu items
    const menuItemsResult = await query(`
      SELECT m.*, c.name as category_name
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      WHERE m.is_available = true
      ORDER BY c.name, m.name
    `);

    const categories = categoriesResult.rows;
    const menuItems = menuItemsResult.rows;

    // Group menu items by category manually to avoid duplicates
    const menuData = categories.map(category => {
      const categoryItems = menuItems.filter(item => item.category_id === category.id);
      return {
        ...category,
        items: categoryItems
      };
    });

    // Filter out categories with no items (optional - remove if you want empty categories to show)
    const filteredMenuData = menuData.filter(category => category.items.length > 0);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        data: filteredMenuData,
        categories_count: categories.length,
        items_count: menuItems.length
      })
    };

  } catch (error) {
    console.error('Database query error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        message: 'Failed to fetch menu data',
        error: error.message 
      })
    };
  }
}