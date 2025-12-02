/**
 * HotelDiscoveryService - Hotels.ng-style hotel discovery with Google Maps integration
 * 
 * Features:
 * - Browse hotels by Nigerian states and cities
 * - Google Maps Places API integration for real-time hotel search
 * - Location-based nearby hotel discovery
 * - Filter by price, rating, amenities
 * - Real hotel data from Google Maps
 */

const axios = require('axios');

class HotelDiscoveryService {
  /**
   * Nigerian states with major cities and coordinates
   * Based on Hotels.ng location structure
   */
  static NIGERIAN_STATES = {
    'Lagos': {
      cities: [
        { name: 'Ikeja', lat: 6.5964, lng: 3.3486 },
        { name: 'Victoria Island', lat: 6.4281, lng: 3.4219 },
        { name: 'Lekki', lat: 6.4474, lng: 3.5560 },
        { name: 'Yaba', lat: 6.5074, lng: 3.3755 },
        { name: 'Surulere', lat: 6.4969, lng: 3.3609 },
        { name: 'Ikoyi', lat: 6.4541, lng: 3.4316 },
        { name: 'Apapa', lat: 6.4474, lng: 3.3595 },
        { name: 'Maryland', lat: 6.5795, lng: 3.3673 }
      ]
    },
    'Abuja': {
      cities: [
        { name: 'Central Area', lat: 9.0765, lng: 7.3986 },
        { name: 'Garki', lat: 9.0359, lng: 7.4905 },
        { name: 'Wuse', lat: 9.0579, lng: 7.4950 },
        { name: 'Maitama', lat: 9.0982, lng: 7.4897 },
        { name: 'Asokoro', lat: 9.0321, lng: 7.5243 },
        { name: 'Gwarinpa', lat: 9.1108, lng: 7.4117 }
      ]
    },
    'Rivers': {
      cities: [
        { name: 'Port Harcourt', lat: 4.8156, lng: 7.0498 },
        { name: 'GRA Phase 1', lat: 4.8145, lng: 7.0085 },
        { name: 'GRA Phase 2', lat: 4.8256, lng: 7.0269 },
        { name: 'Trans Amadi', lat: 4.8008, lng: 7.0395 }
      ]
    },
    'Kano': {
      cities: [
        { name: 'Kano City', lat: 12.0022, lng: 8.5920 },
        { name: 'Sabon Gari', lat: 11.9946, lng: 8.5456 },
        { name: 'Nassarawa', lat: 12.0105, lng: 8.5456 }
      ]
    },
    'Oyo': {
      cities: [
        { name: 'Ibadan', lat: 7.3775, lng: 3.9470 },
        { name: 'Bodija', lat: 7.4345, lng: 3.9067 },
        { name: 'Agodi', lat: 7.3964, lng: 3.9167 }
      ]
    },
    'Edo': {
      cities: [
        { name: 'Benin City', lat: 6.3350, lng: 5.6037 },
        { name: 'Benin', lat: 6.3350, lng: 5.6037 }, // Same as Benin City
        { name: 'GRA', lat: 6.3176, lng: 5.6145 }
      ]
    },
    'Kaduna': {
      cities: [
        { name: 'Kaduna City', lat: 10.5105, lng: 7.4165 },
        { name: 'Barnawa', lat: 10.4806, lng: 7.4328 }
      ]
    },
    'Delta': {
      cities: [
        { name: 'Warri', lat: 5.5167, lng: 5.7500 },
        { name: 'Asaba', lat: 6.1999, lng: 6.7300 }
      ]
    },
    'Anambra': {
      cities: [
        { name: 'Awka', lat: 6.2104, lng: 7.0719 },
        { name: 'Onitsha', lat: 6.1495, lng: 6.7882 }
      ]
    },
    'Enugu': {
      cities: [
        { name: 'Enugu City', lat: 6.4403, lng: 7.4962 },
        { name: 'GRA', lat: 6.4531, lng: 7.5248 }
      ]
    },
    'Akwa Ibom': {
      cities: [
        { name: 'Uyo', lat: 5.0378, lng: 7.9085 }
      ]
    },
    'Ondo': {
      cities: [
        { name: 'Akure', lat: 7.2571, lng: 5.2058 }
      ]
    },
    'Osun': {
      cities: [
        { name: 'Osogbo', lat: 7.7667, lng: 4.5667 },
        { name: 'Ile-Ife', lat: 7.4815, lng: 4.5603 }
      ]
    },
    'Imo': {
      cities: [
        { name: 'Owerri', lat: 5.4840, lng: 7.0351 }
      ]
    },
    'Abia': {
      cities: [
        { name: 'Umuahia', lat: 5.5265, lng: 7.4896 },
        { name: 'Aba', lat: 5.1066, lng: 7.3667 }
      ]
    },
    'Cross River': {
      cities: [
        { name: 'Calabar', lat: 4.9517, lng: 8.3417 }
      ]
    },
    'Plateau': {
      cities: [
        { name: 'Jos', lat: 9.9167, lng: 8.8833 }
      ]
    },
    'Kwara': {
      cities: [
        { name: 'Ilorin', lat: 8.4966, lng: 4.5426 }
      ]
    },
    'Ogun': {
      cities: [
        { name: 'Abeokuta', lat: 7.1475, lng: 3.3619 },
        { name: 'Sagamu', lat: 6.8396, lng: 3.6469 }
      ]
    },
    'Bayelsa': {
      cities: [
        { name: 'Yenagoa', lat: 4.9267, lng: 6.2676 }
      ]
    },
    'Benue': {
      cities: [
        { name: 'Makurdi', lat: 7.7364, lng: 8.5219 }
      ]
    },
    'Borno': {
      cities: [
        { name: 'Maiduguri', lat: 11.8333, lng: 13.1500 }
      ]
    },
    'Ekiti': {
      cities: [
        { name: 'Ado-Ekiti', lat: 7.6163, lng: 5.2206 }
      ]
    },
    'Gombe': {
      cities: [
        { name: 'Gombe', lat: 10.2897, lng: 11.1706 }
      ]
    },
    'Jigawa': {
      cities: [
        { name: 'Dutse', lat: 11.7568, lng: 9.3367 }
      ]
    },
    'Kebbi': {
      cities: [
        { name: 'Birnin Kebbi', lat: 12.4539, lng: 4.1975 }
      ]
    },
    'Kogi': {
      cities: [
        { name: 'Lokoja', lat: 7.7974, lng: 6.7406 }
      ]
    },
    'Nasarawa': {
      cities: [
        { name: 'Lafia', lat: 8.4935, lng: 8.5152 }
      ]
    },
    'Niger': {
      cities: [
        { name: 'Minna', lat: 9.6139, lng: 6.5569 }
      ]
    },
    'Sokoto': {
      cities: [
        { name: 'Sokoto', lat: 13.0622, lng: 5.2339 }
      ]
    },
    'Taraba': {
      cities: [
        { name: 'Jalingo', lat: 8.8959, lng: 11.3596 }
      ]
    },
    'Yobe': {
      cities: [
        { name: 'Damaturu', lat: 11.7473, lng: 11.9608 }
      ]
    },
    'Zamfara': {
      cities: [
        { name: 'Gusau', lat: 12.1642, lng: 6.6584 }
      ]
    }
  };

