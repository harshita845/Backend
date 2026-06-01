const express = require('express');
const router = express.Router();
const { 
  getDashboard, 
  getUsers, 
  getVendors, 
  getOrders, 
  getDoctors, 
  getLabTests 
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');

// Lock all routes behind protect and adminOnly
router.get('/dashboard', protect, adminOnly, getDashboard);
router.get('/users', protect, adminOnly, getUsers);
router.get('/vendors', protect, adminOnly, getVendors);
router.get('/orders', protect, adminOnly, getOrders);
router.get('/doctors', protect, adminOnly, getDoctors);
router.get('/lab-tests', protect, adminOnly, getLabTests);

module.exports = router;
