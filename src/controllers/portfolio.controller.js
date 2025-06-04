const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const cloudinary = require('../utils/cloudinary');
const { sequelize } = require('../config/db');
const models = require('../models');

// @desc    Create new portfolio entry
// @route   POST /api/v1/portfolio
// @access  Private/Admin
exports.createPortfolio = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validate required fields
    const { title, description, location, serviceType, projectDate } = req.body;
    
    if (!title || !description || !location || !serviceType || !projectDate) {
      await transaction.rollback();
      return next(new ErrorResponse('Missing required fields', 400));
    }

    // Handle image uploads
    const images = [];
    
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      
      try {
        for (const file of files) {
          const result = await cloudinary.uploader.upload(file.tempFilePath, {
            folder: 'portfolio',
            resource_type: 'auto'
          });
          
          images.push({
            url: result.secure_url,
            publicId: result.public_id,
            caption: req.body.captions ? req.body.captions[files.indexOf(file)] : '',
            type: req.body.imageTypes ? req.body.imageTypes[files.indexOf(file)] : 'after'
          });
        }
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        await transaction.rollback();
        return next(new ErrorResponse('Error uploading images to Cloudinary', 500));
      }
    }

    const portfolio = await Portfolio.create({
      title,
      description,
      location,
      serviceType,
      projectDate,
      images,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
      clientName: req.body.clientName || '',
      projectDuration: req.body.projectDuration || '',
      projectCost: req.body.projectCost || 0,
      projectSize: req.body.projectSize || '',
      challenges: req.body.challenges || '',
      solutions: req.body.solutions || '',
      customerFeedback: req.body.customerFeedback || '',
      status: req.body.status || 'draft'
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get all portfolio entries
// @route   GET /api/v1/portfolio
// @access  Public
exports.getPortfolios = asyncHandler(async (req, res, next) => {
  try {
    const { serviceType, status, search } = req.query;
    
    // Build query
    const whereClause = {};
    
    if (serviceType) {
      whereClause.serviceType = serviceType;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } },
        { clientName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const portfolios = await Portfolio.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: portfolios.length,
      data: portfolios
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single portfolio entry
// @route   GET /api/v1/portfolio/:id
// @access  Public
exports.getPortfolio = asyncHandler(async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findByPk(req.params.id);

    if (!portfolio) {
      return next(new ErrorResponse(`Portfolio not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update portfolio entry
// @route   PUT /api/v1/portfolio/:id
// @access  Private/Admin
exports.updatePortfolio = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const portfolio = await Portfolio.findByPk(req.params.id);

    if (!portfolio) {
      await transaction.rollback();
      return next(new ErrorResponse(`Portfolio not found with id of ${req.params.id}`, 404));
    }

    // Handle new image uploads
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      
      try {
        for (const file of files) {
          const result = await cloudinary.uploader.upload(file.tempFilePath, {
            folder: 'portfolio',
            resource_type: 'auto'
          });
          
          portfolio.images.push({
            url: result.secure_url,
            publicId: result.public_id,
            caption: req.body.captions ? req.body.captions[files.indexOf(file)] : '',
            type: req.body.imageTypes ? req.body.imageTypes[files.indexOf(file)] : 'after'
          });
        }
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        await transaction.rollback();
        return next(new ErrorResponse('Error uploading images to Cloudinary', 500));
      }
    }

    // Update other fields
    const updateFields = [
      'title', 'description', 'location', 'serviceType', 'projectDate',
      'status', 'clientName', 'projectDuration', 'projectCost',
      'projectSize', 'challenges', 'solutions', 'customerFeedback'
    ];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        portfolio[field] = req.body[field];
      }
    });

    if (req.body.tags) {
      portfolio.tags = req.body.tags.split(',').map(tag => tag.trim());
    }

    await portfolio.update({ images: portfolio.images, tags: portfolio.tags }, { transaction });
    await transaction.commit();

    res.status(200).json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Delete portfolio entry
// @route   DELETE /api/v1/portfolio/:id
// @access  Private/Admin
exports.deletePortfolio = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const portfolio = await models.Portfolio.findByPk(req.params.id, { transaction });

    if (!portfolio) {
      await transaction.rollback();
      return next(new ErrorResponse(`No portfolio found with id of ${req.params.id}`, 404));
    }

    // Delete images from cloudinary
    for (const image of portfolio.images) {
      await cloudinary.uploader.destroy(image.publicId);
    }

    await portfolio.destroy({ transaction });
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

// @desc    Delete image from portfolio
// @route   DELETE /api/v1/portfolio/:id/images/:imageId
// @access  Private/Admin
exports.deleteImage = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const portfolio = await models.Portfolio.findByPk(req.params.id, { transaction });

    if (!portfolio) {
      await transaction.rollback();
      return next(new ErrorResponse(`No portfolio found with id of ${req.params.id}`, 404));
    }

    const images = portfolio.images || [];
    const imageIndex = images.findIndex(img => img.id === req.params.imageId);

    if (imageIndex === -1) {
      await transaction.rollback();
      return next(new ErrorResponse(`No image found with id of ${req.params.imageId}`, 404));
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(images[imageIndex].publicId);

    // Remove from portfolio
    images.splice(imageIndex, 1);
    await portfolio.update({ images }, { transaction });
    await transaction.commit();

    res.status(200).json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});
