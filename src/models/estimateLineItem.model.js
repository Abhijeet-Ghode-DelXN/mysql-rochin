const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class EstimateLineItem extends Model {}

EstimateLineItem.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  estimatePackageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'estimate_packages',
      key: 'id'
    }
  },
  service: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2)
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2)
  }
}, {
  sequelize,
  modelName: 'EstimateLineItem',
  tableName: 'estimate_line_items',
  timestamps: true
});

module.exports = EstimateLineItem;
