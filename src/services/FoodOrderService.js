const { 
  User, 
  Restaurant, 
  MenuItem, 
  FoodOrder, 
  OrderItem 
} = require('../models');
const { Op } = require('sequelize');

class FoodOrderService {
  // Restaurant Registration Methods
  async registerRestaurant(telegramId, restaurantData) {
    try {
      const user = await User.findOne({ where: { telegram_id: telegramId } });
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already owns a restaurant
      const existingRestaurant = await Restaurant.findOne({ 
        where: { owner_id: user.id } 
      });
      
      if (existingRestaurant) {
        throw new Error('You already own a restaurant. Only one restaurant per user is allowed.');
      }

      const restaurant = await Restaurant.create({
        owner_id: user.id,
        name: restaurantData.name,
        description: restaurantData.description,
        address: restaurantData.address,
        phone: restaurantData.phone,
        latitude: restaurantData.latitude,
        longitude: restaurantData.longitude,
        delivery_radius: restaurantData.delivery_radius || 5.0,
        opening_hours: restaurantData.opening_hours || {
          monday: { open: '09:00', close: '22:00' },
          tuesday: { open: '09:00', close: '22:00' },
          wednesday: { open: '09:00', close: '22:00' },
          thursday: { open: '09:00', close: '22:00' },
          friday: { open: '09:00', close: '22:00' },
          saturday: { open: '09:00', close: '23:00' },
          sunday: { open: '10:00', close: '21:00' }
        },
        cuisine_type: restaurantData.cuisine_type || 'General',
        average_preparation_time: restaurantData.average_preparation_time || 30,
        is_active: true,
        is_verified: false,
        rating: 5.0,
        delivery_fee: restaurantData.delivery_fee || 2.99,
        minimum_order_amount: restaurantData.minimum_order_amount || 15.00
      });

      return restaurant;
    } catch (error) {
      console.error('Error registering restaurant:', error);
      throw error;
    }
  }

  async getRestaurantByOwner(telegramId) {
    try {
      const user = await User.findOne({ where: { telegram_id: telegramId } });
      if (!user) return null;

      const restaurant = await Restaurant.findOne({ 
        where: { owner_id: user.id },
        include: [
          { model: MenuItem, as: 'menuItems' },
          { model: FoodOrder, as: 'orders', include: [
            { model: User, as: 'customer' },
            { model: OrderItem, as: 'items', include: [
              { model: MenuItem, as: 'menuItem' }
            ]}
          ]}
        ]
      });

      return restaurant;
    } catch (error) {
      console.error('Error getting restaurant by owner:', error);
      throw error;
    }
  }

