const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ServiceDiscount extends Model {}

ServiceDiscount.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'services',
      key: 'id'
    }
  },
  frequency: {
    type: DataTypes.ENUM('Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annually'),
    allowNull: false
  },
  discountPercentage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  }
}, {
  sequelize,
  modelName: 'ServiceDiscount',
  tableName: 'service_discounts',
  timestamps: true
});

module.exports = ServiceDiscount;
