const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'food_orders',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  menu_item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'menu_items',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  unit_price: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  special_instructions: {
    type: DataTypes.TEXT
  },
  customizations: {
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
  tableName: 'order_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['order_id'] },
    { fields: ['menu_item_id'] }
  ]
});

// Instance methods
OrderItem.prototype.calculateTotalPrice = function() {
  this.total_price = this.unit_price * this.quantity;
  return this.total_price;
};

OrderItem.prototype.getCustomizationsText = function() {
  if (!this.customizations || this.customizations.length === 0) {
    return '';
  }
  
  return this.customizations.map(custom => {
    if (custom.type === 'add') {
      return `+ ${custom.name}`;
    } else if (custom.type === 'remove') {
      return `- ${custom.name}`;
    } else if (custom.type === 'substitute') {
      return `${custom.from} → ${custom.to}`;
    }
    return custom.name;
  }).join(', ');
};

  return OrderItem;
};