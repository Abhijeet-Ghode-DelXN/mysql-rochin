const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class EstimatePackage extends Model {}

EstimatePackage.init({
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
  name: {
    type: DataTypes.ENUM('Basic', 'Standard', 'Premium'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  subTotal: {
    type: DataTypes.DECIMAL(10, 2)
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2)
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2)
  },
  discountDescription: {
    type: DataTypes.STRING
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  sequelize,
  modelName: 'EstimatePackage',
  tableName: 'estimate_packages',
  timestamps: true
});

module.exports = EstimatePackage;
