const { DataTypes } = require('sequelize');
const sequelize = require('../Database/DB');

const ShipmentDetail = sequelize.define('shipment_detail', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  detail: {
    type: DataTypes.TEXT,
    allowNull: false
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
  }
}, {
  timestamps: true
});

module.exports = ShipmentDetail;
