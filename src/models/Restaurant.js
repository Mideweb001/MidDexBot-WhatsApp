const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Restaurant = sequelize.define('Restaurant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  owner_id: {
    type: DataTypes.INTEGER,
    allowNull: false
    // Association-based FK; explicit reference removed to avoid type/case issues on Postgres
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8)
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8)
  },
  phone: {
    type: DataTypes.STRING(20)
  },
  email: {
    type: DataTypes.STRING(255)
  },
  cuisine_type: {
    type: DataTypes.STRING(100),
    defaultValue: 'general'
  },
  operating_hours: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  delivery_radius: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 5.0 // km
  },
  delivery_fee: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0.00
  },
  minimum_order: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0.00
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00
  },
  total_reviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  logo_url: {
    type: DataTypes.TEXT
  },
  cover_image_url: {
    type: DataTypes.TEXT
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  features: {
    type: DataTypes.JSON,
    defaultValue: [] // pickup, delivery, dine-in
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
  tableName: 'restaurants',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['owner_id'] },
    { fields: ['latitude', 'longitude'] },
    { fields: ['cuisine_type'] },
    { fields: ['is_active'] },
    { fields: ['is_verified'] },
    { fields: ['rating'] },
    { fields: ['name'] }
  ]
});

// Instance methods
Restaurant.prototype.getDistance = function(userLat, userLng) {
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

Restaurant.prototype.isWithinDeliveryRadius = function(userLat, userLng) {
  const distance = this.getDistance(userLat, userLng);
  return distance !== null && distance <= this.delivery_radius;
};

Restaurant.prototype.isOpen = function() {
  const now = new Date();
  const day = now.toLocaleLowerCase().substring(0, 3); // mon, tue, etc
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  if (!this.operating_hours || !this.operating_hours[day]) return false;
  
  const hours = this.operating_hours[day];
  if (!hours.open || !hours.close) return false;
  
  const [openHour, openMin] = hours.open.split(':').map(Number);
  const [closeHour, closeMin] = hours.close.split(':').map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;
  
  return currentTime >= openTime && currentTime <= closeTime;
};

Restaurant.prototype.getFormattedHours = function() {
  if (!this.operating_hours) return 'Hours not specified';
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  let hoursText = '';
  days.forEach((day, index) => {
    const hours = this.operating_hours[day];
    if (hours && hours.open && hours.close) {
      hoursText += `${dayNames[index]}: ${hours.open}-${hours.close}\n`;
    } else {
      hoursText += `${dayNames[index]}: Closed\n`;
    }
  });
  
  return hoursText.trim();
};

  return Restaurant;
};