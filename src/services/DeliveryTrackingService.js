/**
 * Delivery Tracking Service
 * Real-time order and delivery tracking similar to Chowdeck
 * Features: Order status updates, ETA calculation, rider tracking
 */

const { FoodOrder, Restaurant, User, OrderItem, MenuItem } = require('../models');
const { Op } = require('sequelize');

class DeliveryTrackingService {
  constructor() {
    // Order status flow
    this.orderStatuses = {
      pending: {
        label: 'Pending',
        emoji: '⏳',
        description: 'Waiting for restaurant confirmation',
        next: ['confirmed', 'cancelled']
      },
      confirmed: {
        label: 'Confirmed',
        emoji: '✅',
        description: 'Restaurant is preparing your order',
        next: ['preparing', 'cancelled']
      },
      preparing: {
        label: 'Preparing',
        emoji: '👨‍🍳',
        description: 'Your food is being prepared',
        next: ['ready', 'cancelled']
      },
      ready: {
        label: 'Ready for Pickup',
        emoji: '📦',
        description: 'Order is ready, waiting for rider',
        next: ['picked_up', 'cancelled']
      },
      picked_up: {
        label: 'Out for Delivery',
        emoji: '🏍️',
        description: 'Rider is on the way to you',
        next: ['nearby', 'delivered']
      },
      nearby: {
        label: 'Nearby',
        emoji: '📍',
        description: 'Rider is arriving soon',
        next: ['delivered']
      },
      delivered: {
        label: 'Delivered',
        emoji: '🎉',
        description: 'Order delivered successfully',
        next: []
      },
      cancelled: {
        label: 'Cancelled',
        emoji: '❌',
        description: 'Order has been cancelled',
        next: []
      }
    };

    // Mock rider pool (in production, this would be a separate Rider model)
    this.riders = [
      { id: 1, name: 'Mohammed A.', rating: 4.8, total_deliveries: 234, status: 'available' },
      { id: 2, name: 'Chisom O.', rating: 4.9, total_deliveries: 567, status: 'available' },
      { id: 3, name: 'Adebayo S.', rating: 4.7, total_deliveries: 189, status: 'busy' },
      { id: 4, name: 'Blessing U.', rating: 4.9, total_deliveries: 423, status: 'available' },
      { id: 5, name: 'Ibrahim K.', rating: 4.8, total_deliveries: 312, status: 'available' }
    ];

    // Active order tracking
    this.activeOrders = new Map();
  }

