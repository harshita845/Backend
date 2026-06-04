const ApiResponse = require('../utils/ApiResponse');

// Authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 401, 'User is not authenticated');
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        403,
        `User role '${req.user.role}' is not authorized to access this resource`
      );
    }

    next();
  };
};

module.exports = {
  authorize,
  adminOnly: authorize('admin'),
  vendorOnly: authorize('vendor'),
  userOnly: authorize('user'),
  pharmacyVendorOnly: authorize('pharmacy_vendor', 'vendor'),
  labVendorOnly: authorize('lab_vendor'),
  doctorVendorOnly: authorize('doctor_vendor'),
  vendorAny: authorize('vendor', 'pharmacy_vendor', 'lab_vendor', 'doctor_vendor'),
};