  /**
   * Hotel categories for filtering
   */
  static HOTEL_CATEGORIES = [
    { id: 'luxury', name: '⭐ Luxury Hotels', emoji: '💎' },
    { id: 'business', name: '💼 Business Hotels', emoji: '🏢' },
    { id: 'budget', name: '💰 Budget Hotels', emoji: '🏨' },
    { id: 'resort', name: '🏖️ Resorts', emoji: '🌴' },
    { id: 'boutique', name: '✨ Boutique Hotels', emoji: '🎨' },
    { id: 'apartment', name: '🏠 Serviced Apartments', emoji: '🏘️' }
  ];

  /**
   * Browse hotels by Nigerian state
   * @param {string} stateName - Nigerian state name
   * @param {number} limit - Maximum number of hotels
   * @returns {Promise<Object>} State info with cities
   */
  static async browseHotelsByState(stateName, limit = 20) {
    try {
      const stateData = this.NIGERIAN_STATES[stateName];
      
      if (!stateData) {
        return {
          success: false,
          error: 'State not found',
          availableStates: Object.keys(this.NIGERIAN_STATES)
        };
      }

      return {
        success: true,
        state: stateName,
        cities: stateData.cities,
        totalCities: stateData.cities.length
      };
    } catch (error) {
      console.error('Error browsing hotels by state:', error);
      throw error;
    }
  }

