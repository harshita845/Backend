const express = require('express');
const router = express.Router();
const { register, login, logout, refresh } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Route configurations purely mapping to controllers
router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh', refresh);

module.exports = router;
