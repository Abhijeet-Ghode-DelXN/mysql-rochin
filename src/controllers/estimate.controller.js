const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { 
  Estimate, 
  Customer, 
  User, 
  Service, 
  EstimateService, 
  EstimatePhoto,
  EstimatePackage,
  EstimateLineItem
} = require('../models/index');
const cloudinary = require('../utils/cloudinary');
const sendEmail = require('../utils/sendEmail');
const { Op } = require('sequelize');

// @desc    Get all estimates
// @route   GET /api/v1/estimates
// @access  Private/Admin
exports.getEstimates = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single estimate
// @route   GET /api/v1/estimates/:id
// @access  Private
exports.getEstimate = asyncHandler(async (req, res, next) => {
  const estimate = await Estimate.findByPk(req.params.id, {
    include: [
      {
        model: Customer,
        as: 'customer',
        attributes: ['id', 'street', 'city', 'state', 'zipCode', 'propertySize'],
        include: {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      },
      {
        model: EstimateService,
        as: 'services',
        include: {
          model: Service,
          attributes: ['id', 'name', 'category', 'description', 'basePrice']
        }
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'createdBy',
        attributes: ['id', 'name']
      },
      {
        model: EstimatePhoto,
        as: 'photos'
      },
      {
        model: EstimatePackage,
        as: 'packages',
        include: {
          model: EstimateLineItem,
          as: 'lineItems'
        }
      }
    ]
  });

  if (!estimate) {
    return next(
      new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is authorized to view
  if (req.user.role !== 'admin' && 
      req.user.role !== 'professional' &&
      estimate.customer.user.id !== req.user.id) {
    return next(
      new ErrorResponse(`Not authorized to access this estimate`, 403)
    );
  }

  res.status(200).json({
    success: true,
    data: estimate
  });
});

// @desc    Create new estimate
// @route   POST /api/v1/estimates
// @access  Private/Admin
exports.createEstimate = asyncHandler(async (req, res, next) => {
  // Add user as creator
  req.body.createdById = req.user.id;

  // Check customer exists
  const customer = await Customer.findByPk(req.body.customerId);
  if (!customer) {
    return next(
      new ErrorResponse(`Customer not found with id of ${req.body.customerId}`, 404)
    );
  }

  // Set default expiry date (30 days from now)
  if (!req.body.expiryDate) {
    req.body.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  // Create the estimate
  const estimate = await Estimate.create({
    customerId: req.body.customerId,
    propertyStreet: req.body.property?.address?.street || customer.street,
    propertyCity: req.body.property?.address?.city || customer.city,
    propertyState: req.body.property?.address?.state || customer.state,
    propertyZipCode: req.body.property?.address?.zipCode || customer.zipCode,
    propertySize: req.body.property?.size || customer.propertySize,
    propertyDetails: req.body.property?.details,
    customerNotes: req.body.customerNotes,
    budgetMin: req.body.budget?.min,
    budgetMax: req.body.budget?.max,
    accessInfo: req.body.accessInfo,
    status: req.body.status || 'Requested',
    expiryDate: req.body.expiryDate,
    assignedToId: req.body.assignedToId,
    createdById: req.body.createdById
  });

  // Add services if provided
  if (req.body.services && req.body.services.length > 0) {
    const servicePromises = req.body.services.map(serviceItem => {
      return EstimateService.create({
        estimateId: estimate.id,
        serviceId: serviceItem.service,
        quantity: serviceItem.quantity || 1
      });
    });
    await Promise.all(servicePromises);
  }

  // Add packages if provided
  if (req.body.packages && req.body.packages.length > 0) {
    for (const packageItem of req.body.packages) {
      const newPackage = await EstimatePackage.create({
        estimateId: estimate.id,
        name: packageItem.name,
        description: packageItem.description,
        subTotal: packageItem.subTotal,
        tax: packageItem.tax,
        discountAmount: packageItem.discount?.amount,
        discountDescription: packageItem.discount?.description,
        total: packageItem.total,
        notes: packageItem.notes
      });

      // Add line items if provided
      if (packageItem.lineItems && packageItem.lineItems.length > 0) {
        const lineItemPromises = packageItem.lineItems.map(lineItem => {
          return EstimateLineItem.create({
            estimatePackageId: newPackage.id,
            service: lineItem.service,
            description: lineItem.description,
            unitPrice: lineItem.unitPrice,
            quantity: lineItem.quantity,
            totalPrice: lineItem.totalPrice
          });
        });
        await Promise.all(lineItemPromises);
      }
    }
  }

  // Fetch the complete estimate with all associations
  const completeEstimate = await Estimate.findByPk(estimate.id, {
    include: [
      {
        model: Customer,
        as: 'customer',
        include: {
          model: User,
          as: 'user'
        }
      },
      {
        model: EstimateService,
        as: 'services',
        include: {
          model: Service
        }
      },
      {
        model: User,
        as: 'assignedTo'
      },
      {
        model: User,
        as: 'createdBy'
      },
      {
        model: EstimatePackage,
        as: 'packages',
        include: {
          model: EstimateLineItem,
          as: 'lineItems'
        }
      }
    ]
  });

  res.status(201).json({
    success: true,
    data: completeEstimate
  });
});

// @desc    Update estimate
// @route   PUT /api/v1/estimates/:id
// @access  Private/Admin
exports.updateEstimate = asyncHandler(async (req, res, next) => {
  let estimate = await Estimate.findByPk(req.params.id, {
    include: [
      {
        model: EstimateService,
        as: 'services',
        include: {
          model: Service
        }
      }
    ]
  });

  if (!estimate) {
    return next(new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404));
  }

  // Make sure user is admin
  if (req.user.role !== 'admin') {
    return next(new ErrorResponse(`Not authorized to update this estimate`, 403));
  }

  // Start a transaction
  const t = await sequelize.transaction();

  try {
    // Update service names if they changed
    if (req.body.services && req.body.services.length > 0) {
      for (const serviceItem of req.body.services) {
        if (serviceItem.service && serviceItem.service.name) {
          await Service.update(
            { name: serviceItem.service.name },
            { 
              where: { id: serviceItem.service.id },
              transaction: t
            }
          );
        }
      }
    }

    // Update the estimate basic fields
    await estimate.update({
      propertyStreet: req.body.property?.address?.street || estimate.propertyStreet,
      propertyCity: req.body.property?.address?.city || estimate.propertyCity,
      propertyState: req.body.property?.address?.state || estimate.propertyState,
      propertyZipCode: req.body.property?.address?.zipCode || estimate.propertyZipCode,
      propertySize: req.body.property?.size || estimate.propertySize,
      propertyDetails: req.body.property?.details || estimate.propertyDetails,
      customerNotes: req.body.customerNotes || estimate.customerNotes,
      budgetMin: req.body.budget?.min || estimate.budgetMin,
      budgetMax: req.body.budget?.max || estimate.budgetMax,
      accessInfo: req.body.accessInfo || estimate.accessInfo,
      status: req.body.status || estimate.status,
      expiryDate: req.body.expiryDate || estimate.expiryDate,
      assignedToId: req.body.assignedToId || estimate.assignedToId,
      approvedPackage: req.body.approvedPackage || estimate.approvedPackage,
      depositRequired: req.body.deposit?.required !== undefined ? req.body.deposit.required : estimate.depositRequired,
      depositAmount: req.body.deposit?.amount || estimate.depositAmount,
      depositPaymentId: req.body.deposit?.paymentId || estimate.depositPaymentId,
      depositPaidOn: req.body.deposit?.paidOn || estimate.depositPaidOn
    }, { transaction: t });

    // Handle services update if provided
    if (req.body.services && req.body.services.length > 0) {
      // Delete existing services
      await EstimateService.destroy({
        where: { estimateId: estimate.id },
        transaction: t
      });

      // Create new services
      const servicePromises = req.body.services.map(serviceItem => {
        return EstimateService.create({
          estimateId: estimate.id,
          serviceId: serviceItem.service.id || serviceItem.service,
          quantity: serviceItem.quantity || 1
        }, { transaction: t });
      });
      await Promise.all(servicePromises);
    }

    // Handle packages update if provided
    if (req.body.packages && req.body.packages.length > 0) {
      // Get existing packages
      const existingPackages = await EstimatePackage.findAll({
        where: { estimateId: estimate.id },
        include: {
          model: EstimateLineItem,
          as: 'lineItems'
        },
        transaction: t
      });

      // Delete existing packages and their line items
      for (const pkg of existingPackages) {
        await EstimateLineItem.destroy({
          where: { estimatePackageId: pkg.id },
          transaction: t
        });
      }
      await EstimatePackage.destroy({
        where: { estimateId: estimate.id },
        transaction: t
      });

      // Create new packages and line items
      for (const packageItem of req.body.packages) {
        const newPackage = await EstimatePackage.create({
          estimateId: estimate.id,
          name: packageItem.name,
          description: packageItem.description,
          subTotal: packageItem.subTotal,
          tax: packageItem.tax,
          discountAmount: packageItem.discount?.amount,
          discountDescription: packageItem.discount?.description,
          total: packageItem.total,
          notes: packageItem.notes
        }, { transaction: t });

        // Add line items if provided
        if (packageItem.lineItems && packageItem.lineItems.length > 0) {
          const lineItemPromises = packageItem.lineItems.map(lineItem => {
            return EstimateLineItem.create({
              estimatePackageId: newPackage.id,
              service: lineItem.service,
              description: lineItem.description,
              unitPrice: lineItem.unitPrice,
              quantity: lineItem.quantity,
              totalPrice: lineItem.totalPrice
            }, { transaction: t });
          });
          await Promise.all(lineItemPromises);
        }
      }
    }

    await t.commit();

    // Fetch the updated estimate with all associations
    const updatedEstimate = await Estimate.findByPk(estimate.id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          include: {
            model: User,
            as: 'user'
          }
        },
        {
          model: EstimateService,
          as: 'services',
          include: {
            model: Service
          }
        },
        {
          model: User,
          as: 'assignedTo'
        },
        {
          model: User,
          as: 'createdBy'
        },
        {
          model: EstimatePackage,
          as: 'packages',
          include: {
            model: EstimateLineItem,
            as: 'lineItems'
          }
        },
        {
          model: EstimatePhoto,
          as: 'photos'
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: updatedEstimate
    });
  } catch (error) {
    await t.rollback();
    return next(new ErrorResponse(`Error updating estimate: ${error.message}`, 500));
  }
});

// @desc    Delete estimate
// @route   DELETE /api/v1/estimates/:id
// @access  Private/Admin
exports.deleteEstimate = asyncHandler(async (req, res, next) => {
  const estimate = await Estimate.findByPk(req.params.id);

  if (!estimate) {
    return next(
      new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`Not authorized to delete this estimate`, 403)
    );
  }

  // Start a transaction
  const t = await sequelize.transaction();

  try {
    // Delete related records
    await EstimateLineItem.destroy({
      where: {
        estimatePackageId: {
          [Op.in]: sequelize.literal(`(SELECT id FROM estimate_packages WHERE estimateId = ${estimate.id})`)
        }
      },
      transaction: t
    });

    await EstimatePackage.destroy({
      where: { estimateId: estimate.id },
      transaction: t
    });

    await EstimateService.destroy({
      where: { estimateId: estimate.id },
      transaction: t
    });

    await EstimatePhoto.destroy({
      where: { estimateId: estimate.id },
      transaction: t
    });

    // Delete the estimate
    await estimate.destroy({ transaction: t });

    await t.commit();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    await t.rollback();
    return next(new ErrorResponse(`Error deleting estimate: ${error.message}`, 500));
  }
});

// @desc    Upload photos for estimate
// @route   POST /api/v1/estimates/:id/photos
// @access  Private
exports.uploadEstimatePhotos = asyncHandler(async (req, res, next) => {
  const estimate = await Estimate.findByPk(req.params.id);

  if (!estimate) {
    return next(
      new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404)
    );
  }

  if (!req.files || !req.files.photos) {
    return next(new ErrorResponse(`Please upload at least one photo`, 400));
  }

  const photos = Array.isArray(req.files.photos) 
    ? req.files.photos 
    : [req.files.photos];

  const uploadPromises = photos.map(async photo => {
    // Make sure the file is a photo
    if (!photo.mimetype.startsWith('image')) {
      throw new ErrorResponse(`Please upload only image files`, 400);
    }

    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(photo.tempFilePath, {
      folder: `landscaping/estimates/${estimate.id}`
    });

    return {
      estimateId: estimate.id,
      url: result.secure_url,
      publicId: result.public_id,
      caption: req.body.caption || '',
      category: req.body.category || 'Other',
      uploadedAt: new Date()
    };
  });

  try {
    const uploadedPhotosData = await Promise.all(uploadPromises);

    // Add photos to database
    const uploadedPhotos = await EstimatePhoto.bulkCreate(uploadedPhotosData);

    res.status(200).json({
      success: true,
      count: uploadedPhotos.length,
      data: uploadedPhotos
    });
  } catch (err) {
    return next(new ErrorResponse(`Problem with photo upload: ${err.message}`, 500));
  }
});

