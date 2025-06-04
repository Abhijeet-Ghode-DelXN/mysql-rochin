const express = require('express');
const {
  getPayments,
  getPayment,
  processPayment,
  createManualPayment,
  getReceipt,
  processRefund
} = require('../controllers/payment.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');

// Admin-only routes
router.get('/', protect, authorize('admin'), getPayments);
router.post('/process', protect, processPayment);
router.post('/manual', protect, authorize('admin'), createManualPayment);

// Customer and admin routes
router.get('/:id', protect, getPayment);
router.get('/:id/receipt', protect, getReceipt);
router.post('/:id/refund', protect, authorize('admin'), processRefund);

module.exports = router;
