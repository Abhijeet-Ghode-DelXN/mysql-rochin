const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Customer extends Model {}

Customer.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Address
  street: {
    type: DataTypes.STRING
  },
  city: {
    type: DataTypes.STRING
  },
  state: {
    type: DataTypes.STRING
  },
  zipCode: {
    type: DataTypes.STRING
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: 'USA'
  },
  // Property Details
  propertySize: {
    type: DataTypes.INTEGER // in square feet
  },
  hasFrontYard: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  hasBackYard: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  hasTrees: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasGarden: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasSprinklerSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  accessInstructions: {
    type: DataTypes.TEXT
  },
  // Service Preferences
  preferredTimeOfDay: {
    type: DataTypes.ENUM('Morning', 'Afternoon', 'Evening', 'Any'),
    defaultValue: 'Any'
  },
  // Notification Preferences
  notifyByEmail: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notifyBySms: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reminderDaysBefore: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  customerSince: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  sequelize,
  modelName: 'Customer',
  tableName: 'customers',
  timestamps: true
});

// Define associations in a separate function to avoid circular dependencies
const setupAssociations = (models) => {
  const { User, Appointment, Estimate, CustomerPreferredDay, PropertyImage } = models;
  
  // Customer belongs to User
  Customer.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // Customer has many Appointments
  Customer.hasMany(Appointment, {
    foreignKey: 'customerId',
    as: 'appointments'
  });
  
  // Customer has many Estimates
  Customer.hasMany(Estimate, {
    foreignKey: 'customerId',
    as: 'estimates'
  });
  
  // Customer has many PreferredDays
  Customer.hasMany(CustomerPreferredDay, {
    foreignKey: 'customerId',
    as: 'preferredDays'
  });
  
  // Customer has many PropertyImages
  Customer.hasMany(PropertyImage, {
    foreignKey: 'customerId',
    as: 'propertyImages'
  });
};

module.exports = { Customer, setupAssociations };
