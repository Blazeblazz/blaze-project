// API base URL - Update this with your actual backend URL
const API_BASE_URL = 'http://localhost:5000/api';

// DOM Elements
const loginForm = document.getElementById('adminLoginForm');
const adminDashboard = document.getElementById('adminDashboard');
const loginFormContainer = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const ordersTableBody = document.getElementById('ordersTableBody');
const orderDetailsModal = document.getElementById('orderDetailsModal');
const orderDetailsContent = document.getElementById('orderDetails');
const closeModalBtn = document.querySelector('.close-modal');

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    
    if (token) {
        // Verify token with server
        verifyToken(token);
    } else {
        showLoginForm();
    }
    
    // Event Listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Close modal when clicking the close button
    document.querySelector('.close-modal')?.addEventListener('click', function() {
        document.getElementById('orderDetailsModal').style.display = 'none';
    });

    // Close modal when clicking outside the modal content
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('orderDetailsModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Make functions available globally
    window.viewOrderDetails = viewOrderDetails;
    window.updateOrderStatus = updateOrderStatus;
});

// Verify if token is valid
async function verifyToken(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            showDashboard(user);
            fetchOrders();
        } else {
            throw new Error('Invalid token');
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('token');
        showLoginForm();
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Show loading state
    const loginBtn = document.querySelector('#adminLoginForm button[type="submit"]');
    const originalBtnText = loginBtn.innerHTML;
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
        console.log('Attempting to log in with:', { email });
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include', // Important for cookies
            body: JSON.stringify({ email, password })
        });
        
        console.log('Login response status:', response.status);
        
        let data;
        try {
            data = await response.json();
            console.log('Login response data:', data);
        } catch (jsonError) {
            console.error('Error parsing JSON response:', jsonError);
            throw new Error('Invalid server response');
        }
        
        if (!response.ok) {
            throw new Error(data.message || `Login failed with status ${response.status}`);
        }
        
        if (!data.token) {
            throw new Error('No authentication token received');
        }
        
        // Save token and user data
        localStorage.setItem('token', data.token);
        
        // Get user data
        const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
            headers: {
                'Authorization': `Bearer ${data.token}`
            }
        });
        
        if (userResponse.ok) {
            const user = await userResponse.json();
            showDashboard(user);
            fetchOrders();
        } else {
            throw new Error('Failed to fetch user data');
        }
    } catch (error) {
        alert(error.message || 'Login failed. Please try again.');
        console.error('Login error:', error);
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('token');
    showLoginForm();
}

// Show login form
function showLoginForm() {
    if (loginFormContainer) loginFormContainer.style.display = 'block';
    if (adminDashboard) adminDashboard.style.display = 'none';
    if (loginForm) loginForm.reset();
}

// Show dashboard
function showDashboard(user) {
    console.log('Showing dashboard for user:', user);
    // Hide login form, show dashboard
    if (loginFormContainer) loginFormContainer.style.display = 'none';
    if (adminDashboard) adminDashboard.style.display = 'block';
    
    // Display user email
    const adminEmailElement = document.getElementById('adminEmail');
    if (adminEmailElement) {
        adminEmailElement.textContent = user.email;
    }
    
    // Load orders
    fetchOrders();
}

