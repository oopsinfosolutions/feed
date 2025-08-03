// backend/Database/models/signup.js
const { DataTypes } = require("sequelize");
const sequelize = require('../Database/DB');

const SignUp = sequelize.define("SignUp", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  fullname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    // UPDATED: Added 'Admin' and other missing types
    type: DataTypes.ENUM(
      'Client', 
      'dealer', 
      'field_employee', 
      'office_employee', 
      'sales_purchase',
      'Admin',           // ← Added Admin
      'Administrator',   // ← Alternative admin
      'Manager'          // ← Additional management role
    ),
    allowNull: false,
  },
  user_id: {
    type: DataTypes.STRING,  // Changed from INTEGER to STRING to match auth.js
    allowNull: false,
    unique: true
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  approvalRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  approvalNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  lastLogin: {  // Renamed from lastLoginAt to match auth.js
    type: DataTypes.DATE,
    allowNull: true,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 }
  },
  serviceQuality: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 }
  },
  deliveryTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 }
  },
  productQuality: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 }
  },
  overallSatisfaction: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 }
  },
  recommendations: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  billId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  tableName: "SignUp",
  timestamps: true,  // Changed to true to add createdAt/updatedAt
});

module.exports = SignUp;