const express = require('express');
const {
  generateRevenueReport,
  generateAppointmentReport,
  generateCustomerReport
} = require('../controllers/report.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');

// Admin-only routes
router.get('/revenue', protect, authorize('admin'), generateRevenueReport);
router.get('/appointments', protect, authorize('admin'), generateAppointmentReport);
router.get('/customers', protect, authorize('admin'), generateCustomerReport);

module.exports = router;