  /**
   * Get all Nigerian states for selection menu
   * @returns {Array} List of states
   */
  static getAllStates() {
    return Object.keys(this.NIGERIAN_STATES).sort();
  }

  /**
   * Find hotels near user location using Google Maps Places API
   * @param {number} latitude - User latitude
   * @param {number} longitude - User longitude
   * @param {number} radius - Search radius in meters (default 5000m = 5km)
   * @param {string} apiKey - Google Maps API key
   * @returns {Promise<Array>} List of nearby hotels from Google Maps
   */
  static async findNearbyHotelsGoogle(latitude, longitude, radius = 5000, apiKey = null) {
    try {
      if (!apiKey) {
        // Fallback to mock data if no API key
        console.warn('⚠️ No Google Maps API key provided, using mock data');
        return this.getMockNearbyHotels(latitude, longitude, radius);
      }

      // Google Places API - Nearby Search
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params: {
          location: `${latitude},${longitude}`,
          radius: radius,
          type: 'lodging', // Hotels, motels, etc.
          key: apiKey
        }
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      const hotels = response.data.results.map(place => ({
        id: place.place_id,
        name: place.name,
        address: place.vicinity,
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        rating: place.rating || 0,
        totalRatings: place.user_ratings_total || 0,
        priceLevel: place.price_level || 2, // 1-4 scale
        isOpen: place.opening_hours?.open_now,
        photos: place.photos || [],
        distance: this.calculateDistance(
          latitude,
          longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        ),
        source: 'google_maps'
      }));

      // Sort by distance
      hotels.sort((a, b) => a.distance - b.distance);

      return hotels;
    } catch (error) {
      console.error('Error finding nearby hotels with Google Maps:', error.message);
      // Fallback to mock data
      return this.getMockNearbyHotels(latitude, longitude, radius);
    }
  }

  /**
   * Search hotels in a specific city using Google Maps
   * @param {string} cityName - City name
   * @param {string} stateName - State name (optional)
   * @param {string} apiKey - Google Maps API key
   * @returns {Promise<Array>} List of hotels in the city
   */
  static async searchHotelsInCity(cityName, stateName = null, apiKey = null) {
    try {
      // Get city coordinates
      const cityData = this.getCityCoordinates(cityName, stateName);
      
      if (!cityData) {
        return {
          success: false,
          error: 'City not found',
          suggestion: 'Try browsing by state first'
        };
      }

      // Search hotels near city center
      const hotels = await this.findNearbyHotelsGoogle(
        cityData.lat,
        cityData.lng,
        10000, // 10km radius for city search
        apiKey
      );

      return {
        success: true,
        city: cityData.name,
        state: cityData.state,
        hotels: hotels,
        totalHotels: hotels.length
      };
    } catch (error) {
      console.error('Error searching hotels in city:', error);
      throw error;
    }
  }

