const { Business, Order, User } = require('../models');
const { Op } = require('sequelize');

class BusinessService {
  /**
   * Create a new business registration
   */
  async registerBusiness(businessData) {
    try {
      const business = await Business.create(businessData);
      return {
        success: true,
        business,
        message: `✅ Business registered successfully!\n\n🏢 *${business.business_name}*\nBusiness ID: ${business.id}\nCategory: ${business.category}`
      };
    } catch (error) {
      console.error('Error registering business:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search businesses by keyword and location
   */
  async searchBusinesses(keyword, userLat = null, userLng = null, category = null, radius = 10) {
    try {
      let businesses;

      if (userLat && userLng) {
        // Location-based search
        businesses = await Business.findNearby(userLat, userLng, radius, category);
      } else if (keyword) {
        // Keyword search
        businesses = await Business.searchByKeyword(keyword, userLat, userLng);
      } else if (category) {
        // Category only search
        businesses = await Business.findAll({
          where: {
            category,
            is_active: true
          },
          order: [['rating', 'DESC']],
          limit: 20,
          raw: true
        });
      } else {
        // Get top rated businesses
        businesses = await Business.findAll({
          where: { is_active: true },
          order: [['rating', 'DESC']],
          limit: 20,
          raw: true
        });
      }

      return {
        success: true,
        businesses,
        count: businesses.length
      };
    } catch (error) {
      console.error('Error searching businesses:', error);
      return {
        success: false,
        error: error.message,
        businesses: []
      };
    }
  }

  /**
   * Get business details by ID
   */
  async getBusinessDetails(businessId) {
    try {
      const business = await Business.findByPk(businessId, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'username', 'first_name', 'last_name']
          }
        ]
      });

      if (!business) {
        return {
          success: false,
          error: 'Business not found'
        };
      }

      return {
        success: true,
        business
      };
    } catch (error) {
      console.error('Error getting business details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update business information
   */
  async updateBusiness(businessId, updateData) {
    try {
      const business = await Business.findByPk(businessId);
      
      if (!business) {
        return {
          success: false,
          error: 'Business not found'
        };
      }

      await business.update(updateData);

      return {
        success: true,
        business,
        message: '✅ Business updated successfully!'
      };
    } catch (error) {
      console.error('Error updating business:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a new order
   */
  async createOrder(orderData) {
    try {
      const order = await Order.create(orderData);

      return {
        success: true,
        order,
        message: `✅ Order placed successfully!\n\nOrder Number: ${order.order_number}\nTotal: $${order.getTotalWithDelivery().toFixed(2)}`
      };
    } catch (error) {
      console.error('Error creating order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, newStatus) {
    try {
      const order = await Order.findByPk(orderId);
      
      if (!order) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      await order.updateStatus(newStatus);

      return {
        success: true,
        order,
        message: `Order ${order.order_number} status updated to: ${newStatus}`
      };
    } catch (error) {
      console.error('Error updating order status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get orders for a customer
   */
  async getCustomerOrders(customerId, limit = 10) {
    try {
      const orders = await Order.getCustomerOrders(customerId, limit);

      return {
        success: true,
        orders,
        count: orders.length
      };
    } catch (error) {
      console.error('Error getting customer orders:', error);
      return {
        success: false,
        error: error.message,
        orders: []
      };
    }
  }

  /**
   * Get orders for a business
   */
  async getBusinessOrders(businessId, status = null, limit = 20) {
    try {
      const orders = await Order.getBusinessOrders(businessId, status, limit);

      return {
        success: true,
        orders,
        count: orders.length
      };
    } catch (error) {
      console.error('Error getting business orders:', error);
      return {
        success: false,
        error: error.message,
        orders: []
      };
    }
  }

  /**
   * Add review to order
   */
  async addReview(orderId, rating, reviewText) {
    try {
      const order = await Order.findByPk(orderId, {
        include: [{ model: Business, as: 'business' }]
      });

      if (!order) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      if (!order.canBeReviewed()) {
        return {
          success: false,
          error: 'This order cannot be reviewed. Order must be delivered and not already reviewed.'
        };
      }

      await order.addReview(rating, reviewText);

      // Update business rating
      const business = await Business.findByPk(order.business_id);
      if (business) {
        await business.updateRating(rating);
      }

      return {
        success: true,
        order,
        message: '✅ Review submitted successfully! Thank you for your feedback.'
      };
    } catch (error) {
      console.error('Error adding review:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get business statistics
   */
  async getBusinessStats(businessId, days = 30) {
    try {
      const stats = await Order.getOrderStats(businessId, days);

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Error getting business stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format business list for display
   */
  formatBusinessList(businesses, userLat = null, userLng = null) {
    if (!businesses || businesses.length === 0) {
      return '❌ No businesses found matching your criteria.';
    }

    let message = `🏪 *Found ${businesses.length} Business${businesses.length > 1 ? 'es' : ''}*\n\n`;

    businesses.forEach((business, index) => {
      message += `${index + 1}. *${business.business_name}*\n`;
      message += `   📂 ${business.category}\n`;
      message += `   ⭐ ${business.rating ? business.rating.toFixed(1) : 'No rating'} (${business.total_reviews || 0} reviews)\n`;
      message += `   📍 ${business.city}, ${business.state}\n`;

      if (userLat && userLng && business.latitude && business.longitude) {
        // Calculate distance if we have user location
        const R = 6371; // Earth's radius in km
        const dLat = (business.latitude - userLat) * Math.PI / 180;
        const dLon = (business.longitude - userLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(userLat * Math.PI / 180) * Math.cos(business.latitude * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        message += `   🚗 ${distance.toFixed(1)} km away\n`;
      }

      if (business.phone) {
        message += `   📞 ${business.phone}\n`;
      }

      message += `   ID: \`${business.id}\`\n\n`;
    });

    return message;
  }

  /**
   * Format business menu
   */
  formatMenu(menuItems) {
    if (!menuItems || menuItems.length === 0) {
      return '📋 No menu items available.';
    }

    let message = '📋 *Menu*\n\n';

    menuItems.forEach((item, index) => {
      message += `${index + 1}. *${item.name}* - $${parseFloat(item.price).toFixed(2)}\n`;
      if (item.description) {
        message += `   ${item.description}\n`;
      }
      if (!item.available) {
        message += `   ❌ Currently unavailable\n`;
      }
      message += '\n';
    });

    return message;
  }
}

module.exports = new BusinessService();
