const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const ApiResponse = require('../utils/ApiResponse');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

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

    // Determine role (default to 'user', matching frontend: 'user', 'admin', 'vendor', 'pharmacy_vendor', 'lab_vendor', 'doctor_vendor')
    const userRole = role && ['user', 'vendor', 'admin', 'pharmacy_vendor', 'lab_vendor', 'doctor_vendor'].includes(role) ? role : 'user';

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
    const { phone, email, emailOrPhone, password } = req.body;

    const identifier = emailOrPhone || phone || email;

    // Validate email/phone and password
    if (!identifier || !password) {
      return ApiResponse.error(res, 400, 'Please provide email or phone number and password');
    }

    // Find user (explicitly selecting password) by phone or email
    const user = await User.findOne({
      $or: [
        { phone: identifier },
        { email: identifier.toLowerCase() }
      ]
    }).select('+password');

    if (!user) {
      return ApiResponse.error(res, 401, 'Invalid credentials');
    }

    if (!user.isActive) {
      return ApiResponse.error(res, 403, 'User account is deactivated');
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return ApiResponse.error(res, 401, 'Invalid credentials');
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

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return ApiResponse.error(res, 400, 'Please provide email or phone number');
    }

    const query = {};
    if (email) query.email = email;
    else if (phone) query.phone = phone;

    const user = await User.findOne(query);
    if (!user) {
      return ApiResponse.error(res, 404, 'User not found');
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP + expiry (10 min) in user document
    user.resetOTP = otp;
    user.resetOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send OTP via email using existing sendEmail utility
    const emailOptions = {
      email: user.email,
      subject: 'Password Reset OTP',
      message: `Your password reset OTP is ${otp}. It will expire in 10 minutes.`,
      html: `<p>Your password reset OTP is <strong>${otp}</strong>. It will expire in 10 minutes.</p>`,
    };
    await sendEmail(emailOptions);

    return ApiResponse.success(res, 200, 'OTP sent to your email');
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, phone, otp, newPassword } = req.body;

    if ((!email && !phone) || !otp || !newPassword) {
      return ApiResponse.error(res, 400, 'Please provide email/phone, OTP, and new password');
    }

    const query = {};
    if (email) query.email = email;
    else if (phone) query.phone = phone;

    const user = await User.findOne(query);
    if (!user) {
      return ApiResponse.error(res, 404, 'User not found');
    }

    // Verify OTP matches and is not expired
    if (!user.resetOTP || user.resetOTP !== otp) {
      return ApiResponse.error(res, 400, 'Invalid OTP');
    }

    if (!user.resetOTPExpiry || new Date(user.resetOTPExpiry) < new Date()) {
      return ApiResponse.error(res, 400, 'OTP has expired');
    }

    // Hash new password and save (pre-save hook handles hashing)
    user.password = newPassword;

    // Clear OTP fields from user document
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;

    await user.save();

    return ApiResponse.success(res, 200, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};

// @desc    Change Password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return ApiResponse.error(res, 400, 'Please provide current and new passwords');
    }

    // Find user and select password (protect middleware excludes password)
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return ApiResponse.error(res, 404, 'User not found');
    }

    // Verify current password matches
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return ApiResponse.error(res, 401, 'Incorrect current password');
    }

    // Hash and save new password
    user.password = newPassword;
    await user.save();

    return ApiResponse.success(res, 200, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current User Details
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = req.user.toObject();
    delete user.password;
    delete user.refreshToken;

    return ApiResponse.success(res, 200, 'Current user retrieved successfully', { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update User Profile
// @route   PUT /api/auth/update-profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return ApiResponse.error(res, 404, 'User not found');
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return ApiResponse.error(res, 400, 'Email is already in use');
      }
      user.email = email;
    }

    if (phone && phone !== user.phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return ApiResponse.error(res, 400, 'Phone number is already in use');
      }
      user.phone = phone;
    }

    if (name) {
      user.name = name;
    }

    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;
    delete updatedUser.refreshToken;

    return ApiResponse.success(res, 200, 'Profile updated successfully', { user: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc    Send Phone Login OTP
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return ApiResponse.error(res, 400, 'Please provide a phone number');
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return ApiResponse.error(res, 404, 'User not found');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in user document with 10 min expiry
    user.phoneOTP = otp;
    user.phoneOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send via SMS (use console.log)
    console.log(`[SMS] Sending OTP ${otp} to phone number ${phone}`);

    return ApiResponse.success(res, 200, 'OTP sent');
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Phone OTP and Login
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return ApiResponse.error(res, 400, 'Please provide phone number and OTP');
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return ApiResponse.error(res, 404, 'User not found');
    }

    if (!user.isActive) {
      return ApiResponse.error(res, 403, 'User account is deactivated');
    }

    // Verify OTP and expiry
    if (!user.phoneOTP || user.phoneOTP !== otp) {
      return ApiResponse.error(res, 400, 'Invalid OTP');
    }

    if (!user.phoneOTPExpiry || new Date(user.phoneOTPExpiry) < new Date()) {
      return ApiResponse.error(res, 400, 'OTP has expired');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to user and clear OTP fields
    user.refreshToken = refreshToken;
    user.phoneOTP = undefined;
    user.phoneOTPExpiry = undefined;
    await user.save();

    // Set cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(res, 200, 'Verification successful', {
      accessToken,
      refreshToken,
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
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  updateProfile,
  sendOTP,
  verifyOTP,
};
