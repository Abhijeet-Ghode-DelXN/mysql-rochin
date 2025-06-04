const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Appointment extends Model {
  // Instance method to get calendar color based on service category
  getCalendarColor() {
    const colorMap = {
      'Lawn Maintenance': '#28a745', // green
      'Gardening': '#ffc107', // yellow
      'Tree Service': '#6c757d', // gray
      'Landscaping Design': '#17a2b8', // cyan
      'Irrigation': '#007bff', // blue
      'Seasonal': '#dc3545', // red
      'Other': '#6610f2' // purple
    };

    // This will be populated when the service is eager loaded
    if (!this.service || !this.service.category) {
      return '#6c757d'; // Default gray color for unknown services
    }

    return colorMap[this.service.category] || '#6c757d';
  }
}

Appointment.init({
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
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'services',
      key: 'id'
    }
  },
  packageType: {
    type: DataTypes.ENUM('Basic', 'Standard', 'Premium'),
    defaultValue: 'Standard'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notNull: { msg: 'Please add an appointment date' }
    }
  },
  startTime: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: 'Please add a start time' }
    }
  },
  endTime: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: 'Please add an end time' }
    }
  },
  duration: {
    type: DataTypes.INTEGER,
    validate: {
      min: 15,
      max: 480
    }
  },
  status: {
    type: DataTypes.ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled'),
    defaultValue: 'Scheduled'
  },
  recurringType: {
    type: DataTypes.ENUM('One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annually'),
    defaultValue: 'One-time'
  },
  leadProfessionalId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  customerNotes: {
    type: DataTypes.TEXT
  },
  professionalNotes: {
    type: DataTypes.TEXT
  },
  internalNotes: {
    type: DataTypes.TEXT
  },
  paymentStatus: {
    type: DataTypes.ENUM('Pending', 'Paid', 'Partially Paid', 'Refunded'),
    defaultValue: 'Pending'
  },
  paymentAmount: {
    type: DataTypes.DECIMAL(10, 2)
  },
  transactionId: {
    type: DataTypes.STRING
  },
  paymentMethod: {
    type: DataTypes.ENUM('Credit Card', 'PayPal', 'Cash', 'Check', 'Bank Transfer'),
    defaultValue: 'Credit Card'
  },
  paymentDate: {
    type: DataTypes.DATE
  },
  completedAt: {
    type: DataTypes.DATE
  },
  completionDuration: {
    type: DataTypes.INTEGER // in minutes
  },
  additionalWorkPerformed: {
    type: DataTypes.TEXT
  },
  customerSignature: {
    type: DataTypes.STRING
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  confirmationSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completionSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdById: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'Appointment',
  tableName: 'appointments',
  timestamps: true
});

// Define associations in a separate function to avoid circular dependencies
const setupAssociations = (models) => {
  const { Customer, Service, User, AppointmentCrew, AppointmentPhoto } = models;
  
  // Appointment belongs to Customer
  Appointment.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
  });
  
  // Appointment belongs to Service
  Appointment.belongsTo(Service, {
    foreignKey: 'serviceId',
    as: 'service'
  });
  
  // Appointment belongs to User (lead professional)
  Appointment.belongsTo(User, {
    foreignKey: 'leadProfessionalId',
    as: 'leadProfessional'
  });
  
  // Appointment belongs to User (created by)
  Appointment.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'createdBy'
  });
  
  // Appointment has many AppointmentCrew
  Appointment.hasMany(AppointmentCrew, {
    foreignKey: 'appointmentId',
    as: 'crew'
  });
  
  // Appointment has many AppointmentPhotos
  Appointment.hasMany(AppointmentPhoto, {
    foreignKey: 'appointmentId',
    as: 'photos'
  });
};

module.exports = { Appointment, setupAssociations };
