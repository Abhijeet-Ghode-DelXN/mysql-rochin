const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { User, Customer, Appointment, Estimate, PropertyImage, Service } = require('../models/index');
const { Readable } = require('stream');
const crypto = require('crypto');
const cloudinary = require('../utils/cloudinary');
const { sequelize } = require('../config/db');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all customers
// @route   GET /api/v1/customers
// @access  Private/Admin
exports.getCustomers = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single customer
// @route   GET /api/v1/customers/:id
// @access  Private/Admin
exports.getCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findByPk(req.params.id, {
    include: [
      { model: User, as: 'user', attributes: ['name', 'email', 'phone'] },
      { model: Appointment, as: 'appointments' },
      { model: Estimate, as: 'estimates' },
      { model: PropertyImage, as: 'propertyImages' }
    ]
  });

  if (!customer) {
    return next(
      new ErrorResponse(`Customer not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: customer
  });
});

// @desc    Get current customer profile
// @route   GET /api/v1/customers/me
// @access  Private/Customer
exports.getMyProfile = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({
    where: { userId: req.user.id },
    include: [
      { model: User, as: 'user', attributes: ['name', 'email', 'phone'] },
      { model: Appointment, as: 'appointments' },
      { model: Estimate, as: 'estimates' },
      { model: PropertyImage, as: 'propertyImages' }
    ]
  });

  if (!customer) {
    return next(
      new ErrorResponse(`No customer profile found for this user`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: customer
  });
});

// @desc    Create customer (admin)
// @route   POST /api/v1/customers
// @access  Private/Admin
exports.createCustomerByAdmin = asyncHandler(async (req, res, next) => {
  const { name, email, phone, role, street, city, state, zipCode, country, propertySize } = req.body;
  const transaction = await sequelize.transaction();

  try {
    // Validate fields
    if (!name || !email || !phone) {
      await transaction.rollback();
      return next(new ErrorResponse('Please provide name, email, and phone', 400));
    }

    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await transaction.rollback();
      return next(new ErrorResponse('Invalid email format', 400));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: { email: email.toLowerCase().trim() }
    });
    
    if (existingUser) {
      await transaction.rollback();
      return next(new ErrorResponse('User already exists', 400));
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(4).toString('hex');
    
    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.replace(/\D/g, ''), // Remove non-digit characters
      password: tempPassword,
      role: role || 'customer',
      needsPasswordReset: true
    }, { transaction });

    // Create customer profile
    const customer = await Customer.create({
      userId: user.id,
      street: street || 'N/A',
      city: city || 'N/A',
      state: state || 'N/A',
      zipCode: zipCode || '00000',
      country: country || 'USA',
      propertySize: propertySize || 1000,
      hasFrontYard: req.body.hasFrontYard !== undefined ? req.body.hasFrontYard : true,
      hasBackYard: req.body.hasBackYard !== undefined ? req.body.hasBackYard : true,
      hasTrees: req.body.hasTrees !== undefined ? req.body.hasTrees : false,
      hasGarden: req.body.hasGarden !== undefined ? req.body.hasGarden : false,
      hasSprinklerSystem: req.body.hasSprinklerSystem !== undefined ? req.body.hasSprinklerSystem : false,
      accessInstructions: req.body.accessInstructions || '',
      preferredTimeOfDay: req.body.preferredTimeOfDay || 'Any',
      notifyByEmail: req.body.notifyByEmail !== undefined ? req.body.notifyByEmail : true,
      notifyBySms: req.body.notifyBySms !== undefined ? req.body.notifyBySms : false,
      reminderDaysBefore: req.body.reminderDaysBefore || 1,
      notes: req.body.notes || ''
    }, { transaction });

    // Generate password setup token
    const passwordSetupToken = crypto.randomBytes(20).toString('hex');
    
    // Hash token and set password setup fields
    const passwordSetupTokenHashed = crypto
      .createHash('sha256')
      .update(passwordSetupToken)
      .digest('hex');
    
    // Set password setup expiry to 24 hours
    const passwordSetupExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Update user with token data
    await user.update({
      passwordSetupToken: passwordSetupTokenHashed,
      passwordSetupExpire: passwordSetupExpire
    }, { transaction });

    await transaction.commit();

    // Try to send email (but don't fail the whole operation if email fails)
    try {
      const setupUrl = `${process.env.FRONTEND_URL}/auth/set-password/${passwordSetupToken}`;
      const message = `
        <h1>Complete Your Account Setup</h1>
        <p>You have been registered as a customer with our landscaping service.</p>
        <p>Please use the following link to set up your password:</p>
        <a href="${setupUrl}" target="_blank">Click here to set your password</a>
        <p>This link will expire in 24 hours.</p>
      `;
      
      await sendEmail({
        email: user.email,
        subject: 'Complete Your Account Setup',
        html: message
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      success: true,
      data: {
        message: 'Customer created successfully',
        userId: user.id,
        customerId: customer.id,
        tempPassword: tempPassword // For debugging, remove in production
      }
    });
  } catch (err) {
    console.error('Detailed error:', {
      message: err.message,
      stack: err.stack,
      errors: err.errors // Sequelize validation errors
    });

    await transaction.rollback();
    return next(new ErrorResponse(
      err.message || 'Failed to create customer', 
      err.statusCode || 500
    ));
  }
});

// @desc    Upload property images
// @route   POST /api/v1/customers/:id/images
// @access  Private/Admin or Private/Customer
exports.uploadPropertyImages = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      await transaction.rollback();
      return next(new ErrorResponse('Customer not found', 404));
    }

    // Check if the user is the customer or an admin
    if (req.user.role !== 'admin' && customer.userId !== req.user.id) {
      await transaction.rollback();
      return next(new ErrorResponse('Not authorized to upload images for this customer', 403));
    }

    if (!req.files?.files) {
      await transaction.rollback();
      return next(new ErrorResponse('Please upload files', 400));
    }

    // Handle single file upload (convert to array for consistency)
    const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];

    // Process each file
    const uploadPromises = files.map(async (file) => {
      // Validate file
      if (!file.mimetype.startsWith('image')) {
        throw new ErrorResponse('Please upload only image files', 400);
      }

      if (file.size > process.env.MAX_FILE_UPLOAD) {
        throw new ErrorResponse(`File ${file.name} is too large`, 400);
      }

      // Upload to Cloudinary
      const uploadStream = () => {
        if (file.tempFilePath) {
          return cloudinary.uploader.upload(file.tempFilePath, {
            folder: 'property-images',
            public_id: `property_${customer.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            resource_type: 'image'
          });
        } else {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
              folder: 'property-images',
              public_id: `property_${customer.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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

      // Create PropertyImage record
      return await PropertyImage.create({
        customerId: customer.id,
        url: result.secure_url,
        publicId: result.public_id,
        caption: file.name || '',
        uploadedAt: new Date()
      }, { transaction });
    });

    // Wait for all uploads to complete
    const uploadedImages = await Promise.all(uploadPromises);
    await transaction.commit();

    res.status(200).json({
      success: true,
      count: uploadedImages.length,
      data: uploadedImages
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Upload error:', err);
    return next(new ErrorResponse(err.message || 'Image upload failed', 500));
  }
});

// @desc    Delete property image
// @route   DELETE /api/v1/customers/:id/images/:imageId
// @access  Private/Admin or Private/Customer
exports.deletePropertyImage = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      await transaction.rollback();
      return next(new ErrorResponse('Customer not found', 404));
    }

    // Check if the user is the customer or an admin
    if (req.user.role !== 'admin' && customer.userId !== req.user.id) {
      await transaction.rollback();
      return next(new ErrorResponse('Not authorized to delete images for this customer', 403));
    }

    const image = await PropertyImage.findOne({
      where: {
        id: req.params.imageId,
        customerId: customer.id
      }
    });

    if (!image) {
      await transaction.rollback();
      return next(new ErrorResponse('Image not found', 404));
    }

    // Delete from Cloudinary
    if (image.publicId) {
      await cloudinary.uploader.destroy(image.publicId);
    }

    // Delete from database
    await image.destroy({ transaction });
    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Delete error:', err);
    return next(new ErrorResponse('Image deletion failed', 500));
  }
});

// @desc    Update customer profile
// @route   PUT /api/v1/customers/:id
// @access  Private/Admin
exports.updateCustomer = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { user, ...customerData } = req.body;
    
    // Find customer
    const customer = await Customer.findByPk(req.params.id);
    
    if (!customer) {
      await transaction.rollback();
      return next(new ErrorResponse(`Customer not found`, 404));
    }
    
    // Update user if provided
    if (user && user.id) {
      const updatedUser = await User.update({
        name: user.name,
        email: user.email,
        phone: user.phone
      }, { 
        where: { id: user.id },
        transaction
      });
      
      if (!updatedUser[0]) {
        await transaction.rollback();
        return next(new ErrorResponse(`User not found`, 404));
      }
    }
    
    // Update customer
    await customer.update(customerData, { transaction });
    
    await transaction.commit();
    
    // Get updated customer with associations
    const updatedCustomer = await Customer.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['name', 'email', 'phone'] }
      ]
    });
    
    res.status(200).json({
      success: true,
      data: updatedCustomer
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
});

// @desc    Update current customer profile
// @route   PUT /api/v1/customers/me
// @access  Private/Customer
exports.updateMyProfile = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Find the customer profile
    const customer = await Customer.findOne({ 
      where: { userId: req.user.id },
      include: [{ model: User, as: 'user' }]
    });

    if (!customer) {
      await transaction.rollback();
      return next(new ErrorResponse(`No customer profile found for this user`, 404));
    }

    // Update user data if provided
    if (req.body.user) {
      await User.update({
        name: req.body.user.name,
        email: req.body.user.email,
        phone: req.body.user.phone
      }, { 
        where: { id: req.user.id },
        transaction
      });
    }

    // Update customer data
    const fieldsToUpdate = { ...req.body };
    delete fieldsToUpdate.user; // Remove user data as it's handled separately

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(
      key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    await customer.update(fieldsToUpdate, { transaction });
    
    await transaction.commit();
    
    // Get updated customer with associations
    const updatedCustomer = await Customer.findOne({ 
      where: { userId: req.user.id },
      include: [
        { model: User, as: 'user', attributes: ['name', 'email', 'phone'] },
        { model: PropertyImage, as: 'propertyImages' }
      ]
    });

    res.status(200).json({
      success: true,
      data: updatedCustomer
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
});

// @desc    Delete customer
// @route   DELETE /api/v1/customers/:id
// @access  Private/Admin
exports.deleteCustomer = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ model: PropertyImage, as: 'propertyImages' }]
    });

    if (!customer) {
      await transaction.rollback();
      return next(new ErrorResponse(`Customer not found with id of ${req.params.id}`, 404));
    }

    // Delete property images from Cloudinary
    if (customer.propertyImages && customer.propertyImages.length > 0) {
      const deletePromises = customer.propertyImages.map(image => {
        if (image.publicId) {
          return cloudinary.uploader.destroy(image.publicId);
        }
        return Promise.resolve();
      });
      
      await Promise.all(deletePromises);
    }

    // Delete customer (associations will be deleted by cascade)
    await customer.destroy({ transaction });
    
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

// @desc    Get customer service history
// @route   GET /api/v1/customers/:id/history
// @access  Private/Admin
exports.getCustomerHistory = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findByPk(req.params.id, {
    include: [{
      model: Appointment,
      as: 'appointments',
      include: [{
        model: Service,
        as: 'service',
        attributes: ['name', 'category']
      }]
    }]
  });

  if (!customer) {
    return next(new ErrorResponse(`Customer not found with id of ${req.params.id}`, 404));
  }

  // Sort appointments by date descending
  const sortedAppointments = customer.appointments.sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  res.status(200).json({
    success: true,
    count: sortedAppointments.length,
    data: sortedAppointments
  });
});
