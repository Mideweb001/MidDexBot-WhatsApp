const { Hotel, HotelBooking, HotelReview, User } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');

class HotelService {
  constructor(databaseService) {
    this.databaseService = databaseService;
    
    // API Configuration - Add your API keys to .env
    this.apis = {
      booking: {
        enabled: !!process.env.BOOKING_API_KEY,
        key: process.env.BOOKING_API_KEY,
        baseUrl: 'https://distribution-xml.booking.com/2.7/json'
      },
      amadeus: {
        enabled: !!process.env.AMADEUS_API_KEY,
        key: process.env.AMADEUS_API_KEY,
        secret: process.env.AMADEUS_API_SECRET,
        baseUrl: 'https://api.amadeus.com/v1'
      },
      rapidapi: {
        enabled: !!process.env.RAPIDAPI_KEY,
        key: process.env.RAPIDAPI_KEY,
        baseUrl: 'https://booking-com.p.rapidapi.com/v1'
      }
    };

    // Nigerian states for validation
    this.nigerianStates = [
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
      'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
      'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
      'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
      'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT'
    ];
  }

  // ===== HOTEL REGISTRATION =====

  async registerHotel(userId, hotelData) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate state
      if (!this.nigerianStates.includes(hotelData.state)) {
        throw new Error('Invalid state. Please provide a valid Nigerian state.');
      }

      // Get coordinates from address if not provided
      if (!hotelData.latitude || !hotelData.longitude) {
        const coords = await this.geocodeAddress(`${hotelData.address}, ${hotelData.city}, ${hotelData.state}, Nigeria`);
        hotelData.latitude = coords.lat;
        hotelData.longitude = coords.lon;
      }

      const hotel = await Hotel.create({
        owner_id: user.id,
        ...hotelData,
        status: 'pending' // Requires admin approval
      });

