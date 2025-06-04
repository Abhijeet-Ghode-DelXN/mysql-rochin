const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class AppointmentPhoto extends Model {}

AppointmentPhoto.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  appointmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'appointments',
      key: 'id'
    }
  },
  photoType: {
    type: DataTypes.ENUM('beforeService', 'afterService'),
    allowNull: false
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
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'AppointmentPhoto',
  tableName: 'appointment_photos',
  timestamps: true
});

module.exports = AppointmentPhoto;