  /**
   * Track order in real-time
   */
  async trackOrder(orderId) {
    try {
      const order = await FoodOrder.findByPk(orderId, {
        include: [
          { 
            model: Restaurant, 
            as: 'restaurant',
            attributes: ['id', 'name', 'phone', 'address', 'latitude', 'longitude']
          },
          { 
            model: User, 
            as: 'customer',
            attributes: ['id', 'first_name', 'phone_number']
          },
          {
            model: OrderItem,
            as: 'items',
            include: [{ model: MenuItem, as: 'menuItem' }]
          }
        ]
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      const statusInfo = this.orderStatuses[order.status] || this.orderStatuses.pending;
      
      // Calculate ETA
      const eta = this.calculateETA(order);

      // Get rider info if assigned
      const riderInfo = order.rider_id ? this.getRiderInfo(order.rider_id) : null;

      // Calculate progress percentage
      const progress = this.calculateProgress(order.status);

      return {
        success: true,
        tracking: {
          order_id: order.id,
          order_number: order.order_number,
          status: order.status,
          status_label: statusInfo.label,
          status_emoji: statusInfo.emoji,
          status_description: statusInfo.description,
          progress_percentage: progress,
          created_at: order.created_at,
          estimated_delivery: order.estimated_delivery_time,
          eta_minutes: eta,
          restaurant: {
            name: order.restaurant.name,
            phone: order.restaurant.phone,
            address: order.restaurant.address
          },
          rider: riderInfo,
          delivery_address: order.delivery_address,
          order_type: order.order_type,
          total: parseFloat(order.total),
          items_count: order.items.length,
          timeline: this.getOrderTimeline(order)
        }
      };
    } catch (error) {
      console.error('Error tracking order:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update order status (for restaurants/riders)
   */
  async updateOrderStatus(orderId, newStatus, updatedBy = 'system', notes = null) {
    try {
      const order = await FoodOrder.findByPk(orderId, {
        include: [
          { model: Restaurant, as: 'restaurant' },
          { model: User, as: 'customer' }
        ]
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Validate status transition
      const currentStatusInfo = this.orderStatuses[order.status];
      if (!currentStatusInfo.next.includes(newStatus)) {
        return { 
          success: false, 
          error: `Cannot transition from ${order.status} to ${newStatus}` 
        };
      }

      // Auto-assign rider when order is ready
      if (newStatus === 'ready' && !order.rider_id) {
        const rider = this.assignRider(order);
        if (rider) {
          order.rider_id = rider.id;
          order.rider_name = rider.name;
        }
      }

      // Update status
      const oldStatus = order.status;
      order.status = newStatus;

      // Update timestamps
      const now = new Date();
      switch (newStatus) {
        case 'confirmed':
          order.confirmed_at = now;
          break;
        case 'preparing':
          order.preparing_at = now;
          break;
        case 'ready':
          order.ready_at = now;
          break;
        case 'picked_up':
          order.picked_up_at = now;
          break;
        case 'delivered':
          order.delivered_at = now;
          break;
        case 'cancelled':
          order.cancelled_at = now;
          order.cancellation_reason = notes;
          break;
      }

      // Recalculate ETA
      if (newStatus === 'picked_up' || newStatus === 'nearby') {
        const eta = this.calculateETA(order);
        order.estimated_delivery_time = new Date(Date.now() + eta * 60000);
      }

      await order.save();

      // Log status change
      console.log(`✅ Order #${order.order_number} status: ${oldStatus} → ${newStatus} (by ${updatedBy})`);

      return {
        success: true,
        order,
        message: `Order status updated to ${this.orderStatuses[newStatus].label}`,
        previous_status: oldStatus,
        new_status: newStatus
      };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate ETA based on current status
   */
  calculateETA(order) {
    const now = new Date();
    
    switch (order.status) {
      case 'pending':
      case 'confirmed':
        // 5 min confirmation + 20 min prep + 15 min delivery
        return 40;
      
      case 'preparing':
        // 20 min prep + 15 min delivery
        return 35;
      
      case 'ready':
        // Waiting for rider: 5 min + 15 min delivery
        return 20;
      
      case 'picked_up':
        // Calculate based on distance
        if (order.delivery_latitude && order.delivery_longitude &&
            order.restaurant && order.restaurant.latitude && order.restaurant.longitude) {
          const distance = this.calculateDistance(
            parseFloat(order.restaurant.latitude),
            parseFloat(order.restaurant.longitude),
            parseFloat(order.delivery_latitude),
            parseFloat(order.delivery_longitude)
          );
          // 3 minutes per km average in city traffic
          return Math.max(5, Math.round(distance * 3));
        }
        return 15;
      
      case 'nearby':
        return 5;
      
      case 'delivered':
        return 0;
      
      case 'cancelled':
        return 0;
      
      default:
        return 30;
    }
  }

  /**
   * Calculate progress percentage
   */
  calculateProgress(status) {
    const progressMap = {
      pending: 10,
      confirmed: 25,
      preparing: 40,
      ready: 60,
      picked_up: 80,
      nearby: 95,
      delivered: 100,
      cancelled: 0
    };
    return progressMap[status] || 0;
  }

  /**
   * Get order timeline
   */
  getOrderTimeline(order) {
    const timeline = [];

    if (order.created_at) {
      timeline.push({
        status: 'pending',
        label: 'Order Placed',
        emoji: '📝',
        timestamp: order.created_at,
        completed: true
      });
    }

    if (order.confirmed_at) {
      timeline.push({
        status: 'confirmed',
        label: 'Confirmed',
        emoji: '✅',
        timestamp: order.confirmed_at,
        completed: true
      });
    }

    if (order.preparing_at) {
      timeline.push({
        status: 'preparing',
        label: 'Preparing',
        emoji: '👨‍🍳',
        timestamp: order.preparing_at,
        completed: true
      });
    }

    if (order.ready_at) {
      timeline.push({
        status: 'ready',
        label: 'Ready',
        emoji: '📦',
        timestamp: order.ready_at,
        completed: true
      });
    }

    if (order.picked_up_at) {
      timeline.push({
        status: 'picked_up',
        label: 'Out for Delivery',
        emoji: '🏍️',
        timestamp: order.picked_up_at,
        completed: true
      });
    }

    if (order.delivered_at) {
      timeline.push({
        status: 'delivered',
        label: 'Delivered',
        emoji: '🎉',
        timestamp: order.delivered_at,
        completed: true
      });
    }

    if (order.cancelled_at) {
      timeline.push({
        status: 'cancelled',
        label: 'Cancelled',
        emoji: '❌',
        timestamp: order.cancelled_at,
        completed: true,
        reason: order.cancellation_reason
      });
    }

    return timeline;
  }

  /**
   * Assign rider to order (simplified auto-assignment)
   */
  assignRider(order) {
    // Find available riders
    const availableRiders = this.riders.filter(r => r.status === 'available');
    
    if (availableRiders.length === 0) {
      return null;
    }

    // Select best rider (highest rating + most deliveries)
    const bestRider = availableRiders.sort((a, b) => {
      const scoreA = (a.rating * 100) + a.total_deliveries;
      const scoreB = (b.rating * 100) + b.total_deliveries;
      return scoreB - scoreA;
    })[0];

    // Mark rider as busy
    bestRider.status = 'busy';

    return bestRider;
  }

  /**
   * Get rider information
   */
  getRiderInfo(riderId) {
    const rider = this.riders.find(r => r.id === riderId);
    if (!rider) return null;

    return {
      id: rider.id,
      name: rider.name,
      rating: rider.rating,
      total_deliveries: rider.total_deliveries,
      status: rider.status
    };
  }

  /**
   * Get active orders for restaurant
   */
  async getRestaurantActiveOrders(restaurantId) {
    try {
      const orders = await FoodOrder.findAll({
        where: {
          restaurant_id: restaurantId,
          status: {
            [Op.notIn]: ['delivered', 'cancelled']
          }
        },
        include: [
          { model: User, as: 'customer', attributes: ['id', 'first_name', 'phone_number'] },
          { model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem' }] }
        ],
        order: [['created_at', 'DESC']]
      });

      return {
        success: true,
        count: orders.length,
        orders: orders.map(order => this.formatOrderForRestaurant(order))
      };
    } catch (error) {
      console.error('Error getting restaurant active orders:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active orders for customer
   */
  async getCustomerActiveOrders(userId) {
    try {
      const orders = await FoodOrder.findAll({
        where: {
          customer_id: userId,
          status: {
            [Op.notIn]: ['delivered', 'cancelled']
          }
        },
        include: [
          { model: Restaurant, as: 'restaurant' },
          { model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem' }] }
        ],
        order: [['created_at', 'DESC']]
      });

      return {
        success: true,
        count: orders.length,
        orders: orders.map(order => this.formatOrderForCustomer(order))
      };
    } catch (error) {
      console.error('Error getting customer active orders:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format order for restaurant view
   */
  formatOrderForRestaurant(order) {
    const statusInfo = this.orderStatuses[order.status];
    
    return {
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer.first_name,
      customer_phone: order.customer.phone_number,
      status: order.status,
      status_label: statusInfo.label,
      status_emoji: statusInfo.emoji,
      items: order.items.map(item => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        customizations: item.customizations
      })),
      order_type: order.order_type,
      delivery_address: order.delivery_address,
      special_instructions: order.special_instructions,
      total: parseFloat(order.total),
      created_at: order.created_at,
      eta: this.calculateETA(order)
    };
  }

  /**
   * Format order for customer view
   */
  formatOrderForCustomer(order) {
    const statusInfo = this.orderStatuses[order.status];
    const riderInfo = order.rider_id ? this.getRiderInfo(order.rider_id) : null;
    
    return {
      id: order.id,
      order_number: order.order_number,
      restaurant_name: order.restaurant.name,
      restaurant_phone: order.restaurant.phone,
      status: order.status,
      status_label: statusInfo.label,
      status_emoji: statusInfo.emoji,
      status_description: statusInfo.description,
      items: order.items.map(item => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        price: parseFloat(item.unit_price)
      })),
      total: parseFloat(order.total),
      delivery_fee: parseFloat(order.delivery_fee),
      rider: riderInfo,
      estimated_delivery: order.estimated_delivery_time,
      eta_minutes: this.calculateETA(order),
      progress: this.calculateProgress(order.status),
      created_at: order.created_at
    };
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Get available riders
   */
  getAvailableRiders() {
    return this.riders.filter(r => r.status === 'available');
  }

  /**
   * Get order status options for next step
   */
  getNextStatusOptions(currentStatus) {
    const statusInfo = this.orderStatuses[currentStatus];
    return statusInfo ? statusInfo.next : [];
  }
}

module.exports = new DeliveryTrackingService();
