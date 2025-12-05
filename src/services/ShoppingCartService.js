/**
 * Shopping Cart Service
 * Manages user shopping carts for food ordering
 * Features: Add/remove items, apply customizations, calculate totals
 */

const { MenuItem, Restaurant } = require('../models');

class ShoppingCartService {
  constructor() {
    // In-memory cart storage (can be moved to Redis for production)
    this.carts = new Map();
  }

  /**
   * Get or create cart for user
   */
  getCart(userId) {
    if (!this.carts.has(userId)) {
      this.carts.set(userId, {
        restaurant_id: null,
        items: [],
        subtotal: 0,
        delivery_fee: 0,
        tax: 0,
        total: 0,
        created_at: new Date()
      });
    }
    return this.carts.get(userId);
  }

  /**
   * Add item to cart
   */
  async addItem(userId, itemId, quantity = 1, customizations = {}) {
    try {
      const menuItem = await MenuItem.findByPk(itemId, {
        include: [{ model: Restaurant, as: 'restaurant' }]
      });

      if (!menuItem || !menuItem.is_available) {
        return { success: false, error: 'Menu item not available' };
      }

      const cart = this.getCart(userId);

      // Check if cart is for same restaurant (can't mix restaurants)
      if (cart.restaurant_id && cart.restaurant_id !== menuItem.restaurant_id) {
        return { 
          success: false, 
          error: 'Cannot add items from different restaurants. Clear cart first.' 
        };
      }

      // Set restaurant if first item
      if (!cart.restaurant_id) {
        cart.restaurant_id = menuItem.restaurant_id;
        cart.restaurant = menuItem.restaurant;
      }

      // Check if item already in cart
      const existingItemIndex = cart.items.findIndex(
        item => item.menu_item_id === itemId && 
        JSON.stringify(item.customizations) === JSON.stringify(customizations)
      );

      if (existingItemIndex >= 0) {
        // Update quantity
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        cart.items.push({
          menu_item_id: itemId,
          name: menuItem.name,
          price: parseFloat(menuItem.price),
          quantity,
          customizations,
          image_url: menuItem.image_url,
          preparation_time: menuItem.preparation_time
        });
      }

      // Recalculate totals
      await this.calculateCartTotals(userId);

      return { 
        success: true, 
        cart: this.formatCart(cart),
        message: `Added ${quantity}x ${menuItem.name} to cart` 
      };
    } catch (error) {
      console.error('Error adding item to cart:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(userId, itemIndex, quantity) {
    try {
      const cart = this.getCart(userId);

      if (itemIndex < 0 || itemIndex >= cart.items.length) {
        return { success: false, error: 'Invalid item index' };
      }

      if (quantity <= 0) {
        // Remove item
        return this.removeItem(userId, itemIndex);
      }

      cart.items[itemIndex].quantity = quantity;
      await this.calculateCartTotals(userId);

      return { 
        success: true, 
        cart: this.formatCart(cart),
        message: 'Cart updated' 
      };
    } catch (error) {
      console.error('Error updating item quantity:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId, itemIndex) {
    try {
      const cart = this.getCart(userId);

      if (itemIndex < 0 || itemIndex >= cart.items.length) {
        return { success: false, error: 'Invalid item index' };
      }

      const removedItem = cart.items.splice(itemIndex, 1)[0];

      // If cart is empty, reset restaurant
      if (cart.items.length === 0) {
        cart.restaurant_id = null;
        cart.restaurant = null;
      }

      await this.calculateCartTotals(userId);

      return { 
        success: true, 
        cart: this.formatCart(cart),
        message: `Removed ${removedItem.name} from cart` 
      };
    } catch (error) {
      console.error('Error removing item from cart:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear cart
   */
  clearCart(userId) {
    this.carts.delete(userId);
    return { success: true, message: 'Cart cleared' };
  }

  /**
   * Calculate cart totals
   */
  async calculateCartTotals(userId) {
    try {
      const cart = this.getCart(userId);

      if (!cart.restaurant_id) {
        cart.subtotal = 0;
        cart.delivery_fee = 0;
        cart.tax = 0;
        cart.total = 0;
        return cart;
      }

      // Calculate subtotal
      cart.subtotal = cart.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // Get restaurant for delivery fee
      if (cart.restaurant) {
        cart.delivery_fee = parseFloat(cart.restaurant.delivery_fee) || 0;
        cart.minimum_order = parseFloat(cart.restaurant.minimum_order) || 0;
      }

      // Calculate tax (8%)
      cart.tax = cart.subtotal * 0.08;

      // Calculate total
      cart.total = cart.subtotal + cart.delivery_fee + cart.tax;

      return cart;
    } catch (error) {
      console.error('Error calculating cart totals:', error);
      throw error;
    }
  }

  /**
   * Get cart summary
   */
  async getCartSummary(userId) {
    const cart = this.getCart(userId);
    return { success: true, cart: this.formatCart(cart) };
  }

  /**
   * Validate cart before checkout
   */
  async validateCart(userId) {
    try {
      const cart = this.getCart(userId);

      if (!cart.restaurant_id || cart.items.length === 0) {
        return { valid: false, error: 'Cart is empty' };
      }

      // Check minimum order amount
      if (cart.minimum_order && cart.subtotal < cart.minimum_order) {
        return { 
          valid: false, 
          error: `Minimum order amount is ₦${cart.minimum_order.toFixed(2)}` 
        };
      }

      // Verify all items are still available
      for (const item of cart.items) {
        const menuItem = await MenuItem.findByPk(item.menu_item_id);
        if (!menuItem || !menuItem.is_available) {
          return { 
            valid: false, 
            error: `${item.name} is no longer available` 
          };
        }

        // Check if price changed
        if (parseFloat(menuItem.price) !== item.price) {
          return { 
            valid: false, 
            error: `Price for ${item.name} has changed. Please update cart.` 
          };
        }
      }

      return { valid: true, cart };
    } catch (error) {
      console.error('Error validating cart:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Format cart for display
   */
  formatCart(cart) {
    if (!cart || cart.items.length === 0) {
      return {
        empty: true,
        message: 'Your cart is empty'
      };
    }

    return {
      empty: false,
      restaurant_id: cart.restaurant_id,
      restaurant_name: cart.restaurant ? cart.restaurant.name : null,
      items: cart.items.map((item, index) => ({
        index,
        menu_item_id: item.menu_item_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        customizations: item.customizations,
        image_url: item.image_url
      })),
      item_count: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.subtotal.toFixed(2),
      delivery_fee: cart.delivery_fee.toFixed(2),
      tax: cart.tax.toFixed(2),
      total: cart.total.toFixed(2),
      minimum_order: cart.minimum_order ? cart.minimum_order.toFixed(2) : null,
      meets_minimum: !cart.minimum_order || cart.subtotal >= cart.minimum_order
    };
  }

  /**
   * Get cart item count
   */
  getItemCount(userId) {
    const cart = this.getCart(userId);
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Check if user has active cart
   */
  hasActiveCart(userId) {
    const cart = this.getCart(userId);
    return cart.items.length > 0;
  }

  /**
   * Get cart restaurant
   */
  getCartRestaurant(userId) {
    const cart = this.getCart(userId);
    return cart.restaurant_id;
  }

  /**
   * Clean up old carts (run periodically)
   */
  cleanupOldCarts(maxAgeHours = 24) {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const [userId, cart] of this.carts.entries()) {
      if (now - cart.created_at > maxAge) {
        this.carts.delete(userId);
      }
    }
  }
}

module.exports = ShoppingCartService;
