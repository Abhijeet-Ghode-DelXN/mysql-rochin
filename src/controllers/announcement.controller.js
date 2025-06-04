const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { sequelize } = require('../config/db');
const { Announcement, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all announcements
// @route   GET /api/v1/announcements
// @access  Private/Admin
exports.getAnnouncements = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const announcements = await Announcement.findAll({
      transaction,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: User,
          as: 'modifier',
          attributes: ['id', 'name', 'email', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    await transaction.commit();

    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get active announcement
// @route   GET /api/v1/announcements/active
// @access  Public
exports.getActiveAnnouncement = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const announcement = await Announcement.findOne({
      transaction,
      where: {
        status: 'active',
        startDate: {
          [Op.lte]: new Date()
        },
        endDate: {
          [Op.gte]: new Date()
        }
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: User,
          as: 'modifier',
          attributes: ['id', 'name', 'email', 'role']
        }
      ]
    });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get single announcement
// @route   GET /api/v1/announcements/:id
// @access  Private/Admin
exports.getAnnouncement = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const announcement = await Announcement.findByPk(req.params.id, {
      transaction,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: User,
          as: 'modifier',
          attributes: ['id', 'name', 'email', 'role']
        }
      ]
    });

    if (!announcement) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Announcement not found with id of ${req.params.id}`, 404)
      );
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Create announcement
// @route   POST /api/v1/announcements
// @access  Private/Admin
exports.createAnnouncement = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Set createdBy to current user
    req.body.createdBy = req.user.id;
    req.body.modifiedBy = req.user.id;

    // Ensure targetRoles is an array
    if (req.body.targetRoles && !Array.isArray(req.body.targetRoles)) {
      req.body.targetRoles = JSON.parse(req.body.targetRoles);
    }

    const announcement = await Announcement.create(req.body, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Update announcement
// @route   PUT /api/v1/announcements/:id
// @access  Private/Admin
exports.updateAnnouncement = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const announcement = await Announcement.findByPk(req.params.id, { transaction });

    if (!announcement) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Announcement not found with id of ${req.params.id}`, 404)
      );
    }

    // Update modifiedBy
    req.body.modifiedBy = req.user.id;

    // Ensure targetRoles is an array
    if (req.body.targetRoles && !Array.isArray(req.body.targetRoles)) {
      req.body.targetRoles = JSON.parse(req.body.targetRoles);
    }

    await announcement.update(req.body, { transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Delete announcement
// @route   DELETE /api/v1/announcements/:id
// @access  Private/Admin
exports.deleteAnnouncement = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const announcement = await Announcement.findByPk(req.params.id, { transaction });

    if (!announcement) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Announcement not found with id of ${req.params.id}`, 404)
      );
    }

    await announcement.destroy({ transaction });

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
