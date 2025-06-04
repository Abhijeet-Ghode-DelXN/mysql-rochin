const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const { User } = require('../models');

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  console.log('Auth Headers:', req.headers.authorization || 'No authorization header');

  // Check if authorization header exists and has Bearer token
  if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
    console.log('Token from Authorization header:', token);
  } else if (req.cookies && req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
    console.log('Token from cookie:', token);
  }

  // Make sure token exists
  if (!token) {
    console.log('No token found');
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    console.log('Verifying token with secret:', process.env.JWT_SECRET ? 'Secret exists' : 'No secret found');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    // Find user and attach to request
    const user = await User.findByPk(decoded.id);
    console.log('Found user:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('No user found with id:', decoded.id);
      return next(new ErrorResponse('No user found with this id', 404));
    }

    // Attach both the user and the decoded token to the request
    req.user = user;
    req.tokenData = decoded; // Contains the raw token data including role
    console.log('User role:', user.role);
    console.log('Token role:', decoded.role);

    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Optional authentication - proceed even if no token
exports.optional = asyncHandler(async (req, res, next) => {
  let token;

  // Check if authorization header exists and has Bearer token
  if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
  }

  // If no token, continue without authentication
  if (!token) {
    console.log('No token found, continuing as unauthenticated');
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user and attach to request
    const user = await User.findByPk(decoded.id);
    
    if (user) {
      // Attach both the user and the decoded token to the request
      req.user = user;
      req.tokenData = decoded; // Contains the raw token data including role
    }

    next();
  } catch (err) {
    // Token is invalid but we still continue (optional auth)
    console.error('Invalid token, continuing as unauthenticated:', err.message);
    next();
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Check both user.role and tokenData.role for redundancy
    const userRole = req.user?.role || req.tokenData?.role;
    console.log('Checking role authorization:', { userRole, allowedRoles: roles });
    
    if (!userRole || !roles.includes(userRole)) {
      console.log('Role not authorized:', userRole);
      return next(
        new ErrorResponse(
          `User role ${userRole} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};
