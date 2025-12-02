#!/usr/bin/env node

/**
 * Restaurant Database Population Script
 * 
 * This script fetches real Nigerian restaurants from Google Places API
 * and populates the database with comprehensive restaurant data.
 * 
 * Usage:
 *   node scripts/populate-restaurants.js
 * 
 * Environment Variables Required:
 *   GOOGLE_MAPS_API_KEY - Your Google Maps API key
 */

require('dotenv').config();
const axios = require('axios');
const { sequelize, Restaurant, User, MenuItem } = require('../src/models');

// ALL 36 Nigerian States + FCT (Capital cities)
const NIGERIAN_CITIES = [
  // Major Commercial Centers (larger radius)
  { name: 'Lagos', state: 'Lagos', lat: 6.5244, lng: 3.3792, radius: 50000 },
  { name: 'Abuja', state: 'FCT', lat: 9.0765, lng: 7.3986, radius: 35000 },
  { name: 'Port Harcourt', state: 'Rivers', lat: 4.8156, lng: 7.0498, radius: 30000 },
  { name: 'Kano', state: 'Kano', lat: 12.0022, lng: 8.5920, radius: 30000 },
  { name: 'Ibadan', state: 'Oyo', lat: 7.3775, lng: 3.9470, radius: 30000 },
  
  // State Capitals (South West)
  { name: 'Benin City', state: 'Edo', lat: 6.3350, lng: 5.6037, radius: 20000 },
  { name: 'Abeokuta', state: 'Ogun', lat: 7.1475, lng: 3.3619, radius: 18000 },
  { name: 'Akure', state: 'Ondo', lat: 7.2571, lng: 5.2058, radius: 15000 },
  { name: 'Osogbo', state: 'Osun', lat: 7.7667, lng: 4.5667, radius: 12000 },
  { name: 'Ado Ekiti', state: 'Ekiti', lat: 7.6218, lng: 5.2220, radius: 10000 },
  
  // State Capitals (South East)
  { name: 'Enugu', state: 'Enugu', lat: 6.4474, lng: 7.4983, radius: 20000 },
  { name: 'Owerri', state: 'Imo', lat: 5.4840, lng: 7.0351, radius: 18000 },
  { name: 'Awka', state: 'Anambra', lat: 6.2104, lng: 7.0718, radius: 12000 },
  { name: 'Umuahia', state: 'Abia', lat: 5.5265, lng: 7.4896, radius: 10000 },
  { name: 'Abakaliki', state: 'Ebonyi', lat: 6.3249, lng: 8.1137, radius: 10000 },
  
  // State Capitals (South South)
  { name: 'Calabar', state: 'Cross River', lat: 4.9758, lng: 8.3417, radius: 18000 },
  { name: 'Uyo', state: 'Akwa Ibom', lat: 5.0378, lng: 7.9085, radius: 18000 },
  { name: 'Asaba', state: 'Delta', lat: 6.1924, lng: 6.6998, radius: 15000 },
  { name: 'Yenagoa', state: 'Bayelsa', lat: 4.9267, lng: 6.2676, radius: 10000 },
  
  // State Capitals (North Central)
  { name: 'Ilorin', state: 'Kwara', lat: 8.4966, lng: 4.5426, radius: 18000 },
  { name: 'Jos', state: 'Plateau', lat: 9.8965, lng: 8.8583, radius: 18000 },
  { name: 'Makurdi', state: 'Benue', lat: 7.7333, lng: 8.5333, radius: 15000 },
  { name: 'Lokoja', state: 'Kogi', lat: 7.7974, lng: 6.7407, radius: 12000 },
  { name: 'Lafia', state: 'Nasarawa', lat: 8.4938, lng: 8.5148, radius: 10000 },
  { name: 'Minna', state: 'Niger', lat: 9.6139, lng: 6.5569, radius: 12000 },
  
  // State Capitals (North West)
  { name: 'Kaduna', state: 'Kaduna', lat: 10.5105, lng: 7.4165, radius: 25000 },
  { name: 'Sokoto', state: 'Sokoto', lat: 13.0622, lng: 5.2339, radius: 15000 },
  { name: 'Katsina', state: 'Katsina', lat: 12.9908, lng: 7.6177, radius: 15000 },
  { name: 'Gusau', state: 'Zamfara', lat: 12.1704, lng: 6.6643, radius: 12000 },
  { name: 'Birnin Kebbi', state: 'Kebbi', lat: 12.4532, lng: 4.1991, radius: 10000 },
  { name: 'Dutse', state: 'Jigawa', lat: 11.7594, lng: 9.3381, radius: 10000 },
  
  // State Capitals (North East)
  { name: 'Maiduguri', state: 'Borno', lat: 11.8333, lng: 13.1500, radius: 15000 },
  { name: 'Bauchi', state: 'Bauchi', lat: 10.3158, lng: 9.8442, radius: 15000 },
  { name: 'Yola', state: 'Adamawa', lat: 9.2084, lng: 12.4801, radius: 12000 },
  { name: 'Gombe', state: 'Gombe', lat: 10.2897, lng: 11.1709, radius: 10000 },
  { name: 'Jalingo', state: 'Taraba', lat: 8.8934, lng: 11.3592, radius: 10000 },
  { name: 'Damaturu', state: 'Yobe', lat: 11.7468, lng: 11.9612, radius: 8000 },
];

