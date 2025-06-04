const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ServicePackage extends Model {}

ServicePackage.init({
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
  name: {
    type: DataTypes.ENUM('Basic', 'Standard', 'Premium'),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  priceMultiplier: {
    type: DataTypes.DECIMAL(4, 2),
    defaultValue: 1.0
  }
}, {
  sequelize,
  modelName: 'ServicePackage',
  tableName: 'service_packages',
  timestamps: true
});

module.exports = ServicePackage;
