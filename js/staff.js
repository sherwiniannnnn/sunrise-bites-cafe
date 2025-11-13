class StaffApp {
    constructor() {
        this.currentStaff = null;
        this.orders = [];
        this.kitchenOrders = [];
        this.completedOrders = [];
        this.currentModalOrder = null;
        this.API_BASE = '/.netlify/functions';
        
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadOrders();
        this.loadKitchenOrders();
        this.loadCompletedOrders();
        this.setupAutoRefresh();
    }

    checkAuthentication() {
        const staffData = localStorage.getItem('sunrise_staff');
        if (staffData) {
            this.currentStaff = JSON.parse(staffData);
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

        // Order filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterOrders(e.target.dataset.status);
            });
        });

        // Time filter for completed orders
        document.getElementById('timeFilter')?.addEventListener('change', (e) => {
            this.loadCompletedOrders(e.target.value);
        });

        // Modal
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal when clicking outside
        document.getElementById('orderModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'orderModal') {
                this.closeModal();
            }
        });

        // Status update buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('status-btn')) {
                this.updateOrderStatus(e.target.dataset.status);
            }
        });

        // View order details
        document.addEventListener('click', (e) => {
            if (e.target.closest('.action-btn.view')) {
                const orderCard = e.target.closest('.order-card');
                const orderId = orderCard?.dataset.orderId;
                if (orderId) {
                    this.viewOrderDetails(parseInt(orderId));
                }
            }
        });
    }

    updateUI() {
        // Update staff name and role
        const staffNameEl = document.getElementById('staffName');
        const staffRoleEl = document.getElementById('staffRole');
        
        if (staffNameEl && this.currentStaff) {
            staffNameEl.textContent = this.currentStaff.full_name;
        }
        
        if (staffRoleEl && this.currentStaff) {
            staffRoleEl.textContent = `${this.currentStaff.role.charAt(0).toUpperCase() + this.currentStaff.role.slice(1)} Dashboard`;
        }
    }

    async loadOrders(status = 'all') {
        const ordersContainer = document.getElementById('ordersContainer');
        if (!ordersContainer) return;

        try {
            ordersContainer.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading orders...</p>
                </div>
            `;

            const url = status === 'all' 
                ? `${this.API_BASE}/staff-orders` 
                : `${this.API_BASE}/staff-orders?status=${status}`;

            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                this.orders = result.data;
                this.renderOrders();
                this.updateStats();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to load orders:', error);
            ordersContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load orders. Please try again later.</p>
                </div>
            `;
        }
    }

    renderOrders() {
        const ordersContainer = document.getElementById('ordersContainer');
        if (!ordersContainer) return;

        if (this.orders.length === 0) {
            ordersContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No Orders Found</h3>
                    <p>There are no orders matching the current filter.</p>
                </div>
            `;
            return;
        }

        ordersContainer.innerHTML = this.orders.map(order => {
            const items = order.items || [];
            const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
            const orderTime = new Date(order.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="order-card" data-order-id="${order.id}">
                    <div class="order-card-header">
                        <div class="order-info-left">
                            <h4>Order #${order.order_number}</h4>
                            <div class="order-meta">
                                <span><i class="fas fa-user"></i> ${order.customer_name || 'Guest'}</span>
                                <span><i class="fas fa-clock"></i> ${orderTime}</span>
                                <span><i class="fas fa-utensils"></i> ${totalItems} items</span>
                            </div>
                        </div>
                        <div class="order-status-badge status-${order.status}">
                            ${order.status}
                        </div>
                    </div>
                    
                    <div class="order-items-preview">
                        ${items.slice(0, 3).map(item => `
                            <div class="order-item-preview">
                                <span>${item.quantity}x ${item.name}</span>
                                <span>$${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                        ${items.length > 3 ? `<div class="more-items">+${items.length - 3} more items</div>` : ''}
                    </div>
                    
                    <div class="order-actions">
                        <button class="action-btn view">View Details</button>
                        <button class="action-btn update">Update Status</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterOrders(status) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.status === status) {
                btn.classList.add('active');
            }
        });

        this.loadOrders(status === 'all' ? 'all' : status);
    }

    async loadKitchenOrders() {
        const kitchenContainer = document.getElementById('kitchenContainer');
        if (!kitchenContainer) return;

        try {
            const response = await fetch(`${this.API_BASE}/kitchen-orders`);
            const result = await response.json();

            if (result.success) {
                this.kitchenOrders = result.data;
                this.renderKitchenOrders();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to load kitchen orders:', error);
            kitchenContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load kitchen orders.</p>
                </div>
            `;
        }
    }

    renderKitchenOrders() {
        const kitchenContainer = document.getElementById('kitchenContainer');
        if (!kitchenContainer) return;

        if (this.kitchenOrders.length === 0) {
            kitchenContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-utensils"></i>
                    <h3>Kitchen is Clear</h3>
                    <p>No orders currently in preparation.</p>
                </div>
            `;
            return;
        }

        kitchenContainer.innerHTML = this.kitchenOrders.map(order => {
            const orderTime = new Date(order.created_at);
            const timeDiff = Math.floor((new Date() - orderTime) / 60000); // minutes
            const estimatedReady = order.estimated_ready_time ? new Date(order.estimated_ready_time) : null;

            return `
                <div class="kitchen-order-card">
                    <div class="kitchen-order-header">
                        <h4>Order #${order.order_number}</h4>
                        <div class="kitchen-timer">
                            <i class="fas fa-clock"></i>
                            <span>${timeDiff}m ago</span>
                            ${estimatedReady ? `<span>• Ready in ${Math.max(0, Math.floor((estimatedReady - new Date()) / 60000))}m</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="kitchen-items-by-category">
                        ${Object.entries(order.items_by_category || {}).map(([category, items]) => `
                            <div class="kitchen-category">
                                <h5>${category}</h5>
                                <div class="kitchen-category-items">
                                    ${items.map(item => `
                                        <div class="kitchen-item">
                                            <div class="kitchen-item-info">
                                                <span class="item-quantity-badge">${item.quantity}</span>
                                                <span>${item.name}</span>
                                            </div>
                                            <div class="kitchen-item-actions">
                                                <button class="kitchen-btn start" onclick="staffApp.startItem(${order.id}, ${item.menu_item_id})">
                                                    Start
                                                </button>
                                                <button class="kitchen-btn complete" onclick="staffApp.completeItem(${order.id}, ${item.menu_item_id})">
                                                    Complete
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="kitchen-order-actions" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                        <button class="action-btn ready" onclick="staffApp.updateOrderStatus(${order.id}, 'ready')">
                            Mark as Ready
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadCompletedOrders(hours = 24) {
        const completedContainer = document.getElementById('completedContainer');
        if (!completedContainer) return;

        try {
            const response = await fetch(`${this.API_BASE}/completed-orders?hours=${hours}`);
            const result = await response.json();

            if (result.success) {
                this.completedOrders = result.data;
                this.renderCompletedOrders();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to load completed orders:', error);
            completedContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load completed orders.</p>
                </div>
            `;
        }
    }

    renderCompletedOrders() {
        const completedContainer = document.getElementById('completedContainer');
        if (!completedContainer) return;

        if (this.completedOrders.length === 0) {
            completedContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <h3>No Completed Orders</h3>
                    <p>No orders have been completed in the selected time period.</p>
                </div>
            `;
            return;
        }

        completedContainer.innerHTML = this.completedOrders.map(order => {
            const completionTime = order.completed_time ? new Date(order.completed_time) : new Date(order.updated_at);
            const timeAgo = this.getTimeAgo(completionTime);
            const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

            return `
                <div class="completed-order-card">
                    <div class="completed-order-header">
                        <h5>Order #${order.order_number}</h5>
                        <span class="completion-time">${timeAgo}</span>
                    </div>
                    <div class="completed-items">
                        <div><strong>Customer:</strong> ${order.customer_name || 'Guest'}</div>
                        <div><strong>Items:</strong> ${totalItems}</div>
                        <div><strong>Total:</strong> $${order.total_amount}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async viewOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId) || 
                     this.kitchenOrders.find(o => o.id === orderId) ||
                     this.completedOrders.find(o => o.id === orderId);
        
        if (!order) {
            alert('Order not found');
            return;
        }

        this.currentModalOrder = order;
        this.openModal(order);
    }

    openModal(order) {
        // Populate modal with order details
        document.getElementById('modalOrderNumber').textContent = order.order_number;
        document.getElementById('modalCustomerName').textContent = order.customer_name || 'Guest';
        document.getElementById('modalCustomerPhone').textContent = order.customer_phone || 'N/A';
        document.getElementById('modalOrderTime').textContent = new Date(order.created_at).toLocaleString();
        document.getElementById('modalTotalAmount').textContent = `$${order.total_amount}`;
        
        // Populate order items
        const itemsContainer = document.getElementById('modalOrderItems');
        itemsContainer.innerHTML = (order.items || []).map(item => `
            <div class="modal-order-item">
                <span>${item.quantity}x ${item.name}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `).join('');

        // Special instructions
        document.getElementById('modalInstructions').textContent = 
            order.special_instructions || 'None';

        // Show modal
        document.getElementById('orderModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('orderModal').style.display = 'none';
        this.currentModalOrder = null;
    }

    async updateOrderStatus(newStatus) {
        if (!this.currentModalOrder) return;

        const notes = document.getElementById('statusNotes').value;
        const staffId = this.currentStaff?.staff_id;

        try {
            const response = await fetch(`${this.API_BASE}/update-order-status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId: this.currentModalOrder.id,
                    status: newStatus,
                    staffId: staffId,
                    notes: notes
                })
            });

            const result = await response.json();

            if (result.success) {
                alert(`Order status updated to ${newStatus}`);
                this.closeModal();
                
                // Refresh all data
                this.loadOrders();
                this.loadKitchenOrders();
                this.loadCompletedOrders();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to update order status:', error);
            alert('Failed to update order status: ' + error.message);
        }
    }

    updateStats() {
        const statsGrid = document.getElementById('statsGrid');
        if (!statsGrid) return;

        const pendingCount = this.orders.filter(o => o.status === 'pending').length;
        const preparingCount = this.orders.filter(o => o.status === 'preparing').length;
        const readyCount = this.orders.filter(o => o.status === 'ready').length;
        const totalRevenue = this.completedOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

        statsGrid.innerHTML = `
            <div class="stat-card">
                <span class="stat-number">${this.orders.length}</span>
                <span class="stat-label">Total Active</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${pendingCount}</span>
                <span class="stat-label">Pending</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${preparingCount}</span>
                <span class="stat-label">Preparing</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${readyCount}</span>
                <span class="stat-label">Ready</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">$${totalRevenue.toFixed(0)}</span>
                <span class="stat-label">Revenue (24h)</span>
            </div>
        `;
    }

    setupAutoRefresh() {
    // Refresh orders every 15 seconds (was 30)
    setInterval(() => {
        this.loadOrders();
        this.loadKitchenOrders();
    }, 15000);

    // Refresh completed orders every minute (was 2 minutes)
    setInterval(() => {
        this.loadCompletedOrders();
    }, 60000);
}

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    logout() {
        localStorage.removeItem('sunrise_staff');
        localStorage.removeItem('sunrise_staff_token');
        window.location.href = 'login.html';
    }
}

// Update staff login in auth.js
const staffApp = new StaffApp();