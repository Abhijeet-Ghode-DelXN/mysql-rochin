const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { sequelize } = require('../config/db');
const { User, Customer, Professional } = require('../models');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const users = await User.findAll({
      transaction,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'address', 'propertyDetails']
        },
        {
          model: Professional,
          as: 'professional',
          attributes: ['id', 'specialization', 'rating']
        }
      ]
    });

    await transaction.commit();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const user = await User.findByPk(req.params.id, {
      transaction,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'address', 'propertyDetails']
        },
        {
          model: Professional,
          as: 'professional',
          attributes: ['id', 'specialization', 'rating']
        }
      ]
    });

    if (!user) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Create user
// @route   POST /api/v1/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Hash password
    req.body.password = await bcrypt.hash(req.body.password, 10);

    const user = await User.create(req.body, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const user = await User.findByPk(req.params.id, { transaction });

    if (!user) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // If password is being updated, hash it
    if (req.body.password) {
      req.body.password = await bcrypt.hash(req.body.password, 10);
    }

    await user.update(req.body, { transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const user = await User.findByPk(req.params.id, { transaction });

    if (!user) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // Delete associated customer or professional profile if exists
    if (user.customerId) {
      await Customer.destroy({
        where: { id: user.customerId },
        transaction
      });
    }

    if (user.professionalId) {
      await Professional.destroy({
        where: { id: user.professionalId },
        transaction
      });
    }

    await user.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});
