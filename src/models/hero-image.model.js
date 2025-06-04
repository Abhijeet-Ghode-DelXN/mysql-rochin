const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const HeroImage = sequelize.define('HeroImage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  publicId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  caption: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'HeroImages'
});

HeroImage.beforeCreate(async (heroImage, options) => {
  const transaction = options.transaction;
  if (transaction) {
    await HeroImage.destroy({
      where: {},
      transaction
    });
  } else {
    await HeroImage.destroy({
      where: {}
    });
  }
});

module.exports = HeroImage;
