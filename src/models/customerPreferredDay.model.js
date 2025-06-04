const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class CustomerPreferredDay extends Model {}

CustomerPreferredDay.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  day: {
    type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'CustomerPreferredDay',
  tableName: 'customer_preferred_days',
  timestamps: true
});

module.exports = CustomerPreferredDay;
