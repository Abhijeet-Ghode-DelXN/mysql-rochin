const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { sequelize } = require('../config/db');
const { BusinessSetting, User } = require('../models');
const cloudinary = require('../utils/cloudinary');

// @desc    Get business settings
// @route   GET /api/v1/business-settings
// @access  Private/Admin
exports.getBusinessSettings = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const settings = await BusinessSetting.getSettings();
    
    await transaction.commit();

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Update business settings
// @route   PUT /api/v1/business-settings
// @access  Private/Admin
exports.updateBusinessSettings = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Get settings
    const settings = await BusinessSetting.getSettings({ transaction });

    // Update with current user as updater
    req.body.updatedBy = req.user.id;

    await settings.update(req.body, { transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Upload business logo
// @route   PUT /api/v1/business-settings/logo
// @access  Private/Admin
exports.uploadLogo = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (!req.files || !req.files.logo) {
      await transaction.rollback();
      return next(new ErrorResponse('Please upload a logo file', 400));
    }

    const file = req.files.logo;

    // Validate file type
    if (!file.mimetype.startsWith('image')) {
      await transaction.rollback();
      return next(new ErrorResponse('Please upload an image file', 400));
    }

    // Validate file size
    if (file.size > process.env.MAX_FILE_UPLOAD) {
      await transaction.rollback();
      return next(
        new ErrorResponse(
          `Please upload an image less than ${process.env.MAX_FILE_UPLOAD} bytes`,
          400
        )
      );
    }

    // Get settings
    const settings = await BusinessSetting.getSettings({ transaction });

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: 'business-logos'
    });

    // Update settings with new logo URL
    settings.companyLogo = result.secure_url;
    settings.logoPublicId = result.public_id;
    settings.updatedBy = req.user.id;

    await settings.save({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {
        logo: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Update business hours
// @route   PUT /api/v1/business-settings/hours
// @access  Private/Admin
exports.updateBusinessHours = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { businessHours } = req.body;

    if (!businessHours) {
      await transaction.rollback();
      return next(new ErrorResponse('Please provide business hours', 400));
    }

    // Validate business hours format
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (const day of days) {
      if (businessHours[day]) {
        const { isOpen, openTime, closeTime } = businessHours[day];
        
        if (typeof isOpen !== 'boolean') {
          await transaction.rollback();
          return next(new ErrorResponse(`Invalid isOpen value for ${day}`, 400));
        }
        
        if (isOpen) {
          if (!openTime || !closeTime) {
            await transaction.rollback();
            return next(new ErrorResponse(`Please provide open and close times for ${day}`, 400));
          }
          
          // Simple time format validation (HH:MM)
          const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
          if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
            await transaction.rollback();
            return next(new ErrorResponse(`Invalid time format for ${day}. Use HH:MM format`, 400));
          }
        }
      }
    }

    // Get settings
    const settings = await BusinessSetting.getSettings({ transaction });

    // Update business hours
    settings.businessHours = businessHours;
    settings.updatedBy = req.user.id;

    await settings.save({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: settings.businessHours
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Update notification settings
// @route   PUT /api/v1/business-settings/notifications
// @access  Private/Admin
exports.updateNotificationSettings = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { notificationSettings } = req.body;

    if (!notificationSettings) {
      await transaction.rollback();
      return next(new ErrorResponse('Please provide notification settings', 400));
    }

    // Get settings
    const settings = await BusinessSetting.getSettings({ transaction });

    // Update notification settings
    settings.notificationSettings = notificationSettings;
    settings.updatedBy = req.user.id;

    await settings.save({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: settings.notificationSettings
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Update business terms
// @route   PUT /api/v1/business-settings/terms
// @access  Private/Admin
exports.updateBusinessTerms = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { terms } = req.body;

    if (!terms) {
      await transaction.rollback();
      return next(new ErrorResponse('Please provide business terms', 400));
    }

    // Get settings
    const settings = await BusinessSetting.getSettings({ transaction });

    // Update terms
    settings.terms = terms;
    settings.updatedBy = req.user.id;

    await settings.save({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: settings.terms
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});
