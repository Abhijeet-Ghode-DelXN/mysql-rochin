const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class AppointmentCrew extends Model {}

AppointmentCrew.init({
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
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'AppointmentCrew',
  tableName: 'appointment_crew',
  timestamps: true
});

module.exports = AppointmentCrew;
