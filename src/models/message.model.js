const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'file'),
    allowNull: false,
    defaultValue: 'text'
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'read'),
    allowNull: false,
    defaultValue: 'sent'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'Messages'
});

// Ensure only one message exists at a time
Message.beforeCreate(async (message, options) => {
  const transaction = options.transaction;
  if (transaction) {
    await Message.destroy({
      where: {},
      transaction
    });
  } else {
    await Message.destroy({
      where: {}
    });
  }
});

module.exports = Message;
