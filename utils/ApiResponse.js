class ApiResponse {
  constructor(statusCode, success, message, data = null) {
    this.statusCode = statusCode;
    this.success = success;
    this.message = message;
    this.data = data;
  }

  static success(res, statusCode = 200, message = 'Success', data = null) {
    return res.status(statusCode).json(new ApiResponse(statusCode, true, message, data));
  }

  static error(res, statusCode = 500, message = 'Error occurred', data = null) {
    return res.status(statusCode).json(new ApiResponse(statusCode, false, message, data));
  }
}

module.exports = ApiResponse;
