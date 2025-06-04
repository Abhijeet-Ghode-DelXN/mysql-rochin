const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Service extends Model {}

Service.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Please add a service name' },
      len: { args: [1, 50], msg: 'Name cannot be more than 50 characters' }
    }
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please add a description' },
      len: { args: [1, 500], msg: 'Description cannot be more than 500 characters' }
    }
  },
  category: {
    type: DataTypes.ENUM(
      'Lawn Maintenance',
      'Gardening',
      'Tree Service',
      'Landscaping Design',
      'Irrigation',
      'Seasonal',
      'Residential',
      'Other'
    ),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please add a category' }
    }
  },
  duration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please add estimated service duration' }
    }
  },
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please add base price' }
    }
  },
  priceUnit: {
    type: DataTypes.ENUM('flat', 'hourly', 'per_sqft'),
    defaultValue: 'flat'
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  imageUrl: {
    type: DataTypes.STRING
  },
  imagePublicId: {
    type: DataTypes.STRING
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'Service',
  tableName: 'services',
  timestamps: true
});

// Define associations in a separate function to avoid circular dependencies
const setupAssociations = (models) => {
  const { ServicePackage, ServiceFrequency, ServiceDiscount } = models;
  
  // Service has many ServicePackages
  Service.hasMany(ServicePackage, {
    foreignKey: 'serviceId',
    as: 'packages'
  });
  
  // Service has many ServiceFrequencies
  Service.hasMany(ServiceFrequency, {
    foreignKey: 'serviceId',
    as: 'frequencies'
  });
  
  // Service has many ServiceDiscounts
  Service.hasMany(ServiceDiscount, {
    foreignKey: 'serviceId',
    as: 'discounts'
  });
};

module.exports = { Service, setupAssociations };
