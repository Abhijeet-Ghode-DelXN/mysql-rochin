const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class PropertyImage extends Model {}

PropertyImage.init({
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
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  publicId: {
    type: DataTypes.STRING
  },
  caption: {
    type: DataTypes.STRING
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'PropertyImage',
  tableName: 'property_images',
  timestamps: true
});

module.exports = PropertyImage;
