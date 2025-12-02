const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Business = sequelize.define('Business', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // Association-based FK; explicit reference removed
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    business_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [2, 255]
      }
    },
    category: {
      type: DataTypes.ENUM(
        'food', 'electronics', 'services', 'fashion', 'health', 
        'beauty', 'automotive', 'home', 'education', 'other'
      ),
      allowNull: false,
      defaultValue: 'other'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    full_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        min: -180,
        max: 180
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        is: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    business_hours: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Operating hours by day of week'
    },
    menu_items: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of products/services offered'
    },
    logo_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cover_image_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 5
      }
    },
    total_reviews: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_orders: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    accepts_orders: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    delivery_available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    max_delivery_distance: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Maximum delivery distance in km'
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Searchable tags for the business'
    },
    promotions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Active promotions and special offers'
    },
    subscription_plan: {
      type: DataTypes.ENUM('free', 'basic', 'premium'),
      allowNull: false,
      defaultValue: 'free'
    }
  }, {
    tableName: 'businesses',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['owner_id']
      },
      {
        fields: ['category']
      },
      {
        fields: ['city', 'state']
      },
      {
        fields: ['latitude', 'longitude']
      },
      {
        fields: ['is_active', 'accepts_orders']
      },
      {
        fields: ['rating']
      },
      {
        name: 'business_search_idx',
        fields: ['business_name', 'category', 'city']
      }
    ]
  });

  // Instance methods
  Business.prototype.getDistance = function(userLat, userLng) {
    if (!this.latitude || !this.longitude) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (userLat - this.latitude) * Math.PI / 180;
    const dLng = (userLng - this.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.latitude * Math.PI / 180) * Math.cos(userLat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  Business.prototype.isWithinDeliveryRange = function(userLat, userLng) {
    if (!this.delivery_available || !this.max_delivery_distance) return false;
    const distance = this.getDistance(userLat, userLng);
    return distance !== null && distance <= this.max_delivery_distance;
  };

  Business.prototype.updateRating = async function(newRating) {
    const totalRatings = (this.rating * this.total_reviews) + newRating;
    this.total_reviews += 1;
    this.rating = totalRatings / this.total_reviews;
    await this.save();
    return this;
  };

  Business.prototype.addPromotion = async function(promotion) {
    const promotions = this.promotions || [];
    promotions.push({
      id: Date.now(),
      ...promotion,
      created_at: new Date(),
      active: true
    });
    this.promotions = promotions;
    await this.save();
    return this;
  };

  Business.prototype.getFormattedInfo = function(includeDistance = false, userLat = null, userLng = null) {
    let info = `🏢 *${this.business_name}*\n`;
    info += `📂 Category: ${this.category.charAt(0).toUpperCase() + this.category.slice(1)}\n`;
    info += `📍 Location: ${this.city}, ${this.state}\n`;
    info += `⭐ Rating: ${parseFloat(this.rating).toFixed(1)}/5.0 (${this.total_reviews} reviews)\n`;
    info += `📞 Phone: ${this.phone}\n`;
    
    if (this.email) {
      info += `📧 Email: ${this.email}\n`;
    }
    
    if (includeDistance && userLat && userLng) {
      const distance = this.getDistance(userLat, userLng);
      if (distance !== null) {
        info += `📏 Distance: ${distance.toFixed(2)} km away\n`;
      }
    }
    
    if (this.delivery_available) {
      info += `🚚 Delivery: Available (within ${this.max_delivery_distance} km)\n`;
    }
    
    if (this.description) {
      info += `\n${this.description}\n`;
    }
    
    return info;
  };

  // Static methods
  Business.findNearby = async function(latitude, longitude, radius = 10, category = null) {
    const whereClause = {
      is_active: true,
      accepts_orders: true,
      latitude: { [require('sequelize').Op.ne]: null },
      longitude: { [require('sequelize').Op.ne]: null }
    };
    
    if (category) {
      whereClause.category = category;
    }
    
    const businesses = await this.findAll({
      where: whereClause,
      order: [['rating', 'DESC']],
      raw: true
    });
    
    // Filter by distance and sort
    const nearbyBusinesses = businesses
      .map(business => {
        const instance = this.build(business);
        const distance = instance.getDistance(latitude, longitude);
        return { ...business, distance };
      })
      .filter(business => business.distance !== null && business.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
    
    return nearbyBusinesses;
  };

  Business.searchByKeyword = async function(keyword, userLat = null, userLng = null, limit = 20) {
    const { Op } = require('sequelize');
    
    const businesses = await this.findAll({
      where: {
        is_active: true,
        accepts_orders: true,
        [Op.or]: [
          { business_name: { [Op.iLike]: `%${keyword}%` } },
          { description: { [Op.iLike]: `%${keyword}%` } },
          { category: { [Op.iLike]: `%${keyword}%` } },
          { city: { [Op.iLike]: `%${keyword}%` } }
        ]
      },
      order: [['rating', 'DESC'], ['total_reviews', 'DESC']],
      limit,
      raw: true
    });
    
    // Add distance if location provided
    if (userLat && userLng) {
      return businesses.map(business => {
        const instance = this.build(business);
        const distance = instance.getDistance(userLat, userLng);
        return { ...business, distance };
      }).sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }
    
    return businesses;
  };

  return Business;
};
