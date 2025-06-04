const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { HeroImage } = require('../models');
const cloudinary = require('../utils/cloudinary');
const { sequelize } = require('../config/db');

// @desc    Get hero image
// @route   GET /api/v1/hero-image
// @access  Public
exports.getHeroImage = asyncHandler(async (req, res, next) => {
  try {
    const heroImage = await HeroImage.findOne({
      order: [['createdAt', 'DESC']]
    });

    if (!heroImage) {
      await transaction.commit();
      return res.status(200).json({
        success: true,
        data: {
          url: '/images/landscaping-image.png',
          publicId: null
        }
      });
    }

    await transaction.commit();
    
    res.status(200).json({
      success: true,
      data: heroImage
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Update hero image
// @route   PUT /api/v1/hero-image
// @access  Private/Admin
exports.updateHeroImage = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Delete existing hero image if it exists
    const existingImage = await models.HeroImage.findOne({ transaction });
    if (existingImage) {
      await cloudinary.uploader.destroy(existingImage.publicId);
      await existingImage.destroy({ transaction });
    }

    // Upload new image to Cloudinary
    const result = await cloudinary.uploader.upload(req.files.image.tempFilePath, {
      folder: 'hero',
      resource_type: 'auto'
    });

    // Create new hero image record
    const heroImage = await models.HeroImage.create({
      url: result.secure_url,
      publicId: result.public_id
    }, { transaction });

    await transaction.commit();
    
    res.status(200).json({
      success: true,
      data: heroImage
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Delete hero image
// @route   DELETE /api/v1/hero-image
// @access  Private/Admin
exports.deleteHeroImage = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const heroImage = await HeroImage.findOne({
      order: [['createdAt', 'DESC']],
      transaction
    });

    if (!heroImage) {
      await transaction.rollback();
      return next(new ErrorResponse('No hero image found', 404));
    }

    // Delete from Cloudinary if publicId exists
    if (heroImage.publicId) {
      try {
        await cloudinary.uploader.destroy(heroImage.publicId);
      } catch (error) {
        console.error('Error deleting hero image from Cloudinary:', error);
      }
    }

    await HeroImage.destroy({
      where: {},
      transaction
    });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {
        url: '/images/landscaping-image.png',
        publicId: null
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});
