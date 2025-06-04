const crypto = require('crypto');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { User } = require('../models');
const { Customer } = require('../models');
const sendEmail = require('../utils/sendEmail');
const { Op } = require('sequelize');

// @desc    Register user (initial step)
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, phone } = req.body;

  // Validate fields
  if (!name || !email || !phone) {
    return next(new ErrorResponse('Please provide all required fields', 400));
  }

  // Email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return next(new ErrorResponse('Invalid email format', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return next(new ErrorResponse('User already exists', 400));
  }

  // Create user with temporary password and needsPasswordReset flag
  const tempPassword = crypto.randomBytes(4).toString('hex');
  const user = await User.create({
    name,
    email,
    phone,
    password: tempPassword,
    role: 'customer',
    needsPasswordReset: true
  });

  // Create password setup token (expires in 24 hours)
  const passwordSetupToken = user.getPasswordSetupToken();
  await user.save();

  // Create password setup URL
  const setupUrl = `${process.env.FRONTEND_URL}/auth/set-password/${passwordSetupToken}`;

  // Email content
  const message = `
    <h2>Welcome to Your Landscaping Company!</h2>
    <p>Thank you for registering. Please set your password to complete your account setup:</p>
    <p><a href="${setupUrl}" style="background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Set Your Password</a></p>
    <p>This link will expire in 24 hours.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Complete Your Registration',
      html: message
    });

    // Create customer profile
    const customerData = {
      userId: user.id,
      street: 'N/A',
      city: 'N/A',
      state: 'N/A',
      zipCode: '00000',
      propertySize: 1000,
      hasFrontYard: true,
      hasBackYard: true,
      hasTrees: false,
      hasGarden: false,
      hasSprinklerSystem: false,
      preferredTimeOfDay: 'Any',
      notifyByEmail: true
    };

    await Customer.create(customerData);

    // Send welcome email (in background)
    setTimeout(async () => {
      const welcomeMessage = `
        <h2>Welcome to Your Landscaping Company!</h2>
        <p>We're thrilled to have you as a customer. Here's what you can expect:</p>
        <ul>
          <li>10% discount on your first service (applied automatically)</li>
          <li>Easy online booking</li>
          <li>Quality service guaranteed</li>
        </ul>
        <p>Ready to get started? <a href="${process.env.FRONTEND_URL}/book">Book your first service now!</a></p>
      `;

      await sendEmail({
        email: user.email,
        subject: 'Welcome to Your Landscaping Company!',
        html: welcomeMessage
      });
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        message: 'Registration successful. Please check your email to set your password.',
        userId: user.id 
      }
    });
  } catch (err) {
    // Clean up if email fails
    await user.destroy();
    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Set password after initial registration
// @route   POST /api/v1/auth/set-password
// @access  Public
exports.setPassword = asyncHandler(async (req, res, next) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return next(new ErrorResponse('Token and password are required', 400));
  }

  // Hash token EXACTLY like in getPasswordSetupToken
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    where: {
      passwordSetupToken: hashedToken,
      passwordSetupExpire: { [Op.gt]: Date.now() }
    }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired token', 400));
  }

  // Set new password
  user.password = password;
  user.needsPasswordReset = false;
  user.passwordSetupToken = null;
  user.passwordSetupExpire = null;
  await user.save();

  // Send confirmation email
  const message = `
    <h2>Password Updated Successfully</h2>
    <p>Your password has been successfully updated for your account at Your Landscaping Company.</p>
    <p>If you didn't make this change, please contact our support team immediately.</p>
  `;

  await sendEmail({
    email: user.email,
    subject: 'Password Updated',
    html: message
  });

  res.status(200).json({
    success: true,
    data: {
      message: 'Password set successfully. You can now log in.'
    }
  });
});

// @desc    Handle password setup link from email
// @route   GET /auth/set-password/:token
// @access  Public
exports.handlePasswordLink = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  // Hash token (same as in setPassword)
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user
  const user = await User.findOne({
    where: {
      passwordSetupToken: hashedToken,
      passwordSetupExpire: { [Op.gt]: Date.now() }
    }
  });

  if (!user) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid or expired token' 
    });
  }

  // If valid, redirect to frontend
  res.redirect(`${process.env.FRONTEND_URL}/set-password/${token}`);
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Check for user
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save();

  // Get customer details if the user is a customer
  let customer = null;
  if (user.role === 'customer') {
    customer = await Customer.findOne({ where: { userId: user.id } });
  }

  // Create user data response
  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    createdAt: user.createdAt,
    customerId: customer?.id || null
  };

  // Send the token response with user data
  sendTokenResponse(user, 200, res, userData);
});

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone
  };

  const user = await User.findByPk(req.user.id);
  await user.update(fieldsToUpdate);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ 
    where: { 
      email: req.body.email 
    } 
  });

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save();

  // Create reset URL pointing to frontend
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

  try {
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message
      });
    } catch (emailError) {
      console.error('Email error, but continuing password reset process:', emailError);
      // In development, we'll continue without sending email
      if (process.env.NODE_ENV === 'production') {
        throw emailError; // Only throw in production
      }
    }

    res.status(200).json({ 
      success: true, 
      data: 'Email sent',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (err) {
    console.log(err);
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await user.save();

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    where: {
      resetPasswordToken,
      resetPasswordExpire: { [Op.gt]: Date.now() }
    }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid token', 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = null;
  user.resetPasswordExpire = null;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:verificationtoken
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const emailVerificationToken = crypto
    .createHash('sha256')
    .update(req.params.verificationtoken)
    .digest('hex');

  const user = await User.findOne({
    where: {
      emailVerificationToken,
      emailVerificationExpire: { [Op.gt]: Date.now() }
    }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid token', 400));
  }

  // Set email as verified
  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpire = null;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res, userData = null) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: userData
    });
};
