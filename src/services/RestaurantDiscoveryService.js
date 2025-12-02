/**
 * Restaurant Discovery Service
 * Advanced restaurant browsing similar to Chowdeck and Seamless
 * Features: State-wide browsing, location tracking, menu discovery, filters
 */

const { Restaurant, MenuItem, FoodOrder, User } = require('../models');
const { Op } = require('sequelize');

class RestaurantDiscoveryService {
  constructor() {
    // Nigerian states for state-wide browsing
    this.nigerianStates = [
      'Lagos', 'Abuja', 'Rivers', 'Kano', 'Oyo', 'Delta', 'Edo', 'Kaduna',
      'Anambra', 'Enugu', 'Ogun', 'Abia', 'Imo', 'Plateau', 'Cross River',
      'Ondo', 'Osun', 'Benue', 'Bayelsa', 'Akwa Ibom', 'Kwara', 'Borno',
      'Niger', 'Adamawa', 'Sokoto', 'Bauchi', 'Katsina', 'Taraba', 'Gombe',
      'Zamfara', 'Jigawa', 'Kebbi', 'Kogi', 'Ekiti', 'Nasarawa', 'Yobe', 'Ebonyi'
    ];

    // Popular cities for quick access
    this.popularCities = [
      { name: 'Lagos', state: 'Lagos', lat: 6.5244, lng: 3.3792 },
      { name: 'Abuja', state: 'FCT', lat: 9.0765, lng: 7.3986 },
      { name: 'Port Harcourt', state: 'Rivers', lat: 4.8156, lng: 7.0498 },
      { name: 'Ibadan', state: 'Oyo', lat: 7.3775, lng: 3.9470 },
      { name: 'Kano', state: 'Kano', lat: 12.0022, lng: 8.5920 },
      { name: 'Enugu', state: 'Enugu', lat: 6.5244, lng: 7.5105 }
    ];

    // Cuisine categories
    this.cuisineTypes = [
      'Nigerian', 'Fast Food', 'African', 'Chinese', 'Italian', 'Indian',
      'American', 'Mexican', 'Japanese', 'Lebanese', 'Continental', 'Seafood',
      'Vegetarian', 'Vegan', 'BBQ', 'Pizza', 'Burgers', 'Sushi', 'Cafe', 'Bakery'
    ];

    // Menu categories
    this.menuCategories = [
      'Appetizers', 'Main Course', 'Sides', 'Soups', 'Rice Dishes', 'Swallow',
      'Proteins', 'Salads', 'Desserts', 'Drinks', 'Breakfast', 'Lunch', 'Dinner',
      'Snacks', 'Combos', 'Specials'
    ];
  }

  /**
   * Browse all restaurants by state
   */
  async browseRestaurantsByState(state, options = {}) {
    try {
      const {
        cuisine = null,
        minRating = 0,
        maxDeliveryFee = null,
        sortBy = 'rating', // rating, distance, price, popularity
        isOpen = false,
        limit = 50,
        offset = 0
      } = options;

      const whereClause = {
        is_active: true,
        is_verified: true
      };

      // Filter by state (check tags JSON array for state name)
      // Tags format: [city, state, cuisine]
      if (state) {
        // Simple approach: cast tags JSON to text and search within it
        // Works for both SQLite and PostgreSQL
        const sequelize = Restaurant.sequelize;
        whereClause[Op.or] = [
          sequelize.where(
            sequelize.cast(sequelize.col('tags'), 'TEXT'),
            { [Op.like]: `%${state}%` }
          ),
          { address: { [Op.like]: `%${state}%` } }
        ];
      }

      // Filter by cuisine
      if (cuisine) {
        whereClause.cuisine_type = { [Op.like]: `%${cuisine}%` };
      }

      // Filter by rating
      if (minRating > 0) {
        whereClause.rating = { [Op.gte]: minRating };
      }

      // Filter by delivery fee
      if (maxDeliveryFee) {
        whereClause.delivery_fee = { [Op.lte]: maxDeliveryFee };
      }

      // Build order clause
      let order = [];
      switch (sortBy) {
        case 'rating':
          order = [['rating', 'DESC'], ['total_reviews', 'DESC']];
          break;
        case 'price':
          order = [['minimum_order', 'ASC']];
          break;
        case 'popularity':
          order = [['total_reviews', 'DESC']];
          break;
        default:
          order = [['name', 'ASC']];
      }

      const restaurants = await Restaurant.findAll({
        where: whereClause,
        include: [
          {
            model: MenuItem,
            as: 'menuItems',
            where: { is_available: true },
            required: false,
            limit: 5
          }
        ],
        order,
        limit,
        offset
      });

      // Filter by operating hours if needed
      let filteredRestaurants = restaurants;
      if (isOpen) {
        filteredRestaurants = restaurants.filter(r => r.isOpen());
      }

      // If no restaurants found in database, return mock data
      if (filteredRestaurants.length === 0) {
        console.warn(`⚠️ No restaurants in database for ${state}, returning mock data`);
        const mockRestaurants = this.getMockRestaurantsByState(state);
        return {
          success: true,
          count: mockRestaurants.length,
          state,
          restaurants: mockRestaurants,
          isMockData: true
        };
      }

      return {
        success: true,
        count: filteredRestaurants.length,
        state,
        restaurants: filteredRestaurants.map(r => this.formatRestaurantCard(r))
      };
    } catch (error) {
      console.error('Error browsing restaurants by state:', error);
      // Return mock data on error
      const mockRestaurants = this.getMockRestaurantsByState(state || 'Lagos');
      return {
        success: true,
        count: mockRestaurants.length,
        state: state || 'Lagos',
        restaurants: mockRestaurants,
        isMockData: true,
        error: error.message
      };
    }
  }

