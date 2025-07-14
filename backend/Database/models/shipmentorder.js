const { DataTypes } = require('sequelize');
const sequelize = require('../Database/DB'); // Adjust path if needed

const shipment_details = sequelize.define('Material', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  detail: {
    type: DataTypes.TEXT,
    
  },
  price_per_unit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  total_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  destination: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  pickup_location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  drop_location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  c_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  e_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(255),
    defaultValue: 'requested'
  },
  image1: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  image2: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  image3: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  video: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  video1: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  video2: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  video3: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  pincode: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  unit: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  totalPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  vehicleName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  vehicleNumber: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  offer: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  need_product: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  shipment_date: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  discount: {
  type: DataTypes.FLOAT,
  allowNull: true,
  defaultValue: 0
},
bill_text:{
  type: DataTypes.STRING(255),
  allowNull: true
},userId: {
  type: DataTypes.STRING,
  allowNull: false
},
role: {
  type: DataTypes.STRING, // 'employee', 'office'
  allowNull: false
},

productType: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: 'product'
}

}, {
  tableName: 'shipment_details',
  timestamps: true
});

module.exports = shipment_details;