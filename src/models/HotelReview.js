const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HotelReview = sequelize.define('HotelReview', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'hotel_bookings',
        key: 'id'
      }
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    cleanliness_rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    service_rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    location_rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    value_rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    review_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    hotel_response: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    responded_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'hotel_reviews',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['hotel_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['rating']
      }
    ]
  });

  HotelReview.associate = (models) => {
    HotelReview.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    HotelReview.belongsTo(models.Hotel, {
      foreignKey: 'hotel_id',
      as: 'hotel'
    });
    HotelReview.belongsTo(models.HotelBooking, {
      foreignKey: 'booking_id',
      as: 'booking'
    });
  };

  // Instance methods
  HotelReview.prototype.getStarRating = function() {
    return '⭐'.repeat(this.rating);
  };

  HotelReview.prototype.getFormattedReview = function() {
    return `${this.getStarRating()} ${this.rating}/5
👤 ${this.user ? this.user.first_name : 'Guest'}
${this.is_verified ? '✅ Verified Stay' : ''}

${this.review_text || 'No written review'}

${this.hotel_response ? `\n🏨 Hotel Response:\n${this.hotel_response}` : ''}`;
  };

  return HotelReview;
};
