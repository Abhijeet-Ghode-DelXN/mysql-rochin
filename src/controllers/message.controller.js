const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { Message } = require('../models');
const { sequelize } = require('../config/db');

// @desc    Get all messages
// @route   GET /api/v1/messages
// @access  Private
exports.getMessages = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const messages = await Message.findAll({
      transaction,
      order: [['createdAt', 'DESC']]
    });

    await transaction.commit();
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get single message
// @route   GET /api/v1/messages/:id
// @access  Private
exports.getMessage = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const message = await Message.findByPk(req.params.id, { transaction });

    if (!message) {
      await transaction.rollback();
      return next(new ErrorResponse(`No message found with id of ${req.params.id}`, 404));
    }

    await transaction.commit();
    
    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Create new message
// @route   POST /api/v1/messages
// @access  Private
exports.createMessage = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const message = await Message.create({
      senderId: req.user.id,
      receiverId: req.body.receiverId,
      content: req.body.content,
      type: req.body.type || 'text',
      metadata: req.body.metadata
    }, { transaction });

    await transaction.commit();
    
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Update message
// @route   PUT /api/v1/messages/:id
// @access  Private
exports.updateMessage = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const message = await Message.findByPk(req.params.id, { transaction });

    if (!message) {
      await transaction.rollback();
      return next(new ErrorResponse(`No message found with id of ${req.params.id}`, 404));
    }

    // Only allow updating if user is sender or receiver
    if (message.senderId !== req.user.id && message.receiverId !== req.user.id) {
      await transaction.rollback();
      return next(new ErrorResponse('Not authorized to update this message', 403));
    }

    await message.update(req.body, { transaction });
    await transaction.commit();

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Delete message
// @route   DELETE /api/v1/messages/:id
// @access  Private
exports.deleteMessage = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const message = await Message.findByPk(req.params.id, { transaction });

    if (!message) {
      await transaction.rollback();
      return next(new ErrorResponse(`No message found with id of ${req.params.id}`, 404));
    }

    // Only allow deletion if user is sender or receiver
    if (message.senderId !== req.user.id && message.receiverId !== req.user.id) {
      await transaction.rollback();
      return next(new ErrorResponse('Not authorized to delete this message', 403));
    }

    await message.destroy({ transaction });
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

// @desc    Mark message as read
// @route   PUT /api/v1/messages/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const message = await Message.findByPk(req.params.id, { transaction });

    if (!message) {
      await transaction.rollback();
      return next(new ErrorResponse(`No message found with id of ${req.params.id}`, 404));
    }

    // Only allow marking as read if user is receiver
    if (message.receiverId !== req.user.id) {
      await transaction.rollback();
      return next(new ErrorResponse('Not authorized to mark this message as read', 403));
    }

    message.isRead = true;
    message.status = 'read';
    await message.save({ transaction });
    await transaction.commit();

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});
