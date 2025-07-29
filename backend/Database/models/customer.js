// models/customer.js
const { DataTypes } = require('sequelize');
const sequelize = require('../Database/DB');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  customerName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phoneNumber: {
    type: DataTypes.STRING(15),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  alternatePhone: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  pincode: {
    type: DataTypes.STRING(6),
    allowNull: false
  },
  gstin: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  customerType: {
    type: DataTypes.ENUM('individual', 'business'),
    defaultValue: 'individual',
    allowNull: false
  },
  creditLimit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  },
  paymentTerms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30,
    comment: 'Payment terms in days'
  },
  contactPerson: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  businessCategory: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Relations
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
    defaultValue: 'customer_entry'
  }
}, {
  tableName: 'customers',
  timestamps: true,
  indexes: [
    {
      fields: ['phoneNumber']
    },
    {
      fields: ['customerName']
    },
    {
      fields: ['customerType']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = Customer;