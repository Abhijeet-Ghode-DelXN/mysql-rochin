const express = require('express');
const {
  getDashboardStats,
  getAppointmentAnalytics,
  getRevenueAnalytics,
  getCustomerAnalytics
} = require('../controllers/dashboard.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');

// Admin-only routes
router.get('/', protect, authorize('admin'), getDashboardStats);
router.get('/appointments', protect, authorize('admin'), getAppointmentAnalytics);
router.get('/revenue', protect, authorize('admin'), getRevenueAnalytics);
router.get('/customers', protect, authorize('admin'), getCustomerAnalytics);

module.exports = router;
