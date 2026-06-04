const express = require('express');
const router = express.Router();
const { 
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
  verifyOTP 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Route configurations purely mapping to controllers
router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh', refresh);

// Enhanced Auth routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

module.exports = router;
