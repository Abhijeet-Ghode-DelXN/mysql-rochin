const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ServiceFrequency extends Model {}

ServiceFrequency.init({
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
    type: DataTypes.ENUM('One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annually'),
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'ServiceFrequency',
  tableName: 'service_frequencies',
  timestamps: true
});

module.exports = ServiceFrequency;
