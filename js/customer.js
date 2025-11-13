class CustomerApp {
    constructor() {
        this.currentUser = null;
        this.cart = [];
        this.menuData = [];
        this.orders = [];
        this.API_BASE = '/.netlify/functions';
        
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadMenu();
        this.loadOrders();
    }

    checkAuthentication() {
        const userData = localStorage.getItem('sunrise_customer');
        if (userData) {
            this.currentUser = JSON.parse(userData);
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

        // Cart
        document.getElementById('cartFloatingBtn')?.addEventListener('click', () => {
            this.toggleCart();
        });

        document.getElementById('closeCart')?.addEventListener('click', () => {
            this.toggleCart();
        });

        document.getElementById('clearCartBtn')?.addEventListener('click', () => {
            this.clearCart();
        });

        document.getElementById('checkoutBtn')?.addEventListener('click', () => {
            this.checkout();
        });

        // Menu filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterMenu(e.target.dataset.category);
            });
        });

        // Close cart when clicking outside
        document.addEventListener('click', (e) => {
            const cartSidebar = document.getElementById('cartSidebar');
            const cartBtn = document.getElementById('cartFloatingBtn');
            if (cartSidebar?.classList.contains('open') && 
                !cartSidebar.contains(e.target) && 
                !cartBtn.contains(e.target)) {
                this.toggleCart();
            }
        });
    }

    updateUI() {
        // Update user name
        const userNameEl = document.getElementById('userName');
        if (userNameEl && this.currentUser) {
            userNameEl.textContent = this.currentUser.full_name || 'Customer';
        }

        // Update cart count
        this.updateCartCount();
    }

    async loadMenu() {
        const menuContainer = document.getElementById('menuContainer');
        if (!menuContainer) return;

        try {
            menuContainer.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading menu...</p>
                </div>
            `;

            const response = await fetch(`${this.API_BASE}/menu`);
            const result = await response.json();

            if (result.success) {
                this.menuData = result.data;
                this.renderMenu();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to load menu:', error);
            menuContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load menu. Please try again later.</p>
                </div>
            `;
        }
    }

    renderMenu() {
        const menuContainer = document.getElementById('menuContainer');
        if (!menuContainer) return;

        if (this.menuData.length === 0) {
            menuContainer.innerHTML = '<p>No menu items available.</p>';
            return;
        }

        menuContainer.innerHTML = this.menuData.map(category => `
            <div class="menu-category" data-category="${category.id}">
                <div class="category-header">
                    <h3>${category.name}</h3>
                    <p>${category.description}</p>
                </div>
                <div class="menu-items-grid">
                    ${category.items.map(item => `
                        <div class="menu-item-card">
                            <div class="item-image-placeholder">
                                <i class="fas fa-utensils"></i>
                            </div>
                            <div class="item-details">
                                <h4>${item.name}</h4>
                                <p>${item.description}</p>
                                <div class="item-price">$${item.price}</div>
                                <div class="item-actions">
                                    <div class="quantity-controls">
                                        <button class="quantity-btn minus" onclick="customerApp.decreaseQuantity(${item.id})" disabled>
                                            <i class="fas fa-minus"></i>
                                        </button>
                                        <span class="quantity-display" id="quantity-${item.id}">0</span>
                                        <button class="quantity-btn plus" onclick="customerApp.increaseQuantity(${item.id})">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </div>
                                    <button class="add-to-cart-btn" onclick="customerApp.addToCart(${item.id})" id="add-btn-${item.id}">
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    filterMenu(categoryId) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === categoryId) {
            btn.classList.add('active');
        }
    });

    const categories = document.querySelectorAll('.menu-category');
    
    categories.forEach(category => {
        if (categoryId === 'all' || category.dataset.category === categoryId) {
            category.style.display = 'block';
        } else {
            category.style.display = 'none';
        }
    });
}

    increaseQuantity(itemId) {
        const item = this.findMenuItem(itemId);
        if (!item) return;

        const currentQty = this.getCartQuantity(itemId);
        this.updateQuantity(itemId, currentQty + 1);
    }

    decreaseQuantity(itemId) {
        const currentQty = this.getCartQuantity(itemId);
        if (currentQty > 0) {
            this.updateQuantity(itemId, currentQty - 1);
        }
    }

    updateQuantity(itemId, newQuantity) {
        const quantityDisplay = document.getElementById(`quantity-${itemId}`);
        const minusBtn = quantityDisplay?.previousElementSibling;
        const addBtn = document.getElementById(`add-btn-${itemId}`);

        if (newQuantity === 0) {
            // Remove from cart
            this.cart = this.cart.filter(item => item.menuItemId !== itemId);
            if (addBtn) {
                addBtn.textContent = 'Add to Cart';
                addBtn.classList.remove('added');
            }
        } else {
            // Update or add to cart
            const existingItem = this.cart.find(item => item.menuItemId === itemId);
            if (existingItem) {
                existingItem.quantity = newQuantity;
            } else {
                const item = this.findMenuItem(itemId);
                if (item) {
                    this.cart.push({
                        menuItemId: itemId,
                        name: item.name,
                        price: item.price,
                        quantity: newQuantity
                    });
                }
            }

            if (addBtn && newQuantity > 0) {
                addBtn.textContent = 'Added ✓';
                addBtn.classList.add('added');
            }
        }

        // Update UI
        if (quantityDisplay) quantityDisplay.textContent = newQuantity;
        if (minusBtn) minusBtn.disabled = newQuantity === 0;

        this.updateCart();
        this.saveCart();
    }

    addToCart(itemId) {
        this.updateQuantity(itemId, 1);
    }

    getCartQuantity(itemId) {
        const item = this.cart.find(item => item.menuItemId === itemId);
        return item ? item.quantity : 0;
    }

    findMenuItem(itemId) {
        for (const category of this.menuData) {
            const item = category.items.find(item => item.id === itemId);
            if (item) return item;
        }
        return null;
    }

    updateCart() {
        this.updateCartCount();
        this.renderCartItems();
    }

    updateCartCount() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
        }
    }

    renderCartItems() {
        const cartItems = document.getElementById('cartItems');
        if (!cartItems) return;

        if (this.cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
            return;
        }

        cartItems.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h5>${item.name}</h5>
                    <p>$${item.price} each</p>
                </div>
                <div class="cart-item-actions">
                    <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" onclick="customerApp.decreaseQuantity(${item.menuItemId})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn plus" onclick="customerApp.increaseQuantity(${item.menuItemId})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="remove-item" onclick="customerApp.removeFromCart(${item.menuItemId})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Update total
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        document.getElementById('cartTotal').textContent = total.toFixed(2);
    }

    removeFromCart(itemId) {
        this.updateQuantity(itemId, 0);
    }

    toggleCart() {
        const cartSidebar = document.getElementById('cartSidebar');
        if (cartSidebar) {
            cartSidebar.classList.toggle('open');
        }
    }

    clearCart() {
        // Reset all quantities to 0
        this.cart.forEach(item => {
            this.updateQuantity(item.menuItemId, 0);
        });
        this.cart = [];
        this.updateCart();
        this.saveCart();
    }

    async checkout() {
        if (this.cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    if (!this.currentUser) {
        alert('Please log in to place an order.');
        return;
    }

    try {
        const totalAmount = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const orderData = {
            userId: this.currentUser.id,
            items: this.cart,
            totalAmount: totalAmount,
            specialInstructions: ''
        };

        // Update this line to use the correct endpoint
        const response = await fetch(`${this.API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (result.success) {
            alert('Order placed successfully! Your order number is: ' + result.order.orderNumber);
            this.clearCart();
            this.toggleCart();
            this.loadOrders();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Checkout failed:', error);
        alert('Failed to place order. Please try again.');
        }
    }

    async loadOrders() {
    const ordersContainer = document.getElementById('ordersContainer');
    if (!ordersContainer || !this.currentUser) return;

    try {
        const response = await fetch(`${this.API_BASE}/orders?userId=${this.currentUser.id}`);
        const result = await response.json();

        if (result.success) {
            this.orders = result.data;
            this.renderOrders();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Failed to load orders:', error);
        ordersContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load orders.</p>
            </div>
        `;
    }
}

    renderOrders() {
        const ordersContainer = document.getElementById('ordersContainer');
        if (!ordersContainer) return;

        if (this.orders.length === 0) {
            ordersContainer.innerHTML = '<p>No orders yet. Place your first order above!</p>';
            return;
        }

        ordersContainer.innerHTML = this.orders.map(order => {
            const statusClass = `status-${order.status}`;
            const items = order.items || [];
            const orderTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            return `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <div class="order-number">Order #${order.order_number}</div>
                            <div class="order-date">${new Date(order.created_at).toLocaleDateString()}</div>
                        </div>
                        <span class="order-status ${statusClass}">${order.status}</span>
                    </div>
                    <div class="order-items">
                        ${items.map(item => `
                            <div class="order-item">
                                <span>${item.quantity}x ${item.name}</span>
                                <span>$${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="order-total">Total: $${orderTotal.toFixed(2)}</div>
                </div>
            `;
        }).join('');
    }

    saveCart() {
        localStorage.setItem('sunrise_cart', JSON.stringify(this.cart));
    }

    loadCart() {
        const savedCart = localStorage.getItem('sunrise_cart');
        if (savedCart) {
            this.cart = JSON.parse(savedCart);
            this.updateCart();
            
            // Update quantities in menu
            this.cart.forEach(item => {
                this.updateQuantity(item.menuItemId, item.quantity);
            });
        }
    }

    logout() {
        localStorage.removeItem('sunrise_customer');
        localStorage.removeItem('sunrise_cart');
        window.location.href = 'login.html';
    }
}

// Update auth.js to redirect to dashboard
const customerApp = new CustomerApp();