const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { sequelize } = require('../config/db');
const models = require('../models');

// @desc    Get all contacts
// @route   GET /api/v1/contact
// @access  Private/Admin
exports.getContacts = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const contacts = await models.Contact.findAll({
      transaction,
      order: [['createdAt', 'DESC']]
    });

    await transaction.commit();
    
    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get single contact
// @route   GET /api/v1/contact/:id
// @access  Private/Admin
exports.getContact = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const contact = await models.Contact.findByPk(req.params.id, { transaction });

    if (!contact) {
      await transaction.rollback();
      return next(new ErrorResponse(`No contact found with id of ${req.params.id}`, 404));
    }

    await transaction.commit();
    
    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Create contact message
// @route   POST /api/v1/contact
// @access  Public
exports.createContact = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const contact = await models.Contact.create(req.body, { transaction });

    await transaction.commit();
    
    res.status(201).json({
      success: true,
      data: contact
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Update contact status
// @route   PUT /api/v1/contact/:id
// @access  Private/Admin
exports.updateContact = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const contact = await models.Contact.findByPk(req.params.id, { transaction });

    if (!contact) {
      await transaction.rollback();
      return next(new ErrorResponse(`No contact found with id of ${req.params.id}`, 404));
    }

    await contact.update(req.body, { transaction });
    await transaction.commit();

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Delete contact
// @route   DELETE /api/v1/contact/:id
// @access  Private/Admin
exports.deleteContact = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const contact = await models.Contact.findByPk(req.params.id, { transaction });

    if (!contact) {
      await transaction.rollback();
      return next(new ErrorResponse(`No contact found with id of ${req.params.id}`, 404));
    }

    await contact.destroy({ transaction });
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
