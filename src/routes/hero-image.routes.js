const express = require('express');
const {
  getHeroImage,
  updateHeroImage,
  deleteHeroImage
} = require('../controllers/hero-image.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', getHeroImage);

// Admin-only routes
router.put('/', protect, authorize('admin'), updateHeroImage);
router.delete('/', protect, authorize('admin'), deleteHeroImage);

module.exports = router;
