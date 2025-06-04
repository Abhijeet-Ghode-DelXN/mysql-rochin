const ErrorResponse = require('../utils/errorResponse');
const { ValidationError, DatabaseError, UniqueConstraintError } = require('sequelize');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.log(err.stack);

  // Sequelize validation error
  if (err instanceof ValidationError) {
    const message = err.errors.map(e => e.message).join(', ');
    error = new ErrorResponse(message, 400);
  }

  // Sequelize unique constraint error
  if (err instanceof UniqueConstraintError) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // Sequelize database error
  if (err instanceof DatabaseError) {
    const message = 'Database error occurred';
    error = new ErrorResponse(message, 500);
  }

  // Foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Cannot delete or update a parent row: a foreign key constraint fails';
    error = new ErrorResponse(message, 400);
  }

  // Connection error
  if (err.name === 'SequelizeConnectionError') {
    const message = 'Database connection error';
    error = new ErrorResponse(message, 500);
  }

  // Resource not found
  if (err.name === 'ResourceNotFoundError') {
    const message = 'Resource not found';
    error = new ErrorResponse(message, 404);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

module.exports = errorHandler;