// Cuisine types to search for
const CUISINE_TYPES = [
  'restaurant',
  'nigerian restaurant',
  'african restaurant',
  'fast food',
  'cafe',
  'bar',
  'pizza',
  'chinese restaurant',
  'indian restaurant',
  'italian restaurant',
  'american restaurant',
];

class RestaurantPopulator {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.systemUser = null;
    this.totalAdded = 0;
    this.totalSkipped = 0;
    this.errors = 0;
  }

  async initialize() {
    console.log('\n🚀 Restaurant Database Populator Started\n');
    console.log('=' .repeat(60));

    if (!this.apiKey) {
      throw new Error('❌ GOOGLE_MAPS_API_KEY not found in environment variables');
    }

    // Connect to database
    try {
      await sequelize.authenticate();
      console.log('✅ Database connected');
    } catch (error) {
      throw new Error(`❌ Database connection failed: ${error.message}`);
    }

    // Sync database
    await sequelize.sync({ alter: false });
    console.log('✅ Database synchronized');

    // Get or create system user
    this.systemUser = await this.getSystemUser();
    console.log(`✅ System user ready (ID: ${this.systemUser.id})`);
    console.log('=' .repeat(60) + '\n');
  }

  async getSystemUser() {
    const [user] = await User.findOrCreate({
      where: { telegram_id: 0 },
      defaults: {
        telegram_id: 0,
        first_name: 'System',
        last_name: 'Admin',
        username: 'system_admin',
        language_code: 'en'
      }
    });
    return user;
  }

  async fetchPlacesInCity(city, type) {
    const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    
    try {
      const response = await axios.get(url, {
        params: {
          location: `${city.lat},${city.lng}`,
          radius: city.radius,
          type: 'restaurant',
          keyword: type,
          key: this.apiKey
        }
      });

      if (response.data.status === 'OK') {
        return response.data.results || [];
      } else if (response.data.status === 'ZERO_RESULTS') {
        return [];
      } else {
        console.warn(`⚠️  API Warning for ${city.name} (${type}): ${response.data.status}`);
        return [];
      }
    } catch (error) {
      console.error(`❌ Error fetching ${type} in ${city.name}:`, error.message);
      return [];
    }
  }

  async getPlaceDetails(placeId) {
    const url = 'https://maps.googleapis.com/maps/api/place/details/json';
    
    try {
      const response = await axios.get(url, {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,price_level,types',
          key: this.apiKey
        }
      });

      if (response.data.status === 'OK') {
        return response.data.result;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error fetching details for place ${placeId}:`, error.message);
      return null;
    }
  }

  determineCuisineType(place) {
    const types = place.types || [];
    const name = place.name.toLowerCase();

    // Nigerian/African
    if (name.includes('bukka') || name.includes('mama put') || 
        name.includes('amala') || name.includes('jollof') ||
        name.includes('suya') || name.includes('nigerian') ||
        name.includes('african')) {
      return 'Nigerian';
    }

    // Fast Food
    if (types.includes('meal_takeaway') || types.includes('fast_food') ||
        name.includes('chicken') || name.includes('shawarma') ||
        name.includes('burger') || name.includes('kfc') || 
        name.includes('domino') || name.includes('subway')) {
      return 'Fast Food';
    }

    // Chinese
    if (types.includes('chinese_restaurant') || name.includes('chinese') || 
        name.includes('wok') || name.includes('dragon')) {
      return 'Chinese';
    }

    // Indian
    if (types.includes('indian_restaurant') || name.includes('indian') || 
        name.includes('curry') || name.includes('tandoori')) {
      return 'Indian';
    }

    // Italian
    if (types.includes('italian_restaurant') || name.includes('pizza') || 
        name.includes('pasta') || name.includes('italian')) {
      return 'Italian';
    }

    // Continental
    if (types.includes('restaurant') || types.includes('fine_dining')) {
      return 'Continental';
    }

    // Cafe/Bakery
    if (types.includes('cafe') || types.includes('bakery') || 
        name.includes('cafe') || name.includes('bakery')) {
      return 'Cafe';
    }

    return 'General';
  }

  formatOperatingHours(openingHours) {
    if (!openingHours || !openingHours.periods) return {};

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const formatted = {};

    try {
      openingHours.periods.forEach(period => {
        const dayIndex = period.open.day;
        const dayName = days[dayIndex];
        
        if (period.open && period.close) {
          formatted[dayName] = {
            open: `${period.open.time.substring(0, 2)}:${period.open.time.substring(2)}`,
            close: `${period.close.time.substring(0, 2)}:${period.close.time.substring(2)}`
          };
        }
      });
    } catch (error) {
      console.warn('⚠️  Error formatting hours:', error.message);
    }

    return formatted;
  }

  async saveRestaurant(place, city, details) {
    try {
      // Check if restaurant already exists by name and approximate location
      const existing = await Restaurant.findOne({
        where: {
          name: place.name,
          latitude: {
            [sequelize.Sequelize.Op.between]: [
              place.geometry.location.lat - 0.001,
              place.geometry.location.lat + 0.001
            ]
          },
          longitude: {
            [sequelize.Sequelize.Op.between]: [
              place.geometry.location.lng - 0.001,
              place.geometry.location.lng + 0.001
            ]
          }
        }
      });

      if (existing) {
        this.totalSkipped++;
        return false;
      }

      // Prepare restaurant data
      const cuisineType = this.determineCuisineType(place);
      const operatingHours = details?.opening_hours ? 
        this.formatOperatingHours(details.opening_hours) : {};

      const restaurantData = {
        owner_id: this.systemUser.id,
        name: place.name,
        description: `${cuisineType} restaurant in ${city.name}, ${city.state}`,
        address: place.vicinity || details?.formatted_address || `${city.name}, ${city.state}`,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        phone: details?.formatted_phone_number || null,
        email: null, // Not available from API
        cuisine_type: cuisineType,
        operating_hours: operatingHours,
        delivery_radius: 5.0, // Default 5km
        delivery_fee: Math.floor(Math.random() * 500) + 300, // 300-800 NGN
        minimum_order: Math.floor(Math.random() * 2000) + 1000, // 1000-3000 NGN
        rating: place.rating || 0,
        total_reviews: place.user_ratings_total || 0,
        is_active: true,
        is_verified: place.rating >= 4.0, // Auto-verify highly rated places
        logo_url: null,
        cover_image_url: null,
        tags: [city.name, city.state, cuisineType.toLowerCase()],
        features: ['delivery', 'pickup', 'dine-in']
      };

      await Restaurant.create(restaurantData);
      this.totalAdded++;
      
      console.log(`  ✅ ${place.name} - ${cuisineType} - ⭐${place.rating || 'N/A'}`);
      return true;

    } catch (error) {
      console.error(`  ❌ Error saving ${place.name}:`, error.message);
      this.errors++;
      return false;
    }
  }

  async populateCity(city) {
    console.log(`\n📍 ${city.name}, ${city.state}`);
    console.log('-'.repeat(60));

    let cityTotal = 0;

    for (const type of CUISINE_TYPES) {
      const places = await this.fetchPlacesInCity(city, type);
      
      if (places.length === 0) continue;

      console.log(`\n🔍 Found ${places.length} places for "${type}"`);

      for (const place of places) {
        // Get detailed information for better accuracy
        let details = null;
        if (place.place_id) {
          details = await this.getPlaceDetails(place.place_id);
          await this.delay(100); // Respect API rate limits
        }

        const saved = await this.saveRestaurant(place, city, details);
        if (saved) cityTotal++;
      }

      // Delay between cuisine type searches
      await this.delay(500);
    }

    console.log(`\n✅ ${city.name} Complete: ${cityTotal} restaurants added\n`);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    await this.initialize();

    console.log(`📊 Processing ${NIGERIAN_CITIES.length} cities...\n`);

    for (const city of NIGERIAN_CITIES) {
      await this.populateCity(city);
    }

    await this.generateReport();
  }

  async generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 POPULATION REPORT');
    console.log('='.repeat(60));

    const totalRestaurants = await Restaurant.count();
    const byState = await Restaurant.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        'tags'
      ],
      group: ['tags'],
      raw: true
    });

    const byCuisine = await Restaurant.findAll({
      attributes: [
        'cuisine_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['cuisine_type'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    });

    console.log('\n📈 Statistics:');
    console.log(`   Total Restaurants in Database: ${totalRestaurants}`);
    console.log(`   ✅ Added this session: ${this.totalAdded}`);
    console.log(`   ⏭️  Skipped (duplicates): ${this.totalSkipped}`);
    console.log(`   ❌ Errors: ${this.errors}`);

    console.log('\n🍽️  By Cuisine Type:');
    byCuisine.forEach(item => {
      console.log(`   ${item.cuisine_type}: ${item.count}`);
    });

    console.log('\n📍 Coverage:');
    console.log(`   Cities processed: ${NIGERIAN_CITIES.length}`);
    
    // Get restaurants with valid coordinates
    const withCoordinates = await Restaurant.count({
      where: {
        latitude: { [sequelize.Sequelize.Op.ne]: null },
        longitude: { [sequelize.Sequelize.Op.ne]: null }
      }
    });
    console.log(`   Restaurants with GPS coordinates: ${withCoordinates}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Database population complete!');
    console.log('='.repeat(60) + '\n');
  }
}

// Run the populator
(async () => {
  const populator = new RestaurantPopulator();
  
  try {
    await populator.run();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
