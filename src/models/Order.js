const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
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
      allowNull: false,
      // Association-based FK
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // Association-based FK
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    items: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of ordered items with quantities and prices'
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    special_instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    delivery_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    delivery_latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    delivery_longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    customer_phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
        'pending', 'confirmed', 'preparing', 'ready', 
        'out_for_delivery', 'delivered', 'cancelled', 'rejected'
      ),
      allowNull: false,
      defaultValue: 'pending'
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'refunded'),
      allowNull: false,
      defaultValue: 'pending'
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'card', 'online', 'mobile_money'),
      allowNull: true
    },
    delivery_type: {
      type: DataTypes.ENUM('pickup', 'delivery'),
      allowNull: false,
      defaultValue: 'pickup'
    },
    delivery_fee: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    estimated_delivery_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actual_delivery_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    review: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal notes from business'
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['customer_id']
      },
      {
        fields: ['business_id']
      },
      {
        fields: ['order_number'],
        unique: true
      },
      {
        fields: ['status']
      },
      {
        fields: ['payment_status']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['customer_id', 'status']
      },
      {
        fields: ['business_id', 'status']
      }
    ],
    hooks: {
      beforeCreate: (order) => {
        // Generate unique order number
        if (!order.order_number) {
          const timestamp = Date.now().toString(36);
          const random = Math.random().toString(36).substring(2, 7);
          order.order_number = `ORD-${timestamp}-${random}`.toUpperCase();
        }
      }
    }
  });

  // Instance methods
  Order.prototype.getStatusEmoji = function() {
    // Business marketplace order emojis (different from food orders)
    const emojiMap = {
      'pending': '⏳',
      'confirmed': '✔️',
      'preparing': '⚙️',
      'ready': '✅',
      'out_for_delivery': '�',
      'delivered': '✨',
      'cancelled': '🚫',
      'rejected': '❎'
    };
    return emojiMap[this.status] || '📦';
  };

  Order.prototype.getFormattedInfo = function() {
    let info = `�️ *Order ${this.order_number}*\n\n`;
    info += `${this.getStatusEmoji()} Status: ${this.status.replace('_', ' ').toUpperCase()}\n`;
    info += `� Total: $${parseFloat(this.total_amount).toFixed(2)}\n`;
    
    if (this.delivery_type === 'delivery') {
      info += `� Delivery Fee: $${parseFloat(this.delivery_fee).toFixed(2)}\n`;
      info += `📍 Address: ${this.delivery_address}\n`;
    } else {
      info += `� Type: Pickup\n`;
    }
    
    info += `\n� *Items:*\n`;
    this.items.forEach((item, index) => {
      info += `${index + 1}. ${item.name} x${item.quantity} - $${parseFloat(item.price * item.quantity).toFixed(2)}\n`;
    });
    
    if (this.special_instructions) {
      info += `\n� *Special Instructions:*\n${this.special_instructions}\n`;
    }
    
    if (this.estimated_delivery_time) {
      info += `\n⏰ Estimated: ${new Date(this.estimated_delivery_time).toLocaleString()}\n`;
    }
    
    info += `\n📅 Ordered: ${new Date(this.created_at).toLocaleString()}`;
    
    return info;
  };

  Order.prototype.updateStatus = async function(newStatus) {
    this.status = newStatus;
    
    if (newStatus === 'delivered') {
      this.actual_delivery_time = new Date();
    }
    
    await this.save();
    return this;
  };

  Order.prototype.addReview = async function(rating, reviewText) {
    this.rating = rating;
    this.review = reviewText;
    this.reviewed_at = new Date();
    await this.save();
    return this;
  };

  Order.prototype.canBeReviewed = function() {
    return this.status === 'delivered' && !this.rating;
  };

  Order.prototype.canBeCancelled = function() {
    return ['pending', 'confirmed'].includes(this.status);
  };

  Order.prototype.getTotalWithDelivery = function() {
    return parseFloat(this.total_amount) + parseFloat(this.delivery_fee);
  };

  // Static methods
  Order.getCustomerOrders = async function(customerId, limit = 10) {
    return await this.findAll({
      where: { customer_id: customerId },
      order: [['created_at', 'DESC']],
      limit,
      raw: true
    });
  };

  Order.getBusinessOrders = async function(businessId, status = null, limit = 20) {
    const whereClause = { business_id: businessId };
    
    if (status) {
      whereClause.status = status;
    }
    
    return await this.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      raw: true
    });
  };

  Order.getPendingOrders = async function(businessId) {
    return await this.findAll({
      where: {
        business_id: businessId,
        status: ['pending', 'confirmed', 'preparing']
      },
      order: [['created_at', 'ASC']],
      raw: true
    });
  };

  Order.getOrderStats = async function(businessId, days = 30) {
    const { Op } = require('sequelize');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const orders = await this.findAll({
      where: {
        business_id: businessId,
        created_at: { [Op.gte]: startDate }
      },
      raw: true
    });
    
    const stats = {
      total_orders: orders.length,
      completed: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled' || o.status === 'rejected').length,
      pending: orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
      total_revenue: orders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + parseFloat(o.total_amount), 0),
      average_rating: 0,
      total_reviews: 0
    };
    
    const reviewedOrders = orders.filter(o => o.rating);
    if (reviewedOrders.length > 0) {
      stats.average_rating = reviewedOrders.reduce((sum, o) => sum + o.rating, 0) / reviewedOrders.length;
      stats.total_reviews = reviewedOrders.length;
    }
    
    return stats;
  };

  return Order;
};
