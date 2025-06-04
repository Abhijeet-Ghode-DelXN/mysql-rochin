const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class User extends Model {
  // Sign JWT and return
  getSignedJwtToken() {
    return jwt.sign({ id: this.id, role: this.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });
  }

  // Match user entered password to hashed password in database
  async matchPassword(enteredPassword) {
    console.log('--- Inside matchPassword ---');
    console.log('Entered Password:', `"${enteredPassword}"`); // Log with quotes to see spaces
    console.log('Stored Hashed Password:', `"${this.password}"`);
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    console.log('bcrypt.compare result:', isMatch);
    console.log('--- Exiting matchPassword ---');
    return isMatch;
  }

  // Generate and hash password token
  getResetPasswordToken() {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
  }

  // Generate email verification token
  getEmailVerificationToken() {
    // Generate token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to emailVerificationToken field
    this.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Set expire
    this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;

    return verificationToken;
  }

  // Generate password setup token
  getPasswordSetupToken() {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to field
    this.passwordSetupToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (24 hours)
    this.passwordSetupExpire = Date.now() + 24 * 60 * 60 * 1000;

    return resetToken;
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please add a name' }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Please add an email' },
      isEmail: { msg: 'Please add a valid email' }
    }
  },
  role: {
    type: DataTypes.ENUM('customer', 'professional', 'admin'),
    defaultValue: 'customer'
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please add a password' },
      len: { args: [6, 100], msg: 'Password must be at least 6 characters' }
    }
  },
  phone: {
    type: DataTypes.STRING,
    validate: {
      len: { args: [0, 20], msg: 'Phone number cannot be longer than 20 characters' }
    }
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resetPasswordToken: {
    type: DataTypes.STRING
  },
  resetPasswordExpire: {
    type: DataTypes.DATE
  },
  emailVerificationToken: {
    type: DataTypes.STRING
  },
  emailVerificationExpire: {
    type: DataTypes.DATE
  },
  needsPasswordReset: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  passwordSetupToken: {
    type: DataTypes.STRING
  },
  passwordSetupExpire: {
    type: DataTypes.DATE
  },
  lastLogin: {
    type: DataTypes.DATE
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

module.exports = {
  User,
  setupAssociations: (models) => {
    // Add any user-specific associations here if needed
  }
};
