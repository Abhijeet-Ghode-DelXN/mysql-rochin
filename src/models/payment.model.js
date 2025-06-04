const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Customers',
      key: 'id'
    }
  },
  appointmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Appointments',
      key: 'id'
    }
  },
  estimateId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Estimates',
      key: 'id'
    }
  },
  paymentType: {
    type: DataTypes.ENUM('Appointment', 'Deposit', 'Final Payment', 'Other'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Completed', 'Refunded', 'Partially Refunded'),
    allowNull: false,
    defaultValue: 'Pending'
  },
  method: {
    type: DataTypes.STRING,
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'USD'
  },
  gateway: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gatewayTransactionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  receiptUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billingAddress: {
    type: DataTypes.JSON,
    allowNull: true
  },
  cardDetails: {
    type: DataTypes.JSON,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  processedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  refund: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'Payments'
});

// Associations
Payment.associate = (models) => {
  Payment.belongsTo(models.Customer, {
    foreignKey: 'customerId',
    as: 'customer'
  });

  Payment.belongsTo(models.Appointment, {
    foreignKey: 'appointmentId',
    as: 'appointment'
  });

  Payment.belongsTo(models.Estimate, {
    foreignKey: 'estimateId',
    as: 'estimate'
  });

  Payment.belongsTo(models.User, {
    foreignKey: 'processedById',
    as: 'processedBy'
  });
};

module.exports = Payment;
