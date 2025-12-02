const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Hotel = sequelize.define('Hotel', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    hotel_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false
    },
    country: {
      type: DataTypes.STRING,
      defaultValue: 'Nigeria'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    contact_phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    contact_email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    whatsapp_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    star_rating: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      validate: {
        min: 1,
        max: 5
      }
    },
    amenities: {
      type: DataTypes.JSON,
      defaultValue: {
        wifi: false,
        breakfast: false,
        pool: false,
        gym: false,
        parking: false,
        restaurant: false,
        bar: false,
        spa: false,
        airport_shuttle: false,
        pet_friendly: false,
        laundry: false,
        air_conditioning: false,
        room_service: false,
        conference_room: false
      }
    },
    room_types: {
      type: DataTypes.JSON,
      defaultValue: []
      // Structure: [{ type: 'Standard', price: 15000, available: 10, capacity: 2, description: '...' }]
    },
    photos: {
      type: DataTypes.JSON,
      defaultValue: []
      // Array of photo URLs or Telegram file IDs
    },
    check_in_time: {
      type: DataTypes.STRING,
      defaultValue: '14:00'
    },
    check_out_time: {
      type: DataTypes.STRING,
      defaultValue: '12:00'
    },
    cancellation_policy: {
      type: DataTypes.TEXT,
      defaultValue: 'Free cancellation up to 24 hours before check-in'
    },
    payment_methods: {
      type: DataTypes.JSON,
      defaultValue: ['cash', 'bank_transfer', 'card']
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00
    },
    total_reviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
      defaultValue: 'pending'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'hotels',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['city', 'state']
      },
      {
        fields: ['latitude', 'longitude']
      },
      {
        fields: ['rating']
      },
      {
        fields: ['is_active', 'status']
      }
    ]
  });

  Hotel.associate = (models) => {
    Hotel.belongsTo(models.User, {
      foreignKey: 'owner_id',
      as: 'owner'
    });
    Hotel.hasMany(models.HotelBooking, {
      foreignKey: 'hotel_id',
      as: 'bookings'
    });
    Hotel.hasMany(models.HotelReview, {
      foreignKey: 'hotel_id',
      as: 'reviews'
    });
  };

  // Instance methods
  Hotel.prototype.getFormattedInfo = function() {
    const amenitiesList = Object.entries(this.amenities)
      .filter(([key, value]) => value)
      .map(([key]) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
      .join(', ');

    return `🏨 *${this.hotel_name}*
⭐ ${this.star_rating} Star Hotel
📍 ${this.address}, ${this.city}, ${this.state}
📞 ${this.contact_phone}
${this.whatsapp_number ? `💬 WhatsApp: ${this.whatsapp_number}` : ''}

💰 *Room Types:*
${this.room_types.map(room => `  • ${room.type}: ₦${room.price.toLocaleString()}/night (${room.available} available)`).join('\n')}

✨ *Amenities:*
${amenitiesList || 'Contact hotel for details'}

⭐ Rating: ${this.rating}/5.0 (${this.total_reviews} reviews)

🕐 Check-in: ${this.check_in_time} | Check-out: ${this.check_out_time}`;
  };

  Hotel.prototype.calculateDistance = function(userLat, userLon) {
    if (!this.latitude || !this.longitude) return null;
    
    const R = 6371; // Radius of Earth in km
    const dLat = (userLat - this.latitude) * Math.PI / 180;
    const dLon = (userLon - this.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.latitude * Math.PI / 180) * Math.cos(userLat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  Hotel.prototype.getMinPrice = function() {
    if (!this.room_types || this.room_types.length === 0) return 0;
    return Math.min(...this.room_types.map(room => room.price));
  };

  Hotel.prototype.getMaxPrice = function() {
    if (!this.room_types || this.room_types.length === 0) return 0;
    return Math.max(...this.room_types.map(room => room.price));
  };

  return Hotel;
};
