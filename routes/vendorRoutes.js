const express = require('express');
const router = express.Router();
const { 
  getDashboard, 
  getProducts, 
  getOrders, 
  getProfile, 
  getEarnings 
} = require('../controllers/vendorController');
const { protect } = require('../middleware/authMiddleware');
const { vendorOnly } = require('../middleware/roleMiddleware');

// Lock all routes behind protect and vendorOnly
router.get('/dashboard', protect, vendorOnly, getDashboard);
router.get('/products', protect, vendorOnly, getProducts);
router.get('/orders', protect, vendorOnly, getOrders);
router.get('/profile', protect, vendorOnly, getProfile);
router.get('/earnings', protect, vendorOnly, getEarnings);

module.exports = router;
