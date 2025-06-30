const { DataTypes } = require("sequelize");
const sequelize = require('../Database/DB'); // Adjust path if needed

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
    type: DataTypes.ENUM('Client', 'dealer', 'field_employee', 'office_employee'),
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  }
}, {
  tableName: "SignUp",
  timestamps: false,
});

module.exports = SignUp;
