const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Estimate extends Model {
  // Generate estimate number
  static async generateEstimateNumber() {
    const count = await this.count();
    const date = new Date();
    return `EST-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;
  }
}

Estimate.init({
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
  // Property details
  propertyStreet: {
    type: DataTypes.STRING
  },
  propertyCity: {
    type: DataTypes.STRING
  },
  propertyState: {
    type: DataTypes.STRING
  },
  propertyZipCode: {
    type: DataTypes.STRING
  },
  propertySize: {
    type: DataTypes.INTEGER // in square feet
  },
  propertyDetails: {
    type: DataTypes.TEXT
  },
  customerNotes: {
    type: DataTypes.TEXT
  },
  budgetMin: {
    type: DataTypes.DECIMAL(10, 2)
  },
  budgetMax: {
    type: DataTypes.DECIMAL(10, 2)
  },
  accessInfo: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('Requested', 'In Review', 'Prepared', 'Sent', 'Approved', 'Declined', 'Expired'),
    defaultValue: 'Requested'
  },
  approvedPackage: {
    type: DataTypes.ENUM('Basic', 'Standard', 'Premium')
  },
  expiryDate: {
    type: DataTypes.DATE
  },
  depositRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  depositAmount: {
    type: DataTypes.DECIMAL(10, 2)
  },
  depositPaymentId: {
    type: DataTypes.STRING
  },
  depositPaidOn: {
    type: DataTypes.DATE
  },
  estimateNumber: {
    type: DataTypes.STRING,
    unique: true
  },
  assignedToId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'Estimate',
  tableName: 'estimates',
  timestamps: true,
  hooks: {
    beforeCreate: async (estimate) => {
      if (!estimate.estimateNumber) {
        estimate.estimateNumber = await Estimate.generateEstimateNumber();
      }
    }
  }
});

// Define associations in a separate function to avoid circular dependencies
const setupAssociations = (models) => {
  const { Customer, User, EstimateService, EstimatePhoto, EstimatePackage } = models;
  
  // Estimate belongs to Customer
  Estimate.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
  });
  
  // Estimate belongs to User (assigned to)
  Estimate.belongsTo(User, {
    foreignKey: 'assignedToId',
    as: 'assignedTo'
  });
  
  // Estimate belongs to User (created by)
  Estimate.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'createdBy'
  });
  
  // Estimate has many EstimateServices
  Estimate.hasMany(EstimateService, {
    foreignKey: 'estimateId',
    as: 'services'
  });
  
  // Estimate has many EstimatePhotos
  Estimate.hasMany(EstimatePhoto, {
    foreignKey: 'estimateId',
    as: 'photos'
  });
  
  // Estimate has many EstimatePackages
  Estimate.hasMany(EstimatePackage, {
    foreignKey: 'estimateId',
    as: 'packages'
  });
};

module.exports = { Estimate, setupAssociations };