  /**
   * Find restaurants near user's location (Google Maps style)
   */
  async findNearbyRestaurants(latitude, longitude, options = {}) {
    try {
      const {
        radius = 10, // km
        cuisine = null,
        minRating = 0,
        maxDeliveryFee = null,
        sortBy = 'distance',
        isOpen = false,
        limit = 50
      } = options;

      const restaurants = await Restaurant.findAll({
        where: {
          is_active: true,
          is_verified: true,
          latitude: { [Op.ne]: null },
          longitude: { [Op.ne]: null }
        },
        include: [
          {
            model: MenuItem,
            as: 'menuItems',
            where: { is_available: true },
            required: false,
            limit: 5
          }
        ]
      });

      // Calculate distances and filter
      const nearbyRestaurants = restaurants
        .map(restaurant => {
          const distance = this.calculateDistance(
            latitude, longitude,
            parseFloat(restaurant.latitude), parseFloat(restaurant.longitude)
          );
          
          return {
            ...restaurant.toJSON(),
            distance,
            isWithinRange: distance <= radius && distance <= restaurant.delivery_radius
          };
        })
        .filter(r => {
          // Distance filter
          if (!r.isWithinRange) return false;

          // Cuisine filter
          if (cuisine && !r.cuisine_type.toLowerCase().includes(cuisine.toLowerCase())) return false;

          // Rating filter
          if (r.rating < minRating) return false;

          // Delivery fee filter
          if (maxDeliveryFee && r.delivery_fee > maxDeliveryFee) return false;

          // Open status filter
          if (isOpen && !this.isRestaurantOpen(r.operating_hours)) return false;

          return true;
        })
        .sort((a, b) => {
          switch (sortBy) {
            case 'distance':
              return a.distance - b.distance;
            case 'rating':
              return b.rating - a.rating;
            case 'price':
              return a.minimum_order - b.minimum_order;
            case 'popularity':
              return b.total_reviews - a.total_reviews;
            default:
              return a.distance - b.distance;
          }
        })
        .slice(0, limit);

      return {
        success: true,
        count: nearbyRestaurants.length,
        userLocation: { latitude, longitude },
        restaurants: nearbyRestaurants.map(r => this.formatRestaurantCard(r, latitude, longitude))
      };
    } catch (error) {
      console.error('Error finding nearby restaurants:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get complete restaurant details with full menu
   */
  async getRestaurantFullDetails(restaurantId, userLatitude = null, userLongitude = null) {
    try {
      const restaurant = await Restaurant.findByPk(restaurantId, {
        include: [
          {
            model: MenuItem,
            as: 'menuItems',
            where: { is_available: true },
            required: false
          },
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'first_name', 'username']
          }
        ]
      });

      if (!restaurant) {
        return { success: false, error: 'Restaurant not found' };
      }

      // Calculate distance if location provided
      let distance = null;
      let canDeliver = false;
      if (userLatitude && userLongitude && restaurant.latitude && restaurant.longitude) {
        distance = this.calculateDistance(
          userLatitude, userLongitude,
          parseFloat(restaurant.latitude), parseFloat(restaurant.longitude)
        );
        canDeliver = distance <= restaurant.delivery_radius;
      }

      // Group menu items by category
      const menuByCategory = this.groupMenuByCategory(restaurant.menuItems || []);

      // Get recent reviews (mock for now - can be extended)
      const recentOrders = await FoodOrder.count({
        where: {
          restaurant_id: restaurantId,
          status: 'delivered',
          created_at: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      });

      return {
        success: true,
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          description: restaurant.description,
          address: restaurant.address,
          phone: restaurant.phone,
          email: restaurant.email,
          cuisine_type: restaurant.cuisine_type,
          rating: restaurant.rating,
          total_reviews: restaurant.total_reviews,
          delivery_fee: restaurant.delivery_fee,
          minimum_order: restaurant.minimum_order,
          delivery_radius: restaurant.delivery_radius,
          is_open: restaurant.isOpen(),
          operating_hours: restaurant.getFormattedHours(),
          logo_url: restaurant.logo_url,
          cover_image_url: restaurant.cover_image_url,
          tags: restaurant.tags || [],
          features: restaurant.features || [],
          distance: distance ? `${distance.toFixed(1)} km` : null,
          can_deliver: canDeliver,
          orders_this_month: recentOrders,
          menu: menuByCategory,
          total_items: restaurant.menuItems ? restaurant.menuItems.length : 0
        }
      };
    } catch (error) {
      console.error('Error getting restaurant full details:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search restaurants by name, cuisine, or menu items
   */
  async searchRestaurants(query, location = null, options = {}) {
    try {
      const { limit = 20, minRating = 0 } = options;

      const whereClause = {
        is_active: true,
        is_verified: true,
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { cuisine_type: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } },
          { tags: { [Op.contains]: [query] } }
        ]
      };

      if (minRating > 0) {
        whereClause.rating = { [Op.gte]: minRating };
      }

      // Add location filter if provided
      if (location) {
        whereClause.address = { [Op.like]: `%${location}%` };
      }

      const restaurants = await Restaurant.findAll({
        where: whereClause,
        include: [
          {
            model: MenuItem,
            as: 'menuItems',
            where: {
              [Op.or]: [
                { name: { [Op.like]: `%${query}%` } },
                { description: { [Op.like]: `%${query}%` } }
              ]
            },
            required: false
          }
        ],
        limit
      });

      return {
        success: true,
        query,
        count: restaurants.length,
        restaurants: restaurants.map(r => this.formatRestaurantCard(r))
      };
    } catch (error) {
      console.error('Error searching restaurants:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get menu item details with customization options
   */
  async getMenuItemDetails(itemId) {
    try {
      const item = await MenuItem.findByPk(itemId, {
        include: [
          {
            model: Restaurant,
            as: 'restaurant',
            attributes: ['id', 'name', 'cuisine_type', 'minimum_order']
          }
        ]
      });

      if (!item) {
        return { success: false, error: 'Menu item not found' };
      }

      return {
        success: true,
        item: {
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image_url: item.image_url,
          preparation_time: item.preparation_time,
          is_available: item.is_available,
          dietary: {
            vegetarian: item.is_vegetarian,
            vegan: item.is_vegan,
            gluten_free: item.is_gluten_free
          },
          allergens: item.allergens || [],
          calories: item.calories,
          spice_level: item.spice_level,
          customization_options: item.customization_options || [],
          restaurant: item.restaurant
        }
      };
    } catch (error) {
      console.error('Error getting menu item details:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get popular restaurants in a specific area
   */
  async getPopularRestaurants(location, limit = 10) {
    try {
      const restaurants = await Restaurant.findAll({
        where: {
          is_active: true,
          is_verified: true,
          address: { [Op.like]: `%${location}%` },
          rating: { [Op.gte]: 4.0 }
        },
        order: [
          ['rating', 'DESC'],
          ['total_reviews', 'DESC']
        ],
        limit,
        include: [
          {
            model: MenuItem,
            as: 'menuItems',
            where: { is_available: true },
            required: false,
            limit: 3
          }
        ]
      });

      return {
        success: true,
        location,
        count: restaurants.length,
        restaurants: restaurants.map(r => this.formatRestaurantCard(r))
      };
    } catch (error) {
      console.error('Error getting popular restaurants:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get featured/promoted restaurants
   */
  async getFeaturedRestaurants(limit = 10) {
    try {
      const restaurants = await Restaurant.findAll({
        where: {
          is_active: true,
          is_verified: true,
          rating: { [Op.gte]: 4.5 },
          total_reviews: { [Op.gte]: 10 }
        },
        order: [
          ['rating', 'DESC'],
          ['total_reviews', 'DESC']
        ],
        limit,
        include: [
          {
            model: MenuItem,
            as: 'menuItems',
            where: { is_available: true },
            required: false,
            limit: 3
          }
        ]
      });

      return {
        success: true,
        count: restaurants.length,
        restaurants: restaurants.map(r => this.formatRestaurantCard(r))
      };
    } catch (error) {
      console.error('Error getting featured restaurants:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
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
   * Helper: Check if restaurant is currently open
   */
  isRestaurantOpen(operatingHours) {
    if (!operatingHours) return false;
    
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const hours = operatingHours[day];
    if (!hours || !hours.open || !hours.close) return false;
    
    const [openHour, openMin] = hours.open.split(':').map(Number);
    const [closeHour, closeMin] = hours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    return currentTime >= openTime && currentTime <= closeTime;
  }

  /**
   * Helper: Group menu items by category
   */
  groupMenuByCategory(menuItems) {
    const grouped = {};
    
    menuItems.forEach(item => {
      const category = item.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        preparation_time: item.preparation_time,
        dietary: {
          vegetarian: item.is_vegetarian,
          vegan: item.is_vegan,
          gluten_free: item.is_gluten_free
        },
        spice_level: item.spice_level,
        calories: item.calories
      });
    });

    return grouped;
  }

  /**
   * Helper: Format restaurant card for list display
   */
  formatRestaurantCard(restaurant, userLat = null, userLng = null) {
    let distance = null;
    let deliveryTime = null;

    if (userLat && userLng && restaurant.latitude && restaurant.longitude) {
      distance = this.calculateDistance(
        userLat, userLng,
        parseFloat(restaurant.latitude), parseFloat(restaurant.longitude)
      );
      // Estimate delivery time: 5 min prep + 3 min per km
      deliveryTime = Math.round(5 + (distance * 3));
    }

    return {
      id: restaurant.id,
      name: restaurant.name,
      cuisine_type: restaurant.cuisine_type,
      rating: parseFloat(restaurant.rating) || 0,
      total_reviews: restaurant.total_reviews || 0,
      delivery_fee: parseFloat(restaurant.delivery_fee) || 0,
      minimum_order: parseFloat(restaurant.minimum_order) || 0,
      is_open: restaurant.isOpen ? restaurant.isOpen() : this.isRestaurantOpen(restaurant.operating_hours),
      distance: distance ? `${distance.toFixed(1)} km` : null,
      estimated_delivery: deliveryTime ? `${deliveryTime} min` : null,
      logo_url: restaurant.logo_url,
      tags: restaurant.tags || [],
      popular_items: restaurant.menuItems ? restaurant.menuItems.slice(0, 3).map(item => item.name) : []
    };
  }

  /**
   * Get all available states
   */
  getAllStates() {
    return this.nigerianStates;
  }

  /**
   * Get popular cities with coordinates
   */
  getPopularCities() {
    return this.popularCities;
  }

  /**
   * Get all cuisine types
   */
  getAllCuisines() {
    return this.cuisineTypes;
  }

  /**
   * Get menu categories
   */
  getMenuCategories() {
    return this.menuCategories;
  }

  /**
   * Get mock restaurants for testing/fallback when database is empty
   */
  getMockRestaurantsByCuisine(cuisineType) {
    const mockRestaurants = {
      'jollof': [
        { name: 'Jollof Palace', cuisine: 'Nigerian', rating: 4.5, delivery_fee: 500, area: 'Lagos', minimum_order: 2000 },
        { name: 'Rice Kingdom', cuisine: 'Nigerian', rating: 4.3, delivery_fee: 600, area: 'Abuja', minimum_order: 1800 },
        { name: 'Naija Rice Spot', cuisine: 'Nigerian', rating: 4.2, delivery_fee: 550, area: 'Port Harcourt', minimum_order: 2500 }
      ],
      'swallow': [
        { name: 'Mama Put Kitchen', cuisine: 'Nigerian', rating: 4.6, delivery_fee: 450, area: 'Lagos', minimum_order: 1500 },
        { name: 'Eba & Soup Corner', cuisine: 'Nigerian', rating: 4.4, delivery_fee: 500, area: 'Ibadan', minimum_order: 2000 },
        { name: 'Swallow Express', cuisine: 'Nigerian', rating: 4.3, delivery_fee: 550, area: 'Benin', minimum_order: 1800 }
      ],
      'suya': [
        { name: 'Suya Spot', cuisine: 'Nigerian BBQ', rating: 4.7, delivery_fee: 400, area: 'Kano', minimum_order: 1000 },
        { name: 'Asun & Suya House', cuisine: 'Nigerian', rating: 4.5, delivery_fee: 450, area: 'Lagos', minimum_order: 1200 },
        { name: 'Pepper Suya', cuisine: 'Nigerian', rating: 4.4, delivery_fee: 500, area: 'Abuja', minimum_order: 1500 }
      ],
      'smallchops': [
        { name: 'Chops & More', cuisine: 'Fast Food', rating: 4.3, delivery_fee: 550, area: 'Lagos', minimum_order: 3000 },
        { name: 'Party Small Chops', cuisine: 'Nigerian', rating: 4.4, delivery_fee: 500, area: 'Port Harcourt', minimum_order: 2500 },
        { name: 'Puff Puff Palace', cuisine: 'Nigerian', rating: 4.2, delivery_fee: 450, area: 'Enugu', minimum_order: 2000 }
      ],
      'breakfast': [
        { name: 'Breakfast Hub', cuisine: 'Nigerian', rating: 4.5, delivery_fee: 500, area: 'Lagos', minimum_order: 1500 },
        { name: 'Akara & Pap Spot', cuisine: 'Nigerian', rating: 4.4, delivery_fee: 450, area: 'Ibadan', minimum_order: 1000 },
        { name: 'Morning Delights', cuisine: 'Nigerian', rating: 4.3, delivery_fee: 550, area: 'Abuja', minimum_order: 1800 }
      ],
      'soups': [
        { name: 'Soup Kitchen', cuisine: 'Nigerian', rating: 4.6, delivery_fee: 500, area: 'Lagos', minimum_order: 2000 },
        { name: 'Egusi Express', cuisine: 'Nigerian', rating: 4.5, delivery_fee: 550, area: 'Enugu', minimum_order: 2200 },
        { name: 'Banga Soup House', cuisine: 'Nigerian', rating: 4.4, delivery_fee: 500, area: 'Warri', minimum_order: 2000 }
      ]
    };

    return mockRestaurants[cuisineType] || [];
  }

  /**
   * Get mock restaurants for a state
   */
  getMockRestaurantsByState(stateName) {
    return [
      { name: `${stateName} Kitchen`, cuisine: 'Nigerian', rating: 4.5, delivery_fee: 500, area: stateName, minimum_order: 2000, is_open: true },
      { name: 'African Delight', cuisine: 'African', rating: 4.4, delivery_fee: 550, area: stateName, minimum_order: 2200, is_open: true },
      { name: 'Fast Bites', cuisine: 'Fast Food', rating: 4.3, delivery_fee: 600, area: stateName, minimum_order: 1500, is_open: true },
      { name: 'Swallow & Soup House', cuisine: 'Nigerian', rating: 4.6, delivery_fee: 450, area: stateName, minimum_order: 1800, is_open: true },
      { name: 'Suya Master', cuisine: 'BBQ', rating: 4.7, delivery_fee: 400, area: stateName, minimum_order: 1000, is_open: true }
    ];
  }
}

module.exports = new RestaurantDiscoveryService();
