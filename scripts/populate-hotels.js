#!/usr/bin/env node

/**
 * Hotel Database Population Script
 * 
 * This script fetches real Nigerian hotels from Google Places API
 * and populates the database with comprehensive hotel data.
 * 
 * Usage:
 *   node scripts/populate-hotels.js
 * 
 * Environment Variables Required:
 *   GOOGLE_MAPS_API_KEY - Your Google Maps API key
 */

require('dotenv').config();
const axios = require('axios');
const { sequelize, Hotel, User } = require('../src/models');

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

// Hotel search types
const HOTEL_TYPES = [
  'hotel',
  'lodging',
  'resort',
  'guest_house',
];

class HotelPopulator {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.systemUser = null;
    this.totalAdded = 0;
    this.totalSkipped = 0;
    this.errors = 0;
  }

  async initialize() {
    console.log('\n🏨 Hotel Database Populator Started\n');
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
          type: type,
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
          fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,types',
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

  determineHotelCategory(place) {
    const types = place.types || [];
    const name = place.name.toLowerCase();
    const rating = place.rating || 0;

    // Luxury Hotels (5-star equivalent)
    if (rating >= 4.5 || name.includes('hilton') || name.includes('sheraton') ||
        name.includes('intercontinental') || name.includes('radisson') ||
        name.includes('eko hotel') || name.includes('transcorp')) {
      return 'Luxury';
    }

    // Business Hotels
    if (name.includes('business') || name.includes('executive') || 
        name.includes('suites')) {
      return 'Business';
    }

    // Budget Hotels
    if (types.includes('guest_house') || name.includes('guest') ||
        name.includes('lodge') || name.includes('inn') || rating < 3.5) {
      return 'Budget';
    }

    // Resort/Leisure
    if (types.includes('resort') || name.includes('resort') || 
        name.includes('leisure')) {
      return 'Resort';
    }

    // Default to Standard
    return 'Standard';
  }

  determinePriceRange(place) {
    const category = this.determineHotelCategory(place);
    const priceLevel = place.price_level || 2;

    switch (category) {
      case 'Luxury':
        return { min: 35000, max: 150000 }; // ₦35,000 - ₦150,000 per night
      case 'Business':
        return { min: 20000, max: 60000 }; // ₦20,000 - ₦60,000
      case 'Standard':
        return { min: 12000, max: 35000 }; // ₦12,000 - ₦35,000
      case 'Budget':
        return { min: 5000, max: 15000 }; // ₦5,000 - ₦15,000
      case 'Resort':
        return { min: 25000, max: 80000 }; // ₦25,000 - ₦80,000
      default:
        return { min: 10000, max: 30000 };
    }
  }

  generateAmenities(category, place) {
    const baseAmenities = ['WiFi', 'Air Conditioning', 'TV', 'Room Service'];
    
    switch (category) {
      case 'Luxury':
        return [...baseAmenities, 'Swimming Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Concierge', 'Airport Shuttle', 'Conference Rooms'];
      case 'Business':
        return [...baseAmenities, 'Business Center', 'Meeting Rooms', 'Conference Facilities', 'Gym', 'Restaurant'];
      case 'Standard':
        return [...baseAmenities, 'Restaurant', 'Parking', 'Laundry'];
      case 'Budget':
        return ['WiFi', 'TV', 'Fan/AC', 'Parking'];
      case 'Resort':
        return [...baseAmenities, 'Swimming Pool', 'Beach Access', 'Spa', 'Restaurant', 'Bar', 'Activities'];
      default:
        return baseAmenities;
    }
  }

  async saveHotel(place, city, details) {
    try {
      // Check if hotel already exists
      const existing = await Hotel.findOne({
        where: {
          hotel_name: place.name,
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

      const category = this.determineHotelCategory(place);
      const amenities = this.generateAmenities(category, place);

      const hotelData = {
        owner_id: this.systemUser.id,
        hotel_name: place.name,
        description: `${category} hotel in ${city.name}, ${city.state}. Google Maps rating: ${place.rating || 'N/A'}`,
        address: place.vicinity || details?.formatted_address || `${city.name}, ${city.state}`,
        city: city.name,
        state: city.state,
        country: 'Nigeria',
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        contact_phone: details?.formatted_phone_number || '+234-XXX-XXXX-XXX',
        contact_email: null,
        whatsapp_number: null,
        star_rating: Math.min(5, Math.ceil((place.rating || 3) / 0.9)), // Convert 0-5 rating to star rating
        amenities: amenities,
        check_in_time: '14:00',
        check_out_time: '12:00',
        cancellation_policy: 'Free cancellation up to 24 hours before check-in',
        payment_methods: ['cash', 'bank_transfer', 'card'],
        rating: place.rating || 0,
        total_reviews: place.user_ratings_total || 0,
        is_active: true,
        is_verified: place.rating >= 4.0,
        status: 'approved',
        metadata: {
          google_place_id: place.place_id || null,
          google_maps_url: place.place_id ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}` : null,
          category: category
        }
      };

      await Hotel.create(hotelData);
      this.totalAdded++;
      
      console.log(`  ✅ ${place.name} - ${category} - ⭐${place.rating || 'N/A'} (${place.user_ratings_total || 0} reviews)`);
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
    const allPlaces = new Set(); // Track unique places by place_id

    for (const type of HOTEL_TYPES) {
      const places = await this.fetchPlacesInCity(city, type);
      
      if (places.length === 0) continue;

      console.log(`\n🔍 Found ${places.length} places for "${type}"`);

      for (const place of places) {
        // Skip duplicates
        if (allPlaces.has(place.place_id)) continue;
        allPlaces.add(place.place_id);

        // Get detailed information
        let details = null;
        if (place.place_id) {
          details = await this.getPlaceDetails(place.place_id);
          await this.delay(100); // Respect API rate limits
        }

        const saved = await this.saveHotel(place, city, details);
        if (saved) cityTotal++;
      }

      // Delay between type searches
      await this.delay(500);
    }

    console.log(`\n✅ ${city.name} Complete: ${cityTotal} hotels added\n`);
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
    console.log('📊 HOTEL POPULATION REPORT');
    console.log('='.repeat(60));

    const totalHotels = await Hotel.count();
    
    const byState = await Hotel.findAll({
      attributes: [
        'state',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['state'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    const byStarRating = await Hotel.findAll({
      attributes: [
        'star_rating',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['star_rating'],
      order: [['star_rating', 'DESC']],
      raw: true
    });

    console.log('\n📈 Statistics:');
    console.log(`   Total Hotels in Database: ${totalHotels}`);
    console.log(`   ✅ Added this session: ${this.totalAdded}`);
    console.log(`   ⏭️  Skipped (duplicates): ${this.totalSkipped}`);
    console.log(`   ❌ Errors: ${this.errors}`);

    console.log('\n⭐ By Star Rating:');
    byStarRating.forEach(item => {
      const stars = '⭐'.repeat(item.star_rating);
      console.log(`   ${stars} (${item.star_rating}-star): ${item.count} hotels`);
    });

    console.log('\n📍 Top 10 States by Hotel Count:');
    byState.forEach(item => {
      console.log(`   ${item.state}: ${item.count} hotels`);
    });

    console.log('\n🗺️  Coverage:');
    console.log(`   Cities processed: ${NIGERIAN_CITIES.length}`);
    
    const withCoordinates = await Hotel.count({
      where: {
        latitude: { [sequelize.Sequelize.Op.ne]: null },
        longitude: { [sequelize.Sequelize.Op.ne]: null }
      }
    });
    console.log(`   Hotels with GPS coordinates: ${withCoordinates}`);

    const verified = await Hotel.count({ where: { is_verified: true } });
    console.log(`   Verified hotels: ${verified}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Hotel database population complete!');
    console.log('='.repeat(60) + '\n');
  }
}

// Run the populator
(async () => {
  const populator = new HotelPopulator();
  
  try {
    await populator.run();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