// @desc    Request estimate (Customer)
// @route   POST /api/v1/estimates/request
// @access  Private/Customer
exports.requestEstimate = asyncHandler(async (req, res, next) => {
  // Get customer profile
  const customer = await Customer.findOne({ 
    where: { userId: req.user.id }
  });

  if (!customer) {
    return next(new ErrorResponse(`No customer profile found`, 404));
  }

  // Create estimate request
  const estimateData = {
    customerId: customer.id,
    propertyStreet: req.body.property?.address?.street || customer.street,
    propertyCity: req.body.property?.address?.city || customer.city,
    propertyState: req.body.property?.address?.state || customer.state,
    propertyZipCode: req.body.property?.address?.zipCode || customer.zipCode,
    propertySize: req.body.property?.size || customer.propertySize,
    propertyDetails: req.body.property?.details,
    customerNotes: req.body.notes,
    budgetMin: req.body.budget?.min,
    budgetMax: req.body.budget?.max,
    accessInfo: req.body.accessInfo,
    status: 'Requested',
    createdById: req.user.id
  };

  // Create the estimate
  let estimate = await Estimate.create(estimateData);

  // Add services if provided
  if (req.body.services && req.body.services.length > 0) {
    const servicePromises = req.body.services.map(serviceItem => {
      return EstimateService.create({
        estimateId: estimate.id,
        serviceId: serviceItem.service,
        quantity: serviceItem.quantity || 1
      });
    });
    await Promise.all(servicePromises);
  }

  // Fetch the complete estimate with all associations
  estimate = await Estimate.findByPk(estimate.id, {
    include: [
      {
        model: Customer,
        as: 'customer',
        include: {
          model: User,
          as: 'user'
        }
      },
      {
        model: EstimateService,
        as: 'services',
        include: {
          model: Service
        }
      },
      {
        model: User,
        as: 'createdBy'
      }
    ]
  });

  // Notify admin about new estimate request
  const admins = await User.findAll({ 
    where: { role: 'admin' }
  });
  
  if (admins.length > 0) {
    try {
      await sendEmail({
        email: admins[0].email,
        subject: 'New Estimate Request',
        message: `A new estimate request has been submitted by ${req.user.name}. Estimate ID: ${estimate.estimateNumber}`
      });
    } catch (err) {
      console.log('Email notification failed:', err);
    }
  }

  res.status(201).json({
    success: true,
    data: estimate
  });
});

