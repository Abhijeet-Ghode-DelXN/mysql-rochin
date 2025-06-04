const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { sequelize } = require('../config/db');
const { Appointment, AppointmentPhoto } = require('../models');
const cloudinary = require('../utils/cloudinary');

// @desc    Get photos for an appointment
// @route   GET /api/v1/appointments/:appointmentId/photos
// @access  Private/Admin/Professional/Customer
exports.getAppointmentPhotos = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findByPk(req.params.appointmentId);

  if (!appointment) {
    return next(
      new ErrorResponse(`Appointment not found with id of ${req.params.appointmentId}`, 404)
    );
  }

  // If customer is requesting, verify ownership
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ where: { userId: req.user.id } });
    if (!customer || appointment.customerId !== customer.id) {
      return next(
        new ErrorResponse(`Not authorized to access photos for this appointment`, 403)
      );
    }
  }

  const photos = await AppointmentPhoto.findAll({
    where: { appointmentId: req.params.appointmentId }
  });

  res.status(200).json({
    success: true,
    count: photos.length,
    data: photos
  });
});

// @desc    Get a single photo
// @route   GET /api/v1/appointments/:appointmentId/photos/:id
// @access  Private/Admin/Professional/Customer
exports.getAppointmentPhoto = asyncHandler(async (req, res, next) => {
  const photo = await AppointmentPhoto.findOne({
    where: {
      id: req.params.id,
      appointmentId: req.params.appointmentId
    }
  });

  if (!photo) {
    return next(
      new ErrorResponse(`Photo not found with id of ${req.params.id}`, 404)
    );
  }

  const appointment = await Appointment.findByPk(req.params.appointmentId);

  // If customer is requesting, verify ownership
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ where: { userId: req.user.id } });
    if (!customer || appointment.customerId !== customer.id) {
      return next(
        new ErrorResponse(`Not authorized to access this photo`, 403)
      );
    }
  }

  res.status(200).json({
    success: true,
    data: photo
  });
});

// @desc    Update photo caption
// @route   PUT /api/v1/appointments/:appointmentId/photos/:id
// @access  Private/Admin/Professional
exports.updatePhotoCaption = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { caption } = req.body;

    if (!caption) {
      await transaction.rollback();
      return next(new ErrorResponse('Please provide a caption', 400));
    }

    const photo = await AppointmentPhoto.findOne({
      where: {
        id: req.params.id,
        appointmentId: req.params.appointmentId
      },
      transaction
    });

    if (!photo) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Photo not found with id of ${req.params.id}`, 404)
      );
    }

    photo.caption = caption;
    await photo.save({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: photo
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Delete photo
// @route   DELETE /api/v1/appointments/:appointmentId/photos/:id
// @access  Private/Admin/Professional
exports.deletePhoto = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const photo = await AppointmentPhoto.findOne({
      where: {
        id: req.params.id,
        appointmentId: req.params.appointmentId
      },
      transaction
    });

    if (!photo) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Photo not found with id of ${req.params.id}`, 404)
      );
    }

    // Delete from Cloudinary if publicId exists
    if (photo.publicId) {
      try {
        await cloudinary.uploader.destroy(photo.publicId);
      } catch (err) {
        console.log('Error deleting photo from Cloudinary:', err);
      }
    }

    // Delete from database
    await photo.destroy({ transaction });

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

// @desc    Get before/after service photos
// @route   GET /api/v1/appointments/:appointmentId/photos/:type
// @access  Private/Admin/Professional/Customer
exports.getPhotosByType = asyncHandler(async (req, res, next) => {
  const { type } = req.params;
  
  if (!['beforeService', 'afterService'].includes(type)) {
    return next(
      new ErrorResponse('Invalid photo type. Must be "beforeService" or "afterService"', 400)
    );
  }

  const appointment = await Appointment.findByPk(req.params.appointmentId);

  if (!appointment) {
    return next(
      new ErrorResponse(`Appointment not found with id of ${req.params.appointmentId}`, 404)
    );
  }

  // If customer is requesting, verify ownership
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ where: { userId: req.user.id } });
    if (!customer || appointment.customerId !== customer.id) {
      return next(
        new ErrorResponse(`Not authorized to access photos for this appointment`, 403)
      );
    }
  }

  const photos = await AppointmentPhoto.findAll({
    where: { 
      appointmentId: req.params.appointmentId,
      photoType: type
    }
  });

  res.status(200).json({
    success: true,
    count: photos.length,
    data: photos
  });
});
