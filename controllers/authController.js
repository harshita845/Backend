const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const ApiResponse = require('../utils/ApiResponse');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, phone, email, password, role } = req.body;

    // Check if user already exists by phone or email
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return ApiResponse.error(res, 400, 'User with this email or phone number already exists');
    }

    // Determine role (default to 'user', matching frontend: 'user', 'admin', 'vendor')
    const userRole = role && ['user', 'vendor', 'admin'].includes(role) ? role : 'user';

    const user = await User.create({
      name,
      phone,
      email,
      password,
      role: userRole,
    });

    if (user) {
      // Auto-generate tokens on register
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshToken = refreshToken;
      await user.save();

      // Set cookie for refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return ApiResponse.success(res, 201, 'User registered successfully', {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
        accessToken,
        refreshToken, // Return it in response too for flex-integration
      });
    } else {
      return ApiResponse.error(res, 400, 'Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Login user with mobile & password (or standard login)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // Validate email/phone and password
    if (!phone || !password) {
      return ApiResponse.error(res, 400, 'Please provide phone number and password');
    }

    // Find user (explicitly selecting password)
    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      return ApiResponse.error(res, 401, 'Invalid phone number or password');
    }

    if (!user.isActive) {
      return ApiResponse.error(res, 403, 'User account is deactivated');
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return ApiResponse.error(res, 401, 'Invalid phone number or password');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ApiResponse.success(res, 200, 'Login successful', {
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      accessToken,
      refreshToken, // Return for flex-integration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & blacklist access token
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    const user = req.user;
    const token = req.token;

    // Blacklist access token if present
    if (token) {
      await BlacklistedToken.create({ token });
    }

    // Clear refresh token on user document
    if (user) {
      user.refreshToken = '';
      await user.save();
    }

    // Clear client cookies
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.clearCookie('token');

    return ApiResponse.success(res, 200, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refresh = async (req, res, next) => {
  try {
    let token = req.body.refreshToken || (req.cookies && req.cookies.refreshToken);

    if (!token) {
      return ApiResponse.error(res, 401, 'Refresh token is missing');
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || 'e_mediclub_refresh_jwt_secret_key_extremely_secure_789'
      );
    } catch (err) {
      return ApiResponse.error(res, 401, 'Invalid or expired refresh token');
    }

    // Check user matching refresh token
    const user = await User.findById(decoded.id);
    if (!user) {
      return ApiResponse.error(res, 401, 'User associated with refresh token not found');
    }

    if (user.refreshToken !== token) {
      return ApiResponse.error(res, 401, 'Invalid token pairing');
    }

    if (!user.isActive) {
      return ApiResponse.error(res, 403, 'User account is deactivated');
    }

    // Sign new access token
    const newAccessToken = generateAccessToken(user);

    // Optionally rotate refresh token
    const newRefreshToken = generateRefreshToken(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    // Reset cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(res, 200, 'Token refreshed successfully', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  refresh,
};