// @desc    Get my estimates (Customer)
// @route   GET /api/v1/estimates/my-estimates
// @access  Private/Customer
exports.getMyEstimates = asyncHandler(async (req, res, next) => {
  // Get customer profile
  const customer = await Customer.findOne({ 
    where: { userId: req.user.id }
  });

  if (!customer) {
    return next(new ErrorResponse(`No customer profile found`, 404));
  }

  const estimates = await Estimate.findAll({ 
    where: { customerId: customer.id },
    include: [
      {
        model: EstimateService,
        as: 'services',
        include: {
          model: Service,
          attributes: ['id', 'name', 'description']
        }
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({
    success: true,
    count: estimates.length,
    data: estimates
  });
});

// @desc    Approve estimate package
// @route   PUT /api/v1/estimates/:id/approve
// @access  Private/Customer
exports.approveEstimate = asyncHandler(async (req, res, next) => {
  const { packageName } = req.body;

  if (!packageName) {
    return next(new ErrorResponse(`Please provide the package name to approve`, 400));
  }

  let estimate = await Estimate.findByPk(req.params.id, {
    include: [
      {
        model: Customer,
        as: 'customer'
      },
      {
        model: EstimatePackage,
        as: 'packages'
      }
    ]
  });

  if (!estimate) {
    return next(
      new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404)
    );
  }

  // Get customer
  const customer = await Customer.findOne({ 
    where: { userId: req.user.id }
  });

  if (!customer) {
    return next(new ErrorResponse(`No customer profile found`, 404));
  }

  // Verify customer owns this estimate
  if (estimate.customerId !== customer.id) {
    return next(new ErrorResponse(`Not authorized to approve this estimate`, 403));
  }

  // Verify the package exists
  const packageExists = estimate.packages.some(pkg => pkg.name === packageName);
  
  if (!packageExists) {
    return next(new ErrorResponse(`Package "${packageName}" not found in this estimate`, 404));
  }

  // Update estimate status
  await estimate.update({
    status: 'Approved',
    approvedPackage: packageName
  });

  // Notify admin about estimate approval
  const admins = await User.findAll({ 
    where: { role: 'admin' }
  });
  
  if (admins.length > 0) {
    try {
      await sendEmail({
        email: admins[0].email,
        subject: 'Estimate Approved',
        message: `Estimate ${estimate.estimateNumber} has been approved by ${req.user.name}. Approved package: ${packageName}`
      });
    } catch (err) {
      console.log('Email notification failed:', err);
    }
  }

  // Fetch updated estimate with all associations
  estimate = await Estimate.findByPk(req.params.id, {
    include: [
      {
        model: Customer,
        as: 'customer',
        include: {
          model: User,
          as: 'user'
        }
      },
      {
        model: EstimateService,
        as: 'services',
        include: {
          model: Service
        }
      },
      {
        model: EstimatePackage,
        as: 'packages',
        include: {
          model: EstimateLineItem,
          as: 'lineItems'
        }
      },
      {
        model: EstimatePhoto,
        as: 'photos'
      }
    ]
  });

  res.status(200).json({
    success: true,
    data: estimate
  });
});
