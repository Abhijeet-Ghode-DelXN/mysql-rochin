const express = require('express');
const {
  getGalleries,
  getGallery,
  createGallery,
  updateGallery,
  deleteGallery,
  deleteImage
} = require('../controllers/gallery.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');
const models = require('../models');

// Public routes
router.get('/', advancedResults(models.Gallery), getGalleries);
router.get('/:id', getGallery);

// Admin routes
router.post('/', protect, authorize('admin'), createGallery);
router.put('/:id', protect, authorize('admin'), updateGallery);
router.delete('/:id', protect, authorize('admin'), deleteGallery);
router.delete('/:galleryId/images/:imageId', protect, authorize('admin'), deleteImage);

module.exports = router;
