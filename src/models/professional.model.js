const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Professional extends Model {}

Professional.init({
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
  specialization: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please add a specialization' }
    }
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  experienceYears: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0
    }
  },
  bio: {
    type: DataTypes.TEXT
  },
  availability: {
    type: DataTypes.JSON,
    defaultValue: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false
    }
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    validate: {
      min: 0
    }
  },
  certifications: {
    type: DataTypes.TEXT
  },
  services: {
    type: DataTypes.TEXT
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'Professional',
  tableName: 'professionals',
  timestamps: true
});

// Define associations in a separate function to avoid circular dependencies
const setupAssociations = (models) => {
  const { User } = models;
  
  // Professional belongs to User
  Professional.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

module.exports = { Professional, setupAssociations };
