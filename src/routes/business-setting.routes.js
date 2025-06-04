const express = require('express');
const {
  getBusinessSettings,
  updateBusinessSettings,
  uploadLogo,
  updateBusinessHours,
  updateNotificationSettings,
  updateBusinessTerms
} = require('../controllers/business-setting.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');

// Admin-only routes
router.get('/', protect, authorize('admin'), getBusinessSettings);
router.put('/', protect, authorize('admin'), updateBusinessSettings);
router.put('/logo', protect, authorize('admin'), uploadLogo);
router.put('/hours', protect, authorize('admin'), updateBusinessHours);
router.put('/notifications', protect, authorize('admin'), updateNotificationSettings);
router.put('/terms', protect, authorize('admin'), updateBusinessTerms);

module.exports = router;