// Fetch orders from API
async function fetchOrders() {
    console.log('Fetching orders...');
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No token found, showing login form');
        showLoginForm();
        return;
    }
    
    try {
        console.log('Making request to:', `${API_BASE_URL}/orders`);
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        console.log('Orders response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log('Unauthorized, removing token and showing login');
                localStorage.removeItem('token');
                showLoginForm();
                return;
            }
            const errorData = await response.json().catch(() => ({}));
            console.error('Error response:', errorData);
            throw new Error(errorData.message || `Failed to fetch orders: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Orders data:', data);
        
        if (data && Array.isArray(data.data)) {
            renderOrders(data.data);
            updateOrderStats(data.data);
        } else {
            console.error('Invalid orders data format:', data);
            renderOrders([]);
            updateOrderStats([]);
        }
        
    } catch (error) {
        console.error('Error in fetchOrders:', error);
        alert(`Failed to load orders: ${error.message}`);
        // Still try to render empty orders to avoid UI breaking
        renderOrders([]);
        updateOrderStats([]);
    }
}

// Render orders in the table
function renderOrders(orders) {
    if (!ordersTableBody) return;
    
    if (!Array.isArray(orders) || orders.length === 0) {
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No orders found</td>
            </tr>`;
        return;
    }
    
    // Sort orders by date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    ordersTableBody.innerHTML = orders.map(order => `
        <tr>
            <td>${order._id.substring(0, 8)}...</td>
            <td>${order.shippingAddress?.name || 'N/A'}</td>
            <td>${order.shippingAddress?.phone || 'N/A'}</td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>${order.totalPrice?.toFixed(2)} DH</td>
            <td>
                <span class="status-badge ${order.status}">
                    ${formatStatus(order.status)}
                </span>
            </td>
            <td class="actions">
                <button class="btn-view" onclick="viewOrderDetails('${order._id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <select class="status-select" onchange="updateOrderStatus('${order._id}', this.value)">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
        </tr>
    `).join('');
}

// Format status for display
function formatStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

// Update order statistics
function updateOrderStats(orders) {
    if (!Array.isArray(orders)) return;
    
    const totalOrders = document.getElementById('totalOrders');
    const pendingOrders = document.getElementById('pendingOrders');
    const completedOrders = document.getElementById('completedOrders');
    
    if (totalOrders) totalOrders.textContent = orders.length;
    if (pendingOrders) {
        pendingOrders.textContent = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    }
    if (completedOrders) {
        completedOrders.textContent = orders.filter(o => o.status === 'delivered').length;
    }
}

// View order details
async function viewOrderDetails(orderId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showLoginForm();
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                showLoginForm();
                return;
            }
            throw new Error('Failed to fetch order details');
        }
        
        const order = await response.json();
        
        // Format order items
        const itemsHtml = order.orderItems.map(item => `
            <div class="order-item">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>Quantity: ${item.quantity}</p>
                    ${item.color ? `<p>Color: ${item.color}</p>` : ''}
                    ${item.size ? `<p>Size: ${item.size}</p>` : ''}
                    <p>Price: ${item.price} DH × ${item.quantity} = ${(item.price * item.quantity).toFixed(2)} DH</p>
                </div>
            </div>
        `).join('');
        
        // Format order details
        orderDetailsContent.innerHTML = `
            <div class="order-details-container">
                <div class="order-header">
                    <h3>Order #${order._id.substring(0, 8)}</h3>
                    <span class="status-badge ${order.status}">${formatStatus(order.status)}</span>
                </div>
                
                <div class="order-info">
                    <div class="info-section">
                        <h4>Customer Information</h4>
                        <p><strong>Name:</strong> ${order.shippingAddress?.name || 'N/A'}</p>
                        <p><strong>Phone:</strong> ${order.shippingAddress?.phone || 'N/A'}</p>
                        <p><strong>Email:</strong> ${order.user?.email || 'N/A'}</p>
                    </div>
                    
                    <div class="info-section">
                        <h4>Shipping Address</h4>
                        <p>${order.shippingAddress?.address || 'N/A'}</p>
                        <p>${order.shippingAddress?.city || ''} ${order.shippingAddress?.postalCode || ''}</p>
                        <p>${order.shippingAddress?.country || ''}</p>
                    </div>
                    
                    <div class="info-section">
                        <h4>Order Summary</h4>
                        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                        ${order.paidAt ? `<p><strong>Paid On:</strong> ${new Date(order.paidAt).toLocaleString()}</p>` : ''}
                        ${order.deliveredAt ? `<p><strong>Delivered On:</strong> ${new Date(order.deliveredAt).toLocaleString()}</p>` : ''}
                    </div>
                </div>
                
                <div class="order-items">
                    <h4>Order Items</h4>
                    ${itemsHtml}
                </div>
                
                <div class="order-totals">
                    <div class="total-row">
                        <span>Items Total:</span>
                        <span>${order.itemsPrice?.toFixed(2)} DH</span>
                    </div>
                    <div class="total-row">
                        <span>Shipping:</span>
                        <span>${order.shippingPrice?.toFixed(2)} DH</span>
                    </div>
                    <div class="total-row">
                        <span>Tax:</span>
                        <span>${order.taxPrice?.toFixed(2)} DH</span>
                    </div>
                    <div class="total-row total-amount">
                        <span>Total:</span>
                        <span>${order.totalPrice?.toFixed(2)} DH</span>
                    </div>
                </div>
            </div>
        `;
        
        orderDetailsModal.style.display = 'block';
    } catch (error) {
        console.error('Error fetching order details:', error);
        alert('Failed to load order details. Please try again.');
    }
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    if (!confirm(`Are you sure you want to update this order's status to "${formatStatus(newStatus)}"?`)) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showLoginForm();
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                showLoginForm();
                return;
            }
            throw new Error('Failed to update order status');
        }
        
        // Refresh orders
        fetchOrders();
        
        // Show success message
        alert(`Order status updated to: ${formatStatus(newStatus)}`);
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Failed to update order status. Please try again.');
    }
}

// Make functions available globally
window.viewOrderDetails = viewOrderDetails;
window.updateOrderStatus = updateOrderStatus;
