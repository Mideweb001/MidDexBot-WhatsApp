const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HotelBooking = sequelize.define('HotelBooking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    booking_reference: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    hotel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'hotels',
        key: 'id'
      }
    },
    room_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    check_in_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    check_out_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    number_of_guests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    number_of_rooms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    number_of_nights: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price_per_night: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    total_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    special_requests: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    guest_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    guest_phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    guest_email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'bank_transfer', 'card', 'mobile_money'),
      defaultValue: 'cash'
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'partial', 'paid', 'refunded'),
      defaultValue: 'pending'
    },
    booking_status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'),
      defaultValue: 'pending'
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    checked_in_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    checked_out_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'hotel_bookings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['booking_reference']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['hotel_id']
      },
      {
        fields: ['booking_status']
      },
      {
        fields: ['check_in_date', 'check_out_date']
      }
    ]
  });

  HotelBooking.associate = (models) => {
    HotelBooking.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    HotelBooking.belongsTo(models.Hotel, {
      foreignKey: 'hotel_id',
      as: 'hotel'
    });
  };

  // Instance methods
  HotelBooking.prototype.getStatusEmoji = function() {
    const statusEmojis = {
      pending: '⏳',
      confirmed: '✅',
      checked_in: '🏨',
      checked_out: '✨',
      cancelled: '❌',
      no_show: '⚠️'
    };
    return statusEmojis[this.booking_status] || '📋';
  };

  HotelBooking.prototype.getFormattedInfo = function() {
    const status = this.getStatusEmoji();
    return `${status} *Booking #${this.booking_reference}*

🏨 Hotel: ${this.hotel ? this.hotel.hotel_name : 'N/A'}
🛏️ Room: ${this.room_type} (${this.number_of_rooms} room${this.number_of_rooms > 1 ? 's' : ''})
👥 Guests: ${this.number_of_guests}

📅 Check-in: ${this.check_in_date}
📅 Check-out: ${this.check_out_date}
🌙 Nights: ${this.number_of_nights}

💰 Price: ₦${this.price_per_night.toLocaleString()}/night
💵 Total: ₦${this.total_price.toLocaleString()}

👤 Guest: ${this.guest_name}
📞 Phone: ${this.guest_phone}

💳 Payment: ${this.payment_status.toUpperCase()}
📊 Status: ${this.booking_status.toUpperCase()}`;
  };

  HotelBooking.prototype.canCancel = function() {
    const now = new Date();
    const checkInDate = new Date(this.check_in_date);
    const hoursDifference = (checkInDate - now) / (1000 * 60 * 60);
    
    return this.booking_status === 'pending' || 
           this.booking_status === 'confirmed' && hoursDifference > 24;
  };

  // Static method to generate booking reference
  HotelBooking.generateReference = function() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `HB${timestamp}${random}`;
  };

  return HotelBooking;
};