  /**
   * Get hotel details from Google Places
   * @param {string} placeId - Google Place ID
   * @param {string} apiKey - Google Maps API key
   * @returns {Promise<Object>} Detailed hotel information
   */
  static async getHotelDetails(placeId, apiKey = null) {
    try {
      if (!apiKey) {
        return this.getMockHotelDetails(placeId);
      }

      const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: {
          place_id: placeId,
          fields: 'name,rating,formatted_phone_number,formatted_address,opening_hours,website,photos,reviews,price_level,types,geometry',
          key: apiKey
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      const place = response.data.result;

      return {
        id: placeId,
        name: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        website: place.website,
        rating: place.rating || 0,
        priceLevel: place.price_level || 2,
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        openingHours: place.opening_hours,
        photos: place.photos || [],
        reviews: place.reviews || [],
        types: place.types || [],
        source: 'google_maps'
      };
    } catch (error) {
      console.error('Error getting hotel details:', error);
      return this.getMockHotelDetails(placeId);
    }
  }

  /**
   * Get city coordinates
   * @param {string} cityName - City name
   * @param {string} stateName - State name (optional)
   * @returns {Object|null} City data with coordinates
   */
  static getCityCoordinates(cityName, stateName = null) {
    const cityLower = cityName.toLowerCase().trim();

    // Search in specific state
    if (stateName && this.NIGERIAN_STATES[stateName]) {
      // Exact match first
      let city = this.NIGERIAN_STATES[stateName].cities.find(
        c => c.name.toLowerCase() === cityLower
      );
      if (city) {
        return { ...city, state: stateName };
      }
      
      // Partial match
      city = this.NIGERIAN_STATES[stateName].cities.find(
        c => c.name.toLowerCase().includes(cityLower) || cityLower.includes(c.name.toLowerCase())
      );
      if (city) {
        return { ...city, state: stateName };
      }
    }

    // Search across all states - Exact match first
    for (const [state, data] of Object.entries(this.NIGERIAN_STATES)) {
      const city = data.cities.find(c => c.name.toLowerCase() === cityLower);
      if (city) {
        return { ...city, state: state };
      }
    }
    
    // Search across all states - Partial match
    for (const [state, data] of Object.entries(this.NIGERIAN_STATES)) {
      const city = data.cities.find(c => 
        c.name.toLowerCase().includes(cityLower) || 
        cityLower.includes(c.name.toLowerCase())
      );
      if (city) {
        return { ...city, state: state };
      }
    }

    return null;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Distance in kilometers
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal
  }

  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Mock nearby hotels (fallback when no API key)
   * @param {number} latitude - User latitude
   * @param {number} longitude - User longitude
   * @param {number} radius - Search radius
   * @returns {Array} Mock hotel data
   */
  static getMockNearbyHotels(latitude, longitude, radius) {
    const mockHotels = [
      {
        id: 'mock_1',
        name: 'Grand Plaza Hotel',
        address: 'Near your location',
        location: { lat: latitude + 0.01, lng: longitude + 0.01 },
        rating: 4.5,
        totalRatings: 245,
        priceLevel: 3,
        isOpen: true,
        distance: 1.2,
        source: 'mock'
      },
      {
        id: 'mock_2',
        name: 'City View Suites',
        address: 'Near your location',
        location: { lat: latitude + 0.015, lng: longitude - 0.01 },
        rating: 4.2,
        totalRatings: 189,
        priceLevel: 2,
        isOpen: true,
        distance: 1.8,
        source: 'mock'
      },
      {
        id: 'mock_3',
        name: 'Budget Inn',
        address: 'Near your location',
        location: { lat: latitude - 0.01, lng: longitude + 0.015 },
        rating: 3.8,
        totalRatings: 120,
        priceLevel: 1,
        isOpen: true,
        distance: 2.3,
        source: 'mock'
      }
    ];

    return mockHotels.filter(hotel => hotel.distance <= radius / 1000);
  }

  /**
   * Mock hotel details (fallback)
   */
  static getMockHotelDetails(placeId) {
    return {
      id: placeId,
      name: 'Sample Hotel',
      address: 'Sample Address, Nigeria',
      phone: '+234 XXX XXX XXXX',
      rating: 4.0,
      priceLevel: 2,
      location: { lat: 6.5244, lng: 3.3792 },
      openingHours: {
        open_now: true,
        weekday_text: ['Open 24 hours']
      },
      reviews: [],
      source: 'mock'
    };
  }

  /**
   * Get photo URL from Google Places
   * @param {Object} photo - Photo object from Google Places
   * @param {string} apiKey - Google Maps API key
   * @param {number} maxWidth - Maximum width
   * @returns {string} Photo URL
   */
  static getPhotoUrl(photo, apiKey, maxWidth = 400) {
    if (!photo || !photo.photo_reference || !apiKey) {
      return null;
    }

    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photo.photo_reference}&key=${apiKey}`;
  }

  /**
   * Format price level to Nigerian Naira estimate
   * @param {number} priceLevel - Google's 1-4 price level
   * @returns {string} Price range in Naira
   */
  static formatPriceRange(priceLevel) {
    const priceRanges = {
      1: '₦5,000 - ₦15,000',
      2: '₦15,000 - ₦35,000',
      3: '₦35,000 - ₦75,000',
      4: '₦75,000+'
    };

    return priceRanges[priceLevel] || '₦15,000 - ₦35,000';
  }
}

module.exports = HotelDiscoveryService;
