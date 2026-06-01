const ApiResponse = require('../utils/ApiResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for development
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    return ApiResponse.error(res, 404, message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    return ApiResponse.error(res, 400, message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message).join(', ');
    return ApiResponse.error(res, 400, message);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 401, 'Invalid token, authorization denied');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 401, 'Token expired, authorization denied');
  }

  // Standard Express Error
  return ApiResponse.error(res, error.statusCode || 500, error.message || 'Server Error');
};

module.exports = errorHandler;
