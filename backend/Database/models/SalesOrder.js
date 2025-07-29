// models/salesOrder.js
const { DataTypes } = require('sequelize');
const sequelize = require('../Database/DB');

const SalesOrder = sequelize.define('SalesOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  orderNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  productName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  productCategory: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pcs'
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discount: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Discount percentage'
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  subtotal: {
  type: DataTypes.DECIMAL(12, 2),
  allowNull: true  
},
totalAmount: {
  type: DataTypes.DECIMAL(12, 2),
  allowNull: true
},
  orderType: {
    type: DataTypes.ENUM('sale', 'purchase'),
    allowNull: false,
    defaultValue: 'sale'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false,
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  expectedDeliveryDate: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  actualDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Relations
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'SignUp',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'sales_purchase'
  },
  type: {
    type: DataTypes.STRING(50),
    defaultValue: 'order_entry'
  }
}, {
  tableName: 'sales_orders',
  timestamps: true,
  indexes: [
    {
      fields: ['orderNumber']
    },
    {
      fields: ['orderType']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['customerId']
    }
  ],
  hooks: {
    beforeCreate: async (order, options) => {
      // Generate order number if not provided
      if (!order.orderNumber) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const prefix = order.orderType === 'sale' ? 'SO' : 'PO';
        order.orderNumber = `${prefix}${timestamp}${random}`;
      }
      
      // Calculate amounts
      const subtotal = parseFloat(order.quantity) * parseFloat(order.unitPrice);
      const discountAmount = (subtotal * parseFloat(order.discount || 0)) / 100;
      const total = subtotal - discountAmount;
      
      order.subtotal = subtotal.toFixed(2);
      order.discountAmount = discountAmount.toFixed(2);
      order.totalAmount = total.toFixed(2);
    },
    beforeUpdate: async (order, options) => {
      // Recalculate amounts if relevant fields changed
      if (order.changed('quantity') || order.changed('unitPrice') || order.changed('discount')) {
        const subtotal = parseFloat(order.quantity) * parseFloat(order.unitPrice);
        const discountAmount = (subtotal * parseFloat(order.discount || 0)) / 100;
        const total = subtotal - discountAmount;
        
        order.subtotal = subtotal.toFixed(2);
        order.discountAmount = discountAmount.toFixed(2);
        order.totalAmount = total.toFixed(2);
      }
    }
  }
});

module.exports = SalesOrder;