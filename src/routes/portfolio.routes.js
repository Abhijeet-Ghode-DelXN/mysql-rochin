const express = require('express');
const {
  createPortfolio,
  getPortfolios,
  getPortfolio,
  updatePortfolio,
  deletePortfolio,
  deleteImage
} = require('../controllers/portfolio.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');
const models = require('../models');

// Public routes
router.get('/', advancedResults(models.Portfolio), getPortfolios);
router.get('/:id', getPortfolio);

// Admin routes
router.post('/', protect, authorize('admin'), createPortfolio);
router.put('/:id', protect, authorize('admin'), updatePortfolio);
router.delete('/:id', protect, authorize('admin'), deletePortfolio);
router.delete('/:id/images/:imageId', protect, authorize('admin'), deleteImage);

module.exports = router;
