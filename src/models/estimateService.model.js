const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class EstimateService extends Model {}

EstimateService.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  estimateId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'estimates',
      key: 'id'
    }
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'services',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  sequelize,
  modelName: 'EstimateService',
  tableName: 'estimate_services',
  timestamps: true
});

module.exports = EstimateService;
