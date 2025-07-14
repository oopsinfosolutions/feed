const { DataTypes } = require('sequelize');
const sequelize = require('../Database/DB');

const Bill = sequelize.define('Bill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  billNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'shipment_details',
      key: 'id'
    }
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'SignUp',
      key: 'id'
    }
  },
  // Order details stored in bill
  materialName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  discountPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  discountAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  // Delivery details
  deliveryAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  vehicleName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  vehicleNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // Payment details
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'successful'),
    defaultValue: 'pending',
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paymentNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Bill dates
  sentAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Additional notes
  additionalNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Admin who created the bill
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'SignUp',
      key: 'id'
    }
  }
}, {
  tableName: 'bills',
  timestamps: true
});

module.exports = Bill;