const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FoodOrder = sequelize.define('FoodOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_number: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false
    // Association-based FK; explicit reference removed to avoid type/case issues on Postgres
  },
  restaurant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'restaurants',
      key: 'id'
    }
  },
  delivery_address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  delivery_latitude: {
    type: DataTypes.DECIMAL(10, 8)
  },
  delivery_longitude: {
    type: DataTypes.DECIMAL(11, 8)
  },
  customer_phone: {
    type: DataTypes.STRING(20)
  },
  customer_name: {
    type: DataTypes.STRING(255)
  },
  order_type: {
    type: DataTypes.ENUM('delivery', 'pickup', 'dine_in'),
    defaultValue: 'delivery'
  },
  status: {
    type: DataTypes.ENUM(
      'pending',      // Order placed, awaiting restaurant confirmation
      'confirmed',    // Restaurant confirmed order
      'preparing',    // Food being prepared
      'ready',        // Food ready for pickup/delivery
      'out_for_delivery', // Driver picked up order
      'delivered',    // Order delivered
      'completed',    // Order completed and confirmed
      'cancelled'     // Order cancelled
    ),
    defaultValue: 'pending'
  },
  payment_method: {
    type: DataTypes.ENUM('cash_on_delivery', 'bank_transfer', 'card', 'mobile_money'),
    defaultValue: 'cash_on_delivery'
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  delivery_fee: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0.00
  },
  tax_amount: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0.00
  },
  discount_amount: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0.00
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  special_instructions: {
    type: DataTypes.TEXT
  },
  estimated_delivery_time: {
    type: DataTypes.DATE
  },
  actual_delivery_time: {
    type: DataTypes.DATE
  },
  rating: {
    type: DataTypes.INTEGER // 1-5
  },
  review: {
    type: DataTypes.TEXT
  },
  driver_info: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  tracking_updates: {
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
  tableName: 'food_orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['customer_id'] },
    { fields: ['restaurant_id'] },
    { fields: ['order_number'] },
    { fields: ['status'] },
    { fields: ['payment_status'] },
    { fields: ['order_type'] },
    { fields: ['created_at'] }
  ]
});

// Instance methods
FoodOrder.prototype.updateStatus = function(newStatus, updateMessage = null) {
  this.status = newStatus;
  
  if (!this.tracking_updates) this.tracking_updates = [];
  
  this.tracking_updates.push({
    status: newStatus,
    timestamp: new Date(),
    message: updateMessage || this.getStatusMessage(newStatus)
  });
  
  if (newStatus === 'delivered') {
    this.actual_delivery_time = new Date();
  }
  
  return this.save();
};

FoodOrder.prototype.getStatusMessage = function(status = null) {
  const currentStatus = status || this.status;
  const messages = {
    'pending': '⏳ Order placed, waiting for restaurant confirmation',
    'confirmed': '✅ Order confirmed by restaurant',
    'preparing': '👨‍🍳 Your food is being prepared',
    'ready': '📦 Order ready for pickup/delivery',
    'out_for_delivery': '🚗 Driver is on the way',
    'delivered': '✅ Order delivered successfully',
    'completed': '🎉 Order completed',
    'cancelled': '❌ Order cancelled'
  };
  return messages[currentStatus] || 'Status unknown';
};

FoodOrder.prototype.getStatusEmoji = function() {
  const emojis = {
    'pending': '⏳',
    'confirmed': '✅', 
    'preparing': '👨‍🍳',
    'ready': '📦',
    'out_for_delivery': '🚗',
    'delivered': '✅',
    'completed': '🎉',
    'cancelled': '❌'
  };
  return emojis[this.status] || '❓';
};

FoodOrder.prototype.getEstimatedDeliveryText = function() {
  if (!this.estimated_delivery_time) return 'Not specified';
  
  const now = new Date();
  const eta = new Date(this.estimated_delivery_time);
  const diffMs = eta.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));
  
  if (diffMins <= 0) return 'Should arrive soon';
  if (diffMins < 60) return `${diffMins} minutes`;
  
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
};

FoodOrder.prototype.generateOrderNumber = function() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `FO${timestamp}${random}`.substr(-12);
};

  return FoodOrder;
};