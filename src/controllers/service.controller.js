const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { Service, ServicePackage, ServiceFrequency, ServiceDiscount } = require('../models/index');
const cloudinary = require('../utils/cloudinary');
const { Readable } = require('stream');
const { sequelize } = require('../config/db');

// @desc    Get all services
// @route   GET /api/v1/services
// @access  Public
exports.getServices = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single service
// @route   GET /api/v1/services/:id
// @access  Public
exports.getService = asyncHandler(async (req, res, next) => {
  const service = await Service.findByPk(req.params.id, {
    include: [
      { model: ServicePackage, as: 'packages' },
      { model: ServiceFrequency, as: 'frequencies' },
      { model: ServiceDiscount, as: 'discounts' }
    ]
  });

  if (!service) {
    return next(
      new ErrorResponse(`Service not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: service
  });
});

// @desc    Create new service
// @route   POST /api/v1/services
// @access  Private/Admin
exports.createService = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    // Add user to req.body
    req.body.userId = req.user.id;
    
    // Extract nested data
    const { packages = [], frequencies = [], discounts = [], ...serviceData } = req.body;

    // Create service
    const service = await Service.create(serviceData, { transaction });

    // Create packages if any
    if (packages.length > 0) {
      for (const pkg of packages) {
        await ServicePackage.create({
          ...pkg,
          serviceId: service.id
        }, { transaction });
      }
    }

    // Create frequencies if any
    if (frequencies.length > 0) {
      for (const freq of frequencies) {
        await ServiceFrequency.create({
          frequency: freq,
          serviceId: service.id
        }, { transaction });
      }
    }

    // Create discounts if any
    if (discounts.length > 0) {
      for (const [frequency, value] of Object.entries(discounts)) {
        await ServiceDiscount.create({
          frequency,
          discountPercentage: value,
          serviceId: service.id
        }, { transaction });
      }
    }

    await transaction.commit();

    // Fetch the complete service with associations
    const completeService = await Service.findByPk(service.id, {
      include: [
        { model: ServicePackage, as: 'packages' },
        { model: ServiceFrequency, as: 'frequencies' },
        { model: ServiceDiscount, as: 'discounts' }
      ]
    });

    res.status(201).json({
      success: true,
      data: completeService
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
});

// @desc    Update service
// @route   PUT /api/v1/services/:id
// @access  Private/Admin
exports.updateService = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    let service = await Service.findByPk(req.params.id);

    if (!service) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Service not found with id of ${req.params.id}`, 404)
      );
    }

    // Extract nested data
    const { packages, frequencies, discounts, ...serviceData } = req.body;

    // Update service
    await service.update(serviceData, { transaction });

    // Update packages if provided
    if (packages) {
      // Delete existing packages
      await ServicePackage.destroy({
        where: { serviceId: service.id },
        transaction
      });

      // Create new packages
      for (const pkg of packages) {
        await ServicePackage.create({
          ...pkg,
          serviceId: service.id
        }, { transaction });
      }
    }

    // Update frequencies if provided
    if (frequencies) {
      // Delete existing frequencies
      await ServiceFrequency.destroy({
        where: { serviceId: service.id },
        transaction
      });

      // Create new frequencies
      for (const freq of frequencies) {
        await ServiceFrequency.create({
          frequency: freq,
          serviceId: service.id
        }, { transaction });
      }
    }

    // Update discounts if provided
    if (discounts) {
      // Delete existing discounts
      await ServiceDiscount.destroy({
        where: { serviceId: service.id },
        transaction
      });

      // Create new discounts
      for (const [frequency, value] of Object.entries(discounts)) {
        await ServiceDiscount.create({
          frequency,
          discountPercentage: value,
          serviceId: service.id
        }, { transaction });
      }
    }

    await transaction.commit();

    // Fetch the updated service with associations
    const updatedService = await Service.findByPk(service.id, {
      include: [
        { model: ServicePackage, as: 'packages' },
        { model: ServiceFrequency, as: 'frequencies' },
        { model: ServiceDiscount, as: 'discounts' }
      ]
    });

    res.status(200).json({
      success: true,
      data: updatedService
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
});

// @desc    Delete service
// @route   DELETE /api/v1/services/:id
// @access  Private/Admin
exports.deleteService = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const service = await Service.findByPk(req.params.id);

    if (!service) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Service not found with id of ${req.params.id}`, 404)
      );
    }

    // Delete image from cloudinary if exists
    if (service.imagePublicId) {
      await cloudinary.uploader.destroy(service.imagePublicId);
    }

    // Delete service (associations will be deleted by cascade)
    await service.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
});

// @desc    Upload service image
// @route   PUT /api/v1/services/:id/photo
// @access  Private/Admin
exports.servicePhotoUpload = asyncHandler(async (req, res, next) => {
  const service = await Service.findByPk(req.params.id);

  if (!service) {
    return next(new ErrorResponse(`Service not found`, 404));
  }

  if (!req.files?.file) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  const file = req.files.file;

  // Validate file
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse(`Please upload an image file`, 400));
  }

  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(new ErrorResponse(`File too large`, 400));
  }

  try {
    // Delete old image if it exists
    if (service.imagePublicId) {
      await cloudinary.uploader.destroy(service.imagePublicId);
    }

    // Upload new image
    const uploadStream = () => {
      if (file.tempFilePath) {
        return cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'service-photos',
          public_id: `service_${service.id}_${Date.now()}`,
          overwrite: true,
          resource_type: 'image'
        });
      } else {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({
            folder: 'service-photos',
            public_id: `service_${service.id}_${Date.now()}`,
            overwrite: true,
            resource_type: 'image'
          }, (error, result) => {
            if (error) return reject(error);
            resolve(result);
          });

          const bufferStream = new Readable();
          bufferStream.push(file.data);
          bufferStream.push(null);
          bufferStream.pipe(stream);
        });
      }
    };

    const result = await uploadStream();

    // Update service
    await service.update({
      imageUrl: result.secure_url,
      imagePublicId: result.public_id
    });

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (err) {
    console.error('Cloudinary upload error:', {
      message: err.message,
      stack: err.stack
    });
    return next(new ErrorResponse(`Image upload failed: ${err.message}`, 500));
  }
});

// @desc    Get services by category
// @route   GET /api/v1/services/category/:category
// @access  Public
exports.getServicesByCategory = asyncHandler(async (req, res, next) => {
  const services = await Service.findAll({ 
    where: { 
      category: req.params.category,
      isActive: true 
    },
    include: [
      { model: ServicePackage, as: 'packages' },
      { model: ServiceFrequency, as: 'frequencies' },
      { model: ServiceDiscount, as: 'discounts' }
    ]
  });

  res.status(200).json({
    success: true,
    count: services.length,
    data: services
  });
});

// @desc    Get service packages
// @route   GET /api/v1/services/:id/packages
// @access  Public
exports.getServicePackages = asyncHandler(async (req, res, next) => {
  const service = await Service.findByPk(req.params.id, {
    include: [{ model: ServicePackage, as: 'packages' }]
  });

  if (!service) {
    return next(
      new ErrorResponse(`Service not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    count: service.packages.length,
    data: service.packages
  });
});
