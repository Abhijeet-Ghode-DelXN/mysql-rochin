const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Portfolio = sequelize.define('Portfolio', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  serviceType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  projectDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  images: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  thumbnailIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  tags: {
    type: DataTypes.STRING,
    allowNull: true
  },
  clientName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  clientEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  clientPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  projectDuration: {
    type: DataTypes.STRING,
    allowNull: true
  },
  projectBudget: {
    type: DataTypes.STRING,
    allowNull: true
  },
  projectCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  projectSize: {
    type: DataTypes.STRING,
    allowNull: true
  },
  challenges: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  solutions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  customerFeedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft'
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'Portfolios',
  indexes: [
    {
      fields: ['serviceType']
    },
    {
      fields: ['status']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = Portfolio;