      return hotel;
    } catch (error) {
      console.error('Error registering hotel:', error);
      throw error;
    }
  }

  async updateHotel(userId, hotelId, updateData) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const hotel = await Hotel.findOne({
        where: {
          id: hotelId,
          owner_id: user.id
        }
      });

      if (!hotel) {
        throw new Error('Hotel not found or you do not have permission to update');
      }

      await hotel.update(updateData);
      return hotel;
    } catch (error) {
      console.error('Error updating hotel:', error);
      throw error;
    }
  }

  async getUserHotels(userId) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const hotels = await Hotel.findAll({
        where: { owner_id: user.id },
        order: [['created_at', 'DESC']]
      });

      return hotels;
    } catch (error) {
      console.error('Error getting user hotels:', error);
      throw error;
    }
  }

  // ===== HOTEL SEARCH =====

  async searchHotels(criteria = {}) {
    try {
      const {
        city,
        state,
        latitude,
        longitude,
        maxDistance = 50, // km
        minPrice,
        maxPrice,
        starRating,
        amenities = [],
        sortBy = 'rating',
        limit = 10,
        offset = 0
      } = criteria;

      let whereClause = {
        is_active: true,
        status: 'approved'
      };

      // Location filters
      if (city) whereClause.city = { [Op.like]: `%${city}%` };
      if (state) whereClause.state = state;

      // Price filter
      if (minPrice || maxPrice) {
        whereClause['$room_types$'] = {};
        // This would need custom SQL for JSON querying
      }

      // Star rating filter
      if (starRating) whereClause.star_rating = { [Op.gte]: starRating };

      const hotels = await Hotel.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['first_name', 'username']
          }
        ],
        limit,
        offset,
        order: [[sortBy === 'price' ? 'room_types' : sortBy, 'DESC']]
      });

      // If geolocation provided, calculate distances and filter
      if (latitude && longitude) {
        hotels.forEach(hotel => {
          hotel.distance = hotel.calculateDistance(latitude, longitude);
        });

        const filtered = hotels
          .filter(h => h.distance === null || h.distance <= maxDistance)
          .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

        return filtered;
      }

      return hotels;
    } catch (error) {
      console.error('Error searching hotels:', error);
      throw error;
    }
  }

  async searchHotelsWithAPI(location, checkIn, checkOut, guests = 1) {
    try {
      // Try RapidAPI (Booking.com) first
      if (this.apis.rapidapi.enabled) {
        return await this.searchWithRapidAPI(location, checkIn, checkOut, guests);
      }

      // Fallback to Amadeus
      if (this.apis.amadeus.enabled) {
        return await this.searchWithAmadeus(location, checkIn, checkOut, guests);
      }

      // If no API available, return local results
      console.warn('No hotel API configured, returning local results only');
      return await this.searchHotels({ city: location });
    } catch (error) {
      console.error('Error searching hotels with API:', error);
      // Return local results as fallback
      return await this.searchHotels({ city: location });
    }
  }

  async searchWithRapidAPI(location, checkIn, checkOut, guests) {
    try {
      // First, get destination ID
      const destResponse = await axios.get(`${this.apis.rapidapi.baseUrl}/hotels/locations`, {
        params: {
          name: location,
          locale: 'en-gb'
        },
        headers: {
          'X-RapidAPI-Key': this.apis.rapidapi.key,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        }
      });

      if (!destResponse.data || destResponse.data.length === 0) {
        throw new Error('Location not found');
      }

      const destId = destResponse.data[0].dest_id;

      // Search for hotels
      const hotelsResponse = await axios.get(`${this.apis.rapidapi.baseUrl}/hotels/search`, {
        params: {
          dest_id: destId,
          dest_type: 'city',
          checkin_date: checkIn,
          checkout_date: checkOut,
          adults_number: guests,
          order_by: 'popularity',
          filter_by_currency: 'NGN',
          locale: 'en-gb',
          units: 'metric'
        },
        headers: {
          'X-RapidAPI-Key': this.apis.rapidapi.key,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        }
      });

      return this.formatAPIResults(hotelsResponse.data.result, 'rapidapi');
    } catch (error) {
      console.error('RapidAPI search error:', error);
      throw error;
    }
  }

  async searchWithAmadeus(location, checkIn, checkOut, guests) {
    try {
      // Get access token
      const authResponse = await axios.post(`${this.apis.amadeus.baseUrl}/security/oauth2/token`, 
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          auth: {
            username: this.apis.amadeus.key,
            password: this.apis.amadeus.secret
          }
        }
      );

      const accessToken = authResponse.data.access_token;

      // Search hotels
      const hotelsResponse = await axios.get(`${this.apis.amadeus.baseUrl}/reference-data/locations/hotels/by-city`, {
        params: {
          cityCode: location // Needs IATA city code
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return this.formatAPIResults(hotelsResponse.data.data, 'amadeus');
    } catch (error) {
      console.error('Amadeus search error:', error);
      throw error;
    }
  }

  formatAPIResults(results, source) {
    // Format external API results to match our hotel structure
    if (source === 'rapidapi') {
      return results.map(hotel => ({
        external_id: hotel.hotel_id,
        hotel_name: hotel.hotel_name,
        address: hotel.address,
        city: hotel.city,
        rating: hotel.review_score / 2, // Convert 10-point to 5-point scale
        total_reviews: hotel.review_nr,
        price_per_night: hotel.min_total_price,
        star_rating: hotel.class,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        distance: hotel.distance,
        photos: hotel.main_photo_url ? [hotel.main_photo_url] : [],
        source: 'booking.com'
      }));
    } else if (source === 'amadeus') {
      return results.map(hotel => ({
        external_id: hotel.hotelId,
        hotel_name: hotel.name,
        address: hotel.address?.lines?.join(', '),
        city: hotel.address?.cityName,
        latitude: hotel.geoCode?.latitude,
        longitude: hotel.geoCode?.longitude,
        source: 'amadeus'
      }));
    }
    
    return results;
  }

  // ===== BOOKING MANAGEMENT =====

  async createBooking(userId, bookingData) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const hotel = await Hotel.findByPk(bookingData.hotel_id);
      if (!hotel) {
        throw new Error('Hotel not found');
      }

      // Calculate nights and total price
      const checkIn = new Date(bookingData.check_in_date);
      const checkOut = new Date(bookingData.check_out_date);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      if (nights < 1) {
        throw new Error('Check-out date must be after check-in date');
      }

      // Find room type and price
      const roomType = hotel.room_types.find(r => r.type === bookingData.room_type);
      if (!roomType) {
        throw new Error('Room type not available');
      }

      const totalPrice = roomType.price * nights * (bookingData.number_of_rooms || 1);

      const booking = await HotelBooking.create({
        booking_reference: HotelBooking.generateReference(),
        user_id: user.id,
        hotel_id: bookingData.hotel_id,
        room_type: bookingData.room_type,
        check_in_date: bookingData.check_in_date,
        check_out_date: bookingData.check_out_date,
        number_of_guests: bookingData.number_of_guests || 1,
        number_of_rooms: bookingData.number_of_rooms || 1,
        number_of_nights: nights,
        price_per_night: roomType.price,
        total_price: totalPrice,
        special_requests: bookingData.special_requests,
        guest_name: bookingData.guest_name || `${user.first_name} ${user.last_name || ''}`.trim(),
        guest_phone: bookingData.guest_phone,
        guest_email: bookingData.guest_email,
        payment_method: bookingData.payment_method || 'cash'
      });

      return booking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  async getUserBookings(userId, status = null) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const whereClause = { user_id: user.id };
      if (status) whereClause.booking_status = status;

      const bookings = await HotelBooking.findAll({
        where: whereClause,
        include: [
          {
            model: Hotel,
            as: 'hotel'
          }
        ],
        order: [['created_at', 'DESC']]
      });

      return bookings;
    } catch (error) {
      console.error('Error getting user bookings:', error);
      throw error;
    }
  }

  async getHotelBookings(userId, hotelId) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify user owns the hotel
      const hotel = await Hotel.findOne({
        where: {
          id: hotelId,
          owner_id: user.id
        }
      });

      if (!hotel) {
        throw new Error('Hotel not found or unauthorized');
      }

      const bookings = await HotelBooking.findAll({
        where: { hotel_id: hotelId },
        include: [
          {
            model: User,
            as: 'user'
          }
        ],
        order: [['check_in_date', 'DESC']]
      });

      return bookings;
    } catch (error) {
      console.error('Error getting hotel bookings:', error);
      throw error;
    }
  }

  async updateBookingStatus(bookingId, status, userId = null) {
    try {
      const booking = await HotelBooking.findByPk(bookingId, {
        include: [{ model: Hotel, as: 'hotel' }]
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // If userId provided, verify ownership
      if (userId) {
        const user = await this.databaseService.getUserByTelegramId(userId);
        if (booking.hotel.owner_id !== user.id) {
          throw new Error('Unauthorized');
        }
      }

      await booking.update({ booking_status: status });

      // Update timestamps for specific statuses
      if (status === 'checked_in') {
        await booking.update({ checked_in_at: new Date() });
      } else if (status === 'checked_out') {
        await booking.update({ checked_out_at: new Date() });
      } else if (status === 'cancelled') {
        await booking.update({ cancelled_at: new Date() });
      }

      return booking;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }

  async cancelBooking(bookingId, userId, reason = null) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      const booking = await HotelBooking.findOne({
        where: {
          id: bookingId,
          user_id: user.id
        }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (!booking.canCancel()) {
        throw new Error('Cannot cancel booking within 24 hours of check-in');
      }

      await booking.update({
        booking_status: 'cancelled',
        cancelled_at: new Date(),
        cancellation_reason: reason
      });

      return booking;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  // ===== REVIEWS =====

  async addReview(userId, hotelId, reviewData) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has stayed at the hotel
      const booking = await HotelBooking.findOne({
        where: {
          user_id: user.id,
          hotel_id: hotelId,
          booking_status: 'checked_out'
        }
      });

      const review = await HotelReview.create({
        user_id: user.id,
        hotel_id: hotelId,
        booking_id: booking ? booking.id : null,
        is_verified: !!booking,
        ...reviewData
      });

      // Update hotel rating
      await this.updateHotelRating(hotelId);

      return review;
    } catch (error) {
      console.error('Error adding review:', error);
      throw error;
    }
  }

  async updateHotelRating(hotelId) {
    try {
      const reviews = await HotelReview.findAll({
        where: { hotel_id: hotelId }
      });

      if (reviews.length === 0) return;

      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await Hotel.update(
        {
          rating: avgRating.toFixed(2),
          total_reviews: reviews.length
        },
        { where: { id: hotelId } }
      );
    } catch (error) {
      console.error('Error updating hotel rating:', error);
    }
  }

  // ===== UTILITY METHODS =====

  async geocodeAddress(address) {
    try {
      // Use OpenStreetMap Nominatim API (free, no API key required)
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'TelegramBot/1.0'
        }
      });

      if (response.data && response.data.length > 0) {
        return {
          lat: parseFloat(response.data[0].lat),
          lon: parseFloat(response.data[0].lon)
        };
      }

      return { lat: null, lon: null };
    } catch (error) {
      console.error('Geocoding error:', error);
      return { lat: null, lon: null };
    }
  }

  getNigerianStates() {
    return this.nigerianStates;
  }
}

module.exports = HotelService;
