const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Announcement = sequelize.define('Announcement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please add a title' }
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please add content' }
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  type: {
    type: DataTypes.ENUM('general', 'emergency', 'update'),
    defaultValue: 'general'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE
  },
  targetRoles: {
    type: DataTypes.JSON,
    defaultValue: ['customer', 'professional', 'admin']
  },
  createdBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  modifiedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'Announcements'
});

const setupAssociations = (models) => {
  Announcement.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });

  Announcement.belongsTo(models.User, {
    foreignKey: 'modifiedBy',
    as: 'modifier'
  });
};

module.exports = {
  Announcement,
  setupAssociations
};