  async updateRestaurantStatus(telegramId, isActive) {
    try {
      const restaurant = await this.getRestaurantByOwner(telegramId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      await restaurant.update({ is_active: isActive });
      return restaurant;
    } catch (error) {
      console.error('Error updating restaurant status:', error);
      throw error;
    }
  }

  // Menu Management Methods
  async addMenuItem(telegramId, itemData) {
    try {
      const restaurant = await this.getRestaurantByOwner(telegramId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const menuItem = await MenuItem.create({
        restaurant_id: restaurant.id,
        name: itemData.name,
        description: itemData.description,
        price: itemData.price,
        category: itemData.category || 'Main Course',
        image_url: itemData.image_url,
        preparation_time: itemData.preparation_time || 15,
        is_available: true,
        is_vegetarian: itemData.is_vegetarian || false,
        is_vegan: itemData.is_vegan || false,
        is_gluten_free: itemData.is_gluten_free || false,
        allergens: itemData.allergens || [],
        calories: itemData.calories,
        spice_level: itemData.spice_level || 'mild',
        customization_options: itemData.customization_options || []
      });

      return menuItem;
    } catch (error) {
      console.error('Error adding menu item:', error);
      throw error;
    }
  }

  async getMenuItems(restaurantId) {
    try {
      const menuItems = await MenuItem.findAll({
        where: { 
          restaurant_id: restaurantId,
          is_available: true 
        },
        order: [['category', 'ASC'], ['name', 'ASC']]
      });

      return menuItems;
    } catch (error) {
      console.error('Error getting menu items:', error);
      throw error;
    }
  }

  async updateMenuItemAvailability(telegramId, itemId, isAvailable) {
    try {
      const restaurant = await this.getRestaurantByOwner(telegramId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const menuItem = await MenuItem.findOne({
        where: { 
          id: itemId,
          restaurant_id: restaurant.id 
        }
      });

      if (!menuItem) {
        throw new Error('Menu item not found');
      }

      await menuItem.update({ is_available: isAvailable });
      return menuItem;
    } catch (error) {
      console.error('Error updating menu item availability:', error);
      throw error;
    }
  }

  // Customer Ordering Methods
  async getNearbyRestaurants(latitude, longitude, radius = 10) {
    try {
      const restaurants = await Restaurant.findAll({
        where: {
          is_active: true,
          is_verified: true
        },
        include: [
          { model: MenuItem, as: 'menuItems', where: { is_available: true }, required: false }
        ]
      });

      // Filter restaurants within delivery radius
      const nearbyRestaurants = restaurants.filter(restaurant => {
        if (!restaurant.latitude || !restaurant.longitude) return false;
        
        const distance = restaurant.getDistance(latitude, longitude);
        return distance <= Math.min(radius, restaurant.delivery_radius);
      });

      // Sort by distance
      nearbyRestaurants.sort((a, b) => {
        const distanceA = a.getDistance(latitude, longitude);
        const distanceB = b.getDistance(latitude, longitude);
        return distanceA - distanceB;
      });

      return nearbyRestaurants;
    } catch (error) {
      console.error('Error getting nearby restaurants:', error);
      throw error;
    }
  }

  async getRestaurantDetails(restaurantId) {
    try {
      const restaurant = await Restaurant.findByPk(restaurantId, {
        include: [
          { 
            model: MenuItem, 
            as: 'menuItems',
            where: { is_available: true },
            required: false,
            order: [['category', 'ASC'], ['name', 'ASC']]
          }
        ]
      });

      return restaurant;
    } catch (error) {
      console.error('Error getting restaurant details:', error);
      throw error;
    }
  }

  async createOrder(telegramId, orderData) {
    try {
      const user = await User.findOne({ where: { telegram_id: telegramId } });
      if (!user) {
        throw new Error('User not found');
      }

      const restaurant = await Restaurant.findByPk(orderData.restaurant_id);
      if (!restaurant || !restaurant.is_active) {
        throw new Error('Restaurant not available');
      }

      // Validate delivery address is within radius
      if (orderData.delivery_latitude && orderData.delivery_longitude) {
        const distance = restaurant.getDistance(
          orderData.delivery_latitude, 
          orderData.delivery_longitude
        );
        
        if (distance > restaurant.delivery_radius) {
          throw new Error(`Delivery address is outside delivery radius (${restaurant.delivery_radius} km)`);
        }
      }

      // Create the order
      const order = await FoodOrder.create({
        customer_id: user.id,
        restaurant_id: orderData.restaurant_id,
        delivery_address: orderData.delivery_address,
        delivery_latitude: orderData.delivery_latitude,
        delivery_longitude: orderData.delivery_longitude,
        phone_number: orderData.phone_number || user.phone_number,
        special_instructions: orderData.special_instructions,
        status: 'pending',
        order_type: orderData.order_type || 'delivery',
        estimated_delivery_time: new Date(Date.now() + (restaurant.average_preparation_time + 30) * 60000)
      });

      // Add order items
      let subtotal = 0;
      for (const item of orderData.items) {
        const menuItem = await MenuItem.findByPk(item.menu_item_id);
        if (!menuItem || !menuItem.is_available) {
          throw new Error(`Menu item ${item.menu_item_id} not available`);
        }

        const orderItem = await OrderItem.create({
          order_id: order.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: menuItem.price,
          customizations: item.customizations || {},
          special_instructions: item.special_instructions
        });

        subtotal += orderItem.calculateTotalPrice();
      }

      // Calculate totals
      const deliveryFee = orderData.order_type === 'delivery' ? restaurant.delivery_fee : 0;
      const tax = subtotal * 0.08; // 8% tax
      const total = subtotal + deliveryFee + tax;

      // Check minimum order amount
      if (subtotal < restaurant.minimum_order_amount) {
        throw new Error(`Minimum order amount is $${restaurant.minimum_order_amount.toFixed(2)}`);
      }

      await order.update({
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        tax: tax,
        total: total
      });

      // Load order with all associations
      const completeOrder = await FoodOrder.findByPk(order.id, {
        include: [
          { model: User, as: 'customer' },
          { model: Restaurant, as: 'restaurant' },
          { model: OrderItem, as: 'items', include: [
            { model: MenuItem, as: 'menuItem' }
          ]}
        ]
      });

      return completeOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async getOrderHistory(telegramId, limit = 10) {
    try {
      const user = await User.findOne({ where: { telegram_id: telegramId } });
      if (!user) {
        throw new Error('User not found');
      }

      const orders = await FoodOrder.findAll({
        where: { customer_id: user.id },
        include: [
          { model: Restaurant, as: 'restaurant' },
          { model: OrderItem, as: 'items', include: [
            { model: MenuItem, as: 'menuItem' }
          ]}
        ],
        order: [['created_at', 'DESC']],
        limit: limit
      });

      return orders;
    } catch (error) {
      console.error('Error getting order history:', error);
      throw error;
    }
  }

  // Order Management Methods
  async updateOrderStatus(orderId, status, estimatedTime = null) {
    try {
      const order = await FoodOrder.findByPk(orderId, {
        include: [
          { model: User, as: 'customer' },
          { model: Restaurant, as: 'restaurant' }
        ]
      });

      if (!order) {
        throw new Error('Order not found');
      }

      await order.updateStatus(status, estimatedTime);
      return order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  async getRestaurantOrders(telegramId, status = null) {
    try {
      const restaurant = await this.getRestaurantByOwner(telegramId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const whereClause = { restaurant_id: restaurant.id };
      if (status) {
        whereClause.status = status;
      }

      const orders = await FoodOrder.findAll({
        where: whereClause,
        include: [
          { model: User, as: 'customer' },
          { model: OrderItem, as: 'items', include: [
            { model: MenuItem, as: 'menuItem' }
          ]}
        ],
        order: [['created_at', 'DESC']]
      });

      return orders;
    } catch (error) {
      console.error('Error getting restaurant orders:', error);
      throw error;
    }
  }

  async getOrderDetails(orderId) {
    try {
      const order = await FoodOrder.findByPk(orderId, {
        include: [
          { model: User, as: 'customer' },
          { model: Restaurant, as: 'restaurant' },
          { model: OrderItem, as: 'items', include: [
            { model: MenuItem, as: 'menuItem' }
          ]}
        ]
      });

      return order;
    } catch (error) {
      console.error('Error getting order details:', error);
      throw error;
    }
  }

  // Analytics and Reporting
  async getRestaurantAnalytics(telegramId, days = 7) {
    try {
      const restaurant = await this.getRestaurantByOwner(telegramId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const orders = await FoodOrder.findAll({
        where: {
          restaurant_id: restaurant.id,
          created_at: { [Op.gte]: startDate }
        },
        include: [
          { model: OrderItem, as: 'items', include: [
            { model: MenuItem, as: 'menuItem' }
          ]}
        ]
      });

      const analytics = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0),
        averageOrderValue: 0,
        statusBreakdown: {},
        popularItems: {},
        peakHours: {}
      };

      if (analytics.totalOrders > 0) {
        analytics.averageOrderValue = analytics.totalRevenue / analytics.totalOrders;
      }

      // Status breakdown
      orders.forEach(order => {
        analytics.statusBreakdown[order.status] = (analytics.statusBreakdown[order.status] || 0) + 1;
      });

      // Popular items
      orders.forEach(order => {
        order.items.forEach(item => {
          const itemName = item.menuItem.name;
          analytics.popularItems[itemName] = (analytics.popularItems[itemName] || 0) + item.quantity;
        });
      });

      // Peak hours
      orders.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        analytics.peakHours[hour] = (analytics.peakHours[hour] || 0) + 1;
      });

      return analytics;
    } catch (error) {
      console.error('Error getting restaurant analytics:', error);
      throw error;
    }
  }

  // Utility Methods
  formatRestaurantList(restaurants, userLatitude = null, userLongitude = null) {
    return restaurants.map(restaurant => {
      let distance = null;
      if (userLatitude && userLongitude && restaurant.latitude && restaurant.longitude) {
        distance = restaurant.getDistance(userLatitude, userLongitude);
      }

      return {
        id: restaurant.id,
        name: restaurant.name,
        cuisine_type: restaurant.cuisine_type,
        rating: restaurant.rating,
        delivery_fee: restaurant.delivery_fee,
        minimum_order: restaurant.minimum_order_amount,
        prep_time: restaurant.average_preparation_time,
        distance: distance ? `${distance.toFixed(1)} km` : null,
        is_open: restaurant.isOpen()
      };
    });
  }

  formatOrderSummary(order) {
    const items = order.items.map(item => ({
      name: item.menuItem.name,
      quantity: item.quantity,
      price: item.calculateTotalPrice(),
      customizations: item.getCustomizationsText()
    }));

    return {
      order_number: order.order_number,
      restaurant: order.restaurant.name,
      items: items,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      tax: order.tax,
      total: order.total,
      status: order.status,
      estimated_delivery: order.getEstimatedDeliveryText(),
      created_at: order.created_at
    };
  }
}

module.exports = new FoodOrderService();