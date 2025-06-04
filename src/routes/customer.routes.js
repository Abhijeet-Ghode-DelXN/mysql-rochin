const express = require('express');
const {
  getCustomers,
  getCustomer,
  createCustomerByAdmin,
  updateCustomer,
  deleteCustomer,
  getCustomerHistory,
  getMyProfile,
  updateMyProfile,
  uploadPropertyImages,
  deletePropertyImage
} = require('../controllers/customer.controller');

const { Customer, User } = require('../models/index');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');

// Routes for current customer (customer role)
router.get('/me', protect, authorize('customer'), getMyProfile);
router.put('/me', protect, authorize('customer'), updateMyProfile);

// Routes requiring admin role
router.route('/')
  .get(
    protect, 
    authorize('admin'), 
    advancedResults(Customer, [
      { model: User, as: 'user', attributes: ['name', 'email', 'phone'] }
    ]),
    getCustomers
  )
  .post(protect, authorize('admin'), createCustomerByAdmin);

router.route('/:id/images')
  .post(protect, uploadPropertyImages);

router.route('/:id/images/:imageId')
  .delete(protect, deletePropertyImage);

router.route('/:id')
  .get(protect, authorize('admin'), getCustomer)
  .put(protect, authorize('admin'), updateCustomer)
  .delete(protect, authorize('admin'), deleteCustomer);

router.get('/:id/history', protect, authorize('admin'), getCustomerHistory);

module.exports = router;
