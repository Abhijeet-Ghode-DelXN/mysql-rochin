const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class BusinessSetting extends Model {}

BusinessSetting.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'GardenPro Services'
  },
  companyLogo: {
    type: DataTypes.STRING
  },
  companyEmail: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  companyPhone: {
    type: DataTypes.STRING
  },
  companyAddress: {
    type: DataTypes.TEXT
  },
  businessHours: {
    type: DataTypes.JSON,
    defaultValue: {
      monday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      tuesday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      wednesday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      thursday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      friday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      saturday: { isOpen: false, openTime: '', closeTime: '' },
      sunday: { isOpen: false, openTime: '', closeTime: '' }
    }
  },
  notificationSettings: {
    type: DataTypes.JSON,
    defaultValue: {
      email: {
        appointmentCreated: true,
        appointmentUpdated: true,
        appointmentCancelled: true,
        appointmentReminder: true
      },
      sms: {
        appointmentCreated: false,
        appointmentUpdated: false,
        appointmentCancelled: false,
        appointmentReminder: true
      }
    }
  },
  terms: {
    type: DataTypes.TEXT,
    defaultValue: 'Standard business terms and conditions will be applied.'
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD'
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'BusinessSetting',
  tableName: 'business_settings',
  timestamps: true,
  hooks: {
    // Ensure only one record exists in the table
    beforeCreate: async (instance, options) => {
      const existing = await BusinessSetting.count();
      if (existing > 0) {
        throw new Error('Only one business setting record is allowed');
      }
    }
  }
});

// Define associations in a separate function to avoid circular dependencies
const setupAssociations = (models) => {
  const { User } = models;
  
  // BusinessSetting belongs to User (updatedBy)
  BusinessSetting.belongsTo(User, {
    foreignKey: 'updatedBy',
    as: 'updater'
  });
};

// Static method to get or create settings
BusinessSetting.getSettings = async () => {
  const settings = await BusinessSetting.findOne();
  if (!settings) {
    return await BusinessSetting.create({});
  }
  return settings;
};

module.exports = { BusinessSetting, setupAssociations };
