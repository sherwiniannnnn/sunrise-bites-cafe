class AdminApp {
    constructor() {
        this.currentAdmin = null;
        this.stats = null;
        this.categories = [];
        this.menuItems = [];
        this.users = [];
        this.staffMembers = [];
        this.analyticsData = [];
        this.currentCategory = 'all';
        this.currentPage = 1;
        this.usersPerPage = 10;
        this.API_BASE = '/.netlify/functions';
        
        this.ordersChart = null;
        this.revenueChart = null;
        this.analyticsChart = null;
        
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadDashboardData();
        this.loadCategories();
        this.loadMenuItems();
        this.loadUsers();
        this.loadStaff();
        this.setupCharts();
    }

    checkAuthentication() {
        const adminData = localStorage.getItem('sunrise_admin');
        if (adminData) {
            this.currentAdmin = JSON.parse(adminData);
            this.updateUI();
        } else {
            window.location.href = 'login.html';
        }
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Chart period changes
        document.getElementById('ordersPeriod')?.addEventListener('change', (e) => {
            this.loadOrdersAnalytics(e.target.value);
        });

        document.getElementById('revenuePeriod')?.addEventListener('change', (e) => {
            this.loadRevenueReport(e.target.value);
        });

        document.getElementById('analyticsPeriod')?.addEventListener('change', (e) => {
            this.loadAnalyticsData(e.target.value);
        });

        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    updateUI() {
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl && this.currentAdmin) {
            adminNameEl.textContent = this.currentAdmin.full_name;
        }
    }

    async loadDashboardData() {
    try {
        const response = await fetch(`${this.API_BASE}/admin-dashboard`);
        const result = await response.json();

        if (result.success) {
            this.stats = result.data;
            this.renderStats();
            this.renderPopularItems();
            this.renderOrderStatus();
            // Removed chart calls for now
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        this.showError('Failed to load dashboard data');
    }
}

    renderStats() {
        const statsGrid = document.getElementById('statsGrid');
        if (!statsGrid || !this.stats) return;

        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <span class="stat-number">${this.stats.total_orders}</span>
                <span class="stat-label">Total Orders</span>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-calendar-day"></i>
                </div>
                <span class="stat-number">${this.stats.today_orders}</span>
                <span class="stat-label">Today's Orders</span>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <span class="stat-number">$${this.stats.total_revenue.toFixed(0)}</span>
                <span class="stat-label">Total Revenue</span>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <span class="stat-number">$${this.stats.today_revenue.toFixed(0)}</span>
                <span class="stat-label">Today's Revenue</span>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <span class="stat-number">${this.stats.total_users}</span>
                <span class="stat-label">Total Customers</span>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-user-tie"></i>
                </div>
                <span class="stat-number">${this.stats.active_staff}</span>
                <span class="stat-label">Active Staff</span>
            </div>
        `;
    }

    renderPopularItems() {
        const popularItemsEl = document.getElementById('popularItems');
        if (!popularItemsEl || !this.stats.popular_items) return;

        if (this.stats.popular_items.length === 0) {
            popularItemsEl.innerHTML = '<p class="empty-state">No popular items data available</p>';
            return;
        }

        popularItemsEl.innerHTML = this.stats.popular_items.map(item => `
            <div class="popular-item">
                <span class="popular-item-name">${item.name}</span>
                <span class="popular-item-stats">${item.total_quantity} sold</span>
            </div>
        `).join('');
    }

    renderOrderStatus() {
        const orderStatusEl = document.getElementById('orderStatus');
        if (!orderStatusEl || !this.stats.order_status) return;

        if (this.stats.order_status.length === 0) {
            orderStatusEl.innerHTML = '<p class="empty-state">No orders today</p>';
            return;
        }

        orderStatusEl.innerHTML = this.stats.order_status.map(status => `
            <div class="status-item">
                <span class="status-name">${status.status}</span>
                <span class="status-count">${status.count}</span>
            </div>
        `).join('');
    }

    async loadOrdersAnalytics(days = 30) {
        try {
            const response = await fetch(`${this.API_BASE}/orders-analytics?days=${days}`);
            const result = await response.json();

            if (result.success) {
                this.updateOrdersChart(result.data);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to load orders analytics:', error);
        }
    }

    async loadRevenueReport(period = 'month') {
        try {
            const response = await fetch(`${this.API_BASE}/revenue-report?period=${period}`);
            const result = await response.json();

            if (result.success) {
                this.updateRevenueChart(result.data, period);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to load revenue report:', error);
        }
    }

    async loadAnalyticsData(days = 30) {
        try {
            const response = await fetch(`${this.API_BASE}/orders-analytics?days=${days}`);
            const result = await response.json();

            if (result.success) {
                this.updateAnalyticsChart(result.data);
                this.updatePerformanceMetrics(result.data);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
        }
    }

    setupCharts() {
        // Orders Chart
        const ordersCtx = document.getElementById('ordersChart')?.getContext('2d');
        if (ordersCtx) {
            this.ordersChart = new Chart(ordersCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Orders',
                        data: [],
                        borderColor: '#FF6B35',
                        backgroundColor: 'rgba(255, 107, 53, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
        if (revenueCtx) {
            this.revenueChart = new Chart(revenueCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Revenue',
                        data: [],
                        backgroundColor: '#4A4F7A',
                        borderColor: '#2D3047',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        // Analytics Chart
        const analyticsCtx = document.getElementById('analyticsChart')?.getContext('2d');
        if (analyticsCtx) {
            this.analyticsChart = new Chart(analyticsCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Total Orders',
                            data: [],
                            borderColor: '#FF6B35',
                            backgroundColor: 'rgba(255, 107, 53, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Completed Orders',
                            data: [],
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }
    }

    updateOrdersChart(data) {
        if (!this.ordersChart) return;

        const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        this.ordersChart.data.labels = sortedData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        this.ordersChart.data.datasets[0].data = sortedData.map(item => item.order_count);
        this.ordersChart.update();
    }

    updateRevenueChart(data, period) {
        if (!this.revenueChart) return;

        const sortedData = data.sort((a, b) => {
            if (period === 'month') {
                return a.period.localeCompare(b.period);
            }
            return new Date(a.period) - new Date(b.period);
        });

        this.revenueChart.data.labels = sortedData.map(item => {
            if (period === 'month') {
                const [year, month] = item.period.split('-');
                return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }
            return item.period;
        });

        this.revenueChart.data.datasets[0].data = sortedData.map(item => parseFloat(item.revenue));
        this.revenueChart.update();
    }

    updateAnalyticsChart(data) {
        if (!this.analyticsChart) return;

        const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        this.analyticsChart.data.labels = sortedData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        this.analyticsChart.data.datasets[0].data = sortedData.map(item => item.order_count);
        this.analyticsChart.data.datasets[1].data = sortedData.map(item => item.completed_orders);
        this.analyticsChart.update();
    }

    updatePerformanceMetrics(data) {
        const metricsEl = document.getElementById('performanceMetrics');
        if (!metricsEl) return;

        const totalOrders = data.reduce((sum, item) => sum + item.order_count, 0);
        const completedOrders = data.reduce((sum, item) => sum + item.completed_orders, 0);
        const totalRevenue = data.reduce((sum, item) => sum + parseFloat(item.daily_revenue), 0);
        const completionRate = totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : 0;
        const avgOrderValue = completedOrders > 0 ? (totalRevenue / completedOrders).toFixed(2) : 0;

        metricsEl.innerHTML = `
            <div class="metric-item">
                <span class="metric-name">Total Orders</span>
                <span class="metric-value">${totalOrders}</span>
            </div>
            <div class="metric-item">
                <span class="metric-name">Completion Rate</span>
                <span class="metric-value">${completionRate}%</span>
            </div>
            <div class="metric-item">
                <span class="metric-name">Total Revenue</span>
                <span class="metric-value">$${totalRevenue.toFixed(2)}</span>
            </div>
            <div class="metric-item">
                <span class="metric-name">Avg Order Value</span>
                <span class="metric-value">$${avgOrderValue}</span>
            </div>
        `;
    }

    // Categories Management
    async loadCategories() {
        try {
            const response = await fetch(`${this.API_BASE}/categories`);
            const result = await response.json();

            if (result.success) {
                this.categories = result.data;
                this.renderCategoriesTabs();
                this.populateCategorySelects();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.showError('Failed to load categories');
        }
    }

    renderCategoriesTabs() {
        const tabsEl = document.getElementById('categoriesTabs');
        if (!tabsEl) return;

        const allItemsCount = this.menuItems.length;
        const availableItemsCount = this.menuItems.filter(item => item.is_available).length;

        tabsEl.innerHTML = `
            <button class="category-tab ${this.currentCategory === 'all' ? 'active' : ''}" 
                    onclick="adminApp.filterMenuItems('all')">
                All Items
                <span class="item-count">${allItemsCount}</span>
            </button>
            ${this.categories.map(category => `
                <button class="category-tab ${this.currentCategory === category.id.toString() ? 'active' : ''}" 
                        onclick="adminApp.filterMenuItems('${category.id}')">
                    ${category.name}
                    <span class="item-count">${category.available_items || 0}</span>
                </button>
            `).join('')}
        `;
    }

    populateCategorySelects() {
        const categorySelects = document.querySelectorAll('#itemCategory, #menuItemCategory');
        categorySelects.forEach(select => {
            select.innerHTML = this.categories.map(category => `
                <option value="${category.id}">${category.name}</option>
            `).join('');
        });
    }

    // Menu Items Management
    async loadMenuItems(categoryId = 'all') {
        try {
            const url = categoryId === 'all' 
                ? `${this.API_BASE}/menu-items` 
                : `${this.API_BASE}/menu-items?category_id=${categoryId}`;

            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                this.menuItems = result.data;
                this.renderMenuItems();
                this.renderCategoriesTabs();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to load menu items:', error);
            this.showError('Failed to load menu items');
        }
    }

    renderMenuItems() {
        const container = document.getElementById('menuItemsContainer');
        if (!container) return;

        if (this.menuItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="fas fa-utensils" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                    <h3>No Menu Items</h3>
                    <p>Get started by adding your first menu item.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.menuItems.map(item => `
            <div class="menu-item-admin-card">
                <div class="menu-item-header">
                    <h3 class="menu-item-name">${item.name}</h3>
                    <div class="menu-item-price">$${item.price}</div>
                </div>
                
                <div class="menu-item-description">
                    ${item.description || 'No description available.'}
                </div>
                
                <div class="menu-item-meta">
                    <span>Category: ${item.category_name}</span>
                    <span>Prep: ${item.preparation_time}min</span>
                    <span>Orders: ${item.times_ordered || 0}</span>
                </div>
                
                <div class="menu-item-actions">
                    <button class="menu-item-btn edit" onclick="adminApp.editMenuItem(${item.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="menu-item-btn toggle ${item.is_available ? '' : 'unavailable'}" 
                            onclick="adminApp.toggleMenuItem(${item.id}, ${!item.is_available})">
                        <i class="fas ${item.is_available ? 'fa-eye-slash' : 'fa-eye'}"></i>
                        ${item.is_available ? 'Disable' : 'Enable'}
                    </button>
                    <button class="menu-item-btn delete" onclick="adminApp.deleteMenuItem(${item.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    filterMenuItems(categoryId) {
        this.currentCategory = categoryId;
        this.renderCategoriesTabs();
        this.loadMenuItems(categoryId);
    }

    // Menu Item Modal Functions
    openMenuItemModal(menuItemId = null) {
        const modal = document.getElementById('menuItemModal');
        const title = document.getElementById('menuItemModalTitle');
        const form = document.getElementById('menuItemForm');

        if (menuItemId) {
            // Edit mode
            const menuItem = this.menuItems.find(item => item.id === menuItemId);
            if (menuItem) {
                title.textContent = 'Edit Menu Item';
                document.getElementById('menuItemId').value = menuItem.id;
                document.getElementById('itemName').value = menuItem.name;
                document.getElementById('itemDescription').value = menuItem.description || '';
                document.getElementById('itemPrice').value = menuItem.price;
                document.getElementById('itemCategory').value = menuItem.category_id;
                document.getElementById('itemPrepTime').value = menuItem.preparation_time;
                document.getElementById('itemAvailable').checked = menuItem.is_available;
            }
        } else {
            // Add mode
            title.textContent = 'Add Menu Item';
            form.reset();
            document.getElementById('menuItemId').value = '';
            document.getElementById('itemAvailable').checked = true;
        }

        modal.style.display = 'block';
    }

    closeMenuItemModal() {
        document.getElementById('menuItemModal').style.display = 'none';
    }

    async saveMenuItem() {
        const form = document.getElementById('menuItemForm');
        const formData = new FormData(form);
        const data = {
            name: document.getElementById('itemName').value,
            description: document.getElementById('itemDescription').value,
            price: parseFloat(document.getElementById('itemPrice').value),
            category_id: parseInt(document.getElementById('itemCategory').value),
            preparation_time: parseInt(document.getElementById('itemPrepTime').value) || 15,
            is_available: document.getElementById('itemAvailable').checked
        };

        const menuItemId = document.getElementById('menuItemId').value;
        const url = `${this.API_BASE}/menu-items`;
        const method = menuItemId ? 'PUT' : 'POST';

        if (menuItemId) {
            data.id = parseInt(menuItemId);
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess(menuItemId ? 'Menu item updated successfully' : 'Menu item created successfully');
                this.closeMenuItemModal();
                this.loadMenuItems(this.currentCategory);
                this.loadCategories(); // Refresh categories to update counts
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to save menu item:', error);
            this.showError('Failed to save menu item: ' + error.message);
        }
    }

    editMenuItem(menuItemId) {
        this.openMenuItemModal(menuItemId);
    }

    async toggleMenuItem(menuItemId, isAvailable) {
        try {
            const response = await fetch(`${this.API_BASE}/menu-items`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: menuItemId,
                    is_available: isAvailable
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess(`Menu item ${isAvailable ? 'enabled' : 'disabled'} successfully`);
                this.loadMenuItems(this.currentCategory);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to toggle menu item:', error);
            this.showError('Failed to update menu item');
        }
    }

    async deleteMenuItem(menuItemId) {
        if (!confirm('Are you sure you want to delete this menu item? This action cannot be undone.')) {
            return;
        }

        try {
            // Note: We're using the update endpoint to soft delete by setting is_available to false
            const response = await fetch(`${this.API_BASE}/menu-items`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: menuItemId,
                    is_available: false
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Menu item deleted successfully');
                this.loadMenuItems(this.currentCategory);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to delete menu item:', error);
            this.showError('Failed to delete menu item');
        }
    }

    // Category Modal Functions
    openCategoryModal(categoryId = null) {
        const modal = document.getElementById('categoryModal');
        const title = document.getElementById('categoryModalTitle');

        if (categoryId) {
            // Edit mode
            const category = this.categories.find(cat => cat.id === categoryId);
            if (category) {
                title.textContent = 'Edit Category';
                document.getElementById('categoryId').value = category.id;
                document.getElementById('categoryName').value = category.name;
                document.getElementById('categoryDescription').value = category.description || '';
                document.getElementById('categoryActive').checked = category.is_active;
            }
        } else {
            // Add mode
            title.textContent = 'Add Category';
            document.getElementById('categoryForm').reset();
            document.getElementById('categoryId').value = '';
            document.getElementById('categoryActive').checked = true;
        }

        modal.style.display = 'block';
    }

    closeCategoryModal() {
        document.getElementById('categoryModal').style.display = 'none';
    }

    async saveCategory() {
        const data = {
            name: document.getElementById('categoryName').value,
            description: document.getElementById('categoryDescription').value,
            is_active: document.getElementById('categoryActive').checked
        };

        const categoryId = document.getElementById('categoryId').value;
        const url = `${this.API_BASE}/categories`;
        const method = categoryId ? 'PUT' : 'POST';

        if (categoryId) {
            data.id = parseInt(categoryId);
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess(categoryId ? 'Category updated successfully' : 'Category created successfully');
                this.closeCategoryModal();
                this.loadCategories();
                this.loadMenuItems(this.currentCategory);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to save category:', error);
            this.showError('Failed to save category: ' + error.message);
        }
    }

    // Users Management
    async loadUsers(page = 1) {
        try {
            const offset = (page - 1) * this.usersPerPage;
            const response = await fetch(`${this.API_BASE}/users?limit=${this.usersPerPage}&offset=${offset}`);
            const result = await response.json();

            if (result.success) {
                this.users = result.data;
                this.totalUsers = result.total;
                this.currentPage = page;
                this.renderUsers();
                this.renderUsersPagination();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            this.showError('Failed to load users');
        }
    }

    renderUsers() {
        const tableBody = document.getElementById('usersTableBody');
        const usersCount = document.getElementById('usersCount');

        if (usersCount) {
            usersCount.textContent = `${this.totalUsers} customers`;
        }

        if (!tableBody) return;

        if (this.users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5; display: block;"></i>
                        <p>No customers found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.users.map(user => `
            <tr>
                <td>
                    <strong>${user.full_name}</strong>
                </td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${user.order_count || 0}</td>
                <td>$${parseFloat(user.total_spent || 0).toFixed(2)}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="user-actions">
                        <button class="user-btn edit" onclick="adminApp.editUser(${user.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderUsersPagination() {
        const paginationEl = document.getElementById('usersPagination');
        if (!paginationEl) return;

        const totalPages = Math.ceil(this.totalUsers / this.usersPerPage);
        
        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="adminApp.loadUsers(${this.currentPage - 1})">Previous</button>`;
        }

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === this.currentPage) {
                paginationHTML += `<button class="pagination-btn active">${i}</button>`;
            } else {
                paginationHTML += `<button class="pagination-btn" onclick="adminApp.loadUsers(${i})">${i}</button>`;
            }
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="pagination-btn" onclick="adminApp.loadUsers(${this.currentPage + 1})">Next</button>`;
        }

        paginationEl.innerHTML = paginationHTML;
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const newName = prompt('Enter new full name:', user.full_name);
        const newPhone = prompt('Enter new phone number:', user.phone || '');

        if (newName !== null) {
            this.updateUser(userId, newName, newPhone);
        }
    }

    async updateUser(userId, fullName, phone) {
        try {
            const response = await fetch(`${this.API_BASE}/users`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: userId,
                    full_name: fullName,
                    phone: phone
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('User updated successfully');
                this.loadUsers(this.currentPage);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to update user:', error);
            this.showError('Failed to update user');
        }
    }

    // Staff Management
    async loadStaff() {
        try {
            const response = await fetch(`${this.API_BASE}/staff`);
            const result = await response.json();

            if (result.success) {
                this.staffMembers = result.data;
                this.renderStaff();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to load staff:', error);
            this.showError('Failed to load staff members');
        }
    }

    renderStaff() {
        const staffGrid = document.getElementById('staffGrid');
        if (!staffGrid) return;

        if (this.staffMembers.length === 0) {
            staffGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="fas fa-user-tie" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                    <h3>No Staff Members</h3>
                    <p>Add your first staff member to get started.</p>
                </div>
            `;
            return;
        }

        staffGrid.innerHTML = this.staffMembers.map(staff => `
            <div class="staff-card">
                <div class="staff-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="staff-name">${staff.full_name}</div>
                <div class="staff-role">${staff.role}</div>
                <div class="staff-id">ID: ${staff.staff_id}</div>
                
                <div class="staff-stats">
                    <div class="stat">
                        <span class="stat-value">${staff.actions_count || 0}</span>
                        <span class="stat-label">Actions</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${staff.is_active ? 'Active' : 'Inactive'}</span>
                        <span class="stat-label">Status</span>
                    </div>
                </div>
                
                <div class="staff-actions">
                    <button class="menu-item-btn edit" onclick="adminApp.editStaff(${staff.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="menu-item-btn toggle ${staff.is_active ? '' : 'unavailable'}" 
                            onclick="adminApp.toggleStaff(${staff.id}, ${!staff.is_active})">
                        <i class="fas ${staff.is_active ? 'fa-user-slash' : 'fa-user-check'}"></i>
                        ${staff.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Staff Modal Functions
    openStaffModal(staffId = null) {
        const modal = document.getElementById('staffModal');
        const title = document.getElementById('staffModalTitle');
        const passwordGroup = document.getElementById('staffPasswordGroup');

        if (staffId) {
            // Edit mode
            const staff = this.staffMembers.find(s => s.id === staffId);
            if (staff) {
                title.textContent = 'Edit Staff Member';
                document.getElementById('staffId').value = staff.id;
                document.getElementById('staffStaffId').value = staff.staff_id;
                document.getElementById('staffFullName').value = staff.full_name;
                document.getElementById('staffRole').value = staff.role;
                document.getElementById('staffActive').checked = staff.is_active;
                passwordGroup.style.display = 'none';
            }
        } else {
            // Add mode
            title.textContent = 'Add Staff Member';
            document.getElementById('staffForm').reset();
            document.getElementById('staffId').value = '';
            document.getElementById('staffActive').checked = true;
            passwordGroup.style.display = 'block';
        }

        modal.style.display = 'block';
    }

    closeStaffModal() {
        document.getElementById('staffModal').style.display = 'none';
    }

    async saveStaff() {
        const data = {
            staff_id: document.getElementById('staffStaffId').value,
            full_name: document.getElementById('staffFullName').value,
            role: document.getElementById('staffRole').value,
            is_active: document.getElementById('staffActive').checked
        };

        const staffId = document.getElementById('staffId').value;
        const url = `${this.API_BASE}/staff`;
        const method = staffId ? 'PUT' : 'POST';

        if (staffId) {
            data.id = parseInt(staffId);
        } else {
            data.password = document.getElementById('staffPassword').value;
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess(staffId ? 'Staff member updated successfully' : 'Staff member created successfully');
                this.closeStaffModal();
                this.loadStaff();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to save staff member:', error);
            this.showError('Failed to save staff member: ' + error.message);
        }
    }

    editStaff(staffId) {
        this.openStaffModal(staffId);
    }

    async toggleStaff(staffId, isActive) {
        try {
            const staff = this.staffMembers.find(s => s.id === staffId);
            if (!staff) return;

            const response = await fetch(`${this.API_BASE}/staff`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: staffId,
                    staff_id: staff.staff_id,
                    full_name: staff.full_name,
                    role: staff.role,
                    is_active: isActive
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess(`Staff member ${isActive ? 'activated' : 'deactivated'} successfully`);
                this.loadStaff();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to toggle staff member:', error);
            this.showError('Failed to update staff member');
        }
    }

    // Utility Functions
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type = 'info') {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            font-weight: 500;
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(messageEl);
        
        // Remove message after 5 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    async exportData(type) {
        this.showMessage(`Preparing ${type} export...`, 'info');
        // In a real application, this would generate and download a CSV or PDF
        setTimeout(() => {
            this.showSuccess(`${type} export completed!`);
        }, 2000);
    }

    async generateReport() {
        this.showMessage('Generating business report...', 'info');
        // In a real application, this would generate a comprehensive report
        setTimeout(() => {
            this.showSuccess('Business report generated successfully!');
        }, 3000);
    }

    logout() {
        localStorage.removeItem('sunrise_admin');
        localStorage.removeItem('sunrise_admin_token');
        window.location.href = 'login.html';
    }
}

// Initialize the admin app
const adminApp = new AdminApp();