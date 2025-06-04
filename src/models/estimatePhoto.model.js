const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class EstimatePhoto extends Model {}

EstimatePhoto.init({
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
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  caption: {
    type: DataTypes.STRING
  },
  publicId: {
    type: DataTypes.STRING
  },
  category: {
    type: DataTypes.ENUM('Front Yard', 'Back Yard', 'Side Yard', 'Other'),
    defaultValue: 'Other'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'EstimatePhoto',
  tableName: 'estimate_photos',
  timestamps: true
});

module.exports = EstimatePhoto;
