const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MenuItem = sequelize.define('MenuItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  restaurant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'restaurants',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  price: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(100),
    defaultValue: 'main'
  },
  image_url: {
    type: DataTypes.TEXT
  },
  ingredients: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  allergens: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  nutritional_info: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  preparation_time: {
    type: DataTypes.INTEGER, // minutes
    defaultValue: 15
  },
  is_vegetarian: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_vegan: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_gluten_free: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_spicy: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  spice_level: {
    type: DataTypes.INTEGER, // 1-5
    defaultValue: 0
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00
  },
  total_orders: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  customization_options: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'menu_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['restaurant_id'] },
    { fields: ['category'] },
    { fields: ['is_available'] },
    { fields: ['is_featured'] },
    { fields: ['price'] },
    { fields: ['rating'] },
    { fields: ['is_vegetarian'] },
    { fields: ['is_vegan'] }
  ]
});

// Instance methods
MenuItem.prototype.getDiscountedPrice = function() {
  if (this.discount_percentage > 0) {
    return this.price * (1 - this.discount_percentage / 100);
  }
  return this.price;
};

MenuItem.prototype.getDietaryInfo = function() {
  const info = [];
  if (this.is_vegetarian) info.push('🥬 Vegetarian');
  if (this.is_vegan) info.push('🌱 Vegan');
  if (this.is_gluten_free) info.push('🌾 Gluten-Free');
  if (this.is_spicy) info.push(`🌶️ Spicy (${this.spice_level}/5)`);
  return info.join(' • ');
};

MenuItem.prototype.getFormattedPrice = function() {
  const originalPrice = parseFloat(this.price);
  const discountedPrice = this.getDiscountedPrice();
  
  if (this.discount_percentage > 0) {
    return `$${discountedPrice.toFixed(2)} ~$${originalPrice.toFixed(2)}~ (${this.discount_percentage}% off)`;
  }
  return `$${originalPrice.toFixed(2)}`;
};

MenuItem.prototype.getAvailabilityStatus = function() {
  if (!this.is_available) return '❌ Not Available';
  if (this.is_featured) return '⭐ Featured';
  return '✅ Available';
};

  return MenuItem;
};