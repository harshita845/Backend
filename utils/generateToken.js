const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, phone: user.phone, role: user.role },
    process.env.JWT_SECRET || 'e_mediclub_access_jwt_secret_key_extremely_secure_321',
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'e_mediclub_refresh_jwt_secret_key_extremely_secure_789',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
