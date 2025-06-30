document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS
    AOS.init({
        once: true,
        duration: 800,
        offset: 120
    });

    // Get all "Acheter" buttons
    const buyButtons = document.querySelectorAll('.btn.small');
    
    // Add click event to each button
    buyButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Close any other open dropdowns
            document.querySelectorAll('.product-options').forEach(dropdown => {
                if (dropdown !== this.nextElementSibling) {
                    dropdown.remove();
                }
            });
            
            // Find the product card
            const productCard = this.closest('.product-card');
            
            // Find or create options container
            let optionsContainer = productCard.querySelector('.product-options');
            
            if (!optionsContainer) {
                // Create options container if it doesn't exist
                optionsContainer = document.createElement('div');
                optionsContainer.className = 'product-options';
                
                // Add options HTML with new color picker
                optionsContainer.innerHTML = `
                    <div class="option-group">
                        <label>Couleur</label>
                        <div class="color-options">
                            <div class="color-option black selected" data-color="noir" title="Noir"></div>
                            <div class="color-option white" data-color="blanc" title="Blanc"></div>
                        </div>
                    </div>
                    <div class="option-group">
                        <label>Quantité</label>
                        <div class="quantity-selector">
                            <button type="button" class="quantity-btn minus" aria-label="Reduce quantity">−</button>
                            <input type="number" class="quantity-input" value="1" min="1" aria-label="Quantity">
                            <button type="button" class="quantity-btn plus" aria-label="Increase quantity">+</button>
                        </div>
                    </div>
                    <button type="button" class="checkout-btn">
                        <span>Payez à la livraison</span>
                    </button>
                `;
                
                // Insert after the button
                this.parentNode.insertBefore(optionsContainer, this.nextSibling);
                
                // Add event listeners for color options
                const colorOptions = optionsContainer.querySelectorAll('.color-option');
                colorOptions.forEach(option => {
                    option.addEventListener('click', function() {
                        colorOptions.forEach(opt => opt.classList.remove('selected'));
                        this.classList.add('selected');
                    });
                });
                
                // Add event listeners for quantity buttons
                const minusBtn = optionsContainer.querySelector('.minus');
                const plusBtn = optionsContainer.querySelector('.plus');
                const quantityInput = optionsContainer.querySelector('.quantity-input');
                
                minusBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const currentValue = parseInt(quantityInput.value);
                    if (currentValue > 1) {
                        quantityInput.value = currentValue - 1;
                    }
                    quantityInput.dispatchEvent(new Event('change'));
                });
                
                plusBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const currentValue = parseInt(quantityInput.value);
                    quantityInput.value = currentValue + 1;
                    quantityInput.dispatchEvent(new Event('change'));
                });
                
                // Prevent form submission when pressing enter in quantity input
                quantityInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                    }
                });
                
                // Handle checkout button click
                const checkoutBtn = optionsContainer.querySelector('.checkout-btn');
                checkoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    // Get product details
                    const productName = productCard.querySelector('h3').textContent;
                    const productPrice = productCard.querySelector('.sale').textContent;
                    const color = optionsContainer.querySelector('.color-option.selected').dataset.color;
                    const quantity = parseInt(quantityInput.value);
                    const price = parseInt(productPrice);
                    const total = price * quantity;
                    
                    // Show checkout popup
                    showCheckoutPopup({
                        name: productName,
                        color: color,
                        quantity: quantity,
                        price: price,
                        total: total
                    });
                });
                
                // Add click outside to close
                const closeOptions = (e) => {
                    if (!productCard.contains(e.target) && !e.target.matches('.btn.small')) {
                        optionsContainer.remove();
                        document.removeEventListener('click', closeOptions);
                    }
                };
                
                // Small delay to prevent immediate close
                setTimeout(() => {
                    document.addEventListener('click', closeOptions);
                }, 10);
                
                // Show the options with animation
                setTimeout(() => optionsContainer.classList.add('active'), 10);
                
            } else {
                // Toggle options container
                optionsContainer.classList.toggle('active');
                
                // If closing, remove the container after animation
                if (!optionsContainer.classList.contains('active')) {
                    setTimeout(() => {
                        optionsContainer.remove();
                    }, 300);
                }
            }
        });
    });
    
    // Close checkout popup when clicking outside
    document.addEventListener('click', (e) => {
        const popup = document.getElementById('checkoutPopup');
        const popupContent = document.querySelector('.checkout-container');
        
        if (popup && popup.style.display === 'block' && !popupContent.contains(e.target) && !e.target.matches('.checkout-btn')) {
            closeCheckoutPopup();
        }
    });
    
    // Close button for checkout popup
    const closeBtn = document.querySelector('.close-checkout');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCheckoutPopup);
    }
    
    // Handle checkout form submission
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const orderData = {
                customerName: formData.get('fullName'),
                city: formData.get('city'),
                phone: formData.get('phone'),
                items: currentOrderItems || [],
                totalAmount: currentOrderItems.reduce((sum, item) => sum + item.total, 0)
            };
            
            try {
                // Send order to backend
                const response = await fetch('/api/v1/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    alert('Commande passée avec succès! Nous vous contacterons bientôt pour confirmer.');
                    console.log('Order submitted successfully:', result.data.order);
                } else {
                    throw new Error(result.message || 'Failed to submit order');
                }
                
            } catch (error) {
                console.error('Error submitting order:', error);
                alert('Erreur lors de la soumission de la commande. Veuillez réessayer.');
                return;
            }
            
            // Close popup and reset form
            closeCheckoutPopup();
            this.reset();
        });
    }
});

// Global variable to store current order items
let currentOrderItems = [];

// Function to show checkout popup with order details
function showCheckoutPopup(product) {
    const popup = document.getElementById('checkoutPopup');
    const orderItemsContainer = document.querySelector('.order-items');
    const subtotalElement = document.querySelector('.subtotal');
    const totalElement = document.querySelector('.total-amount');
    
    // Store current order item
    currentOrderItems = [{
        name: product.name,
        color: product.color,
        quantity: product.quantity,
        price: product.price,
        total: product.total
    }];
    
    // Update order items in the popup
    orderItemsContainer.innerHTML = `
        <div class="order-item">
            <div class="order-item-details">
                <div class="order-item-title">${product.name}</div>
                <div class="order-item-variant">Couleur: ${product.color.charAt(0).toUpperCase() + product.color.slice(1)}</div>
                <div class="order-item-variant">Quantité: ${product.quantity}</div>
            </div>
            <div class="order-item-price">${product.total} DH</div>
        </div>
    `;
    
    // Update totals
    subtotalElement.textContent = `${product.total} DH`;
    totalElement.textContent = `${product.total} DH`;
    
    // Show the popup
    popup.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Focus on the first input field
    setTimeout(() => {
        const firstInput = document.querySelector('#fullName');
        if (firstInput) firstInput.focus();
    }, 100);
}

// Function to close checkout popup
function closeCheckoutPopup() {
    const popup = document.getElementById('checkoutPopup');
    popup.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Remove any open product options
    document.querySelectorAll('.product-options').forEach(dropdown => {
        dropdown.remove();
    });
}
