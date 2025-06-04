const express = require('express');
const {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  servicePhotoUpload,
  getServicesByCategory,
  getServicePackages
} = require('../controllers/service.controller');

const { Service, ServicePackage, ServiceFrequency, ServiceDiscount } = require('../models/index');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');

// Special routes
router.route('/:id/photo')
  .put(protect, authorize('admin'), servicePhotoUpload);

router.route('/category/:category')
  .get(getServicesByCategory);

router.route('/:id/packages')
  .get(getServicePackages);

// Standard CRUD routes
router.route('/')
  .get(advancedResults(
    Service,
    [
      { model: ServicePackage, as: 'packages' },
      { model: ServiceFrequency, as: 'frequencies' },
      { model: ServiceDiscount, as: 'discounts' }
    ]
  ), getServices)
  .post(protect, authorize('admin'), createService);

router.route('/:id')
  .get(getService)
  .put(protect, authorize('admin'), updateService)
  .delete(protect, authorize('admin'), deleteService);

module.exports = router;
