const express = require('express');
const {
  getAppointmentPhotos,
  getAppointmentPhoto,
  updatePhotoCaption,
  deletePhoto,
  getPhotosByType
} = require('../controllers/appointmentPhoto.controller');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middlewares/auth');

// Get all photos or photos by type
router.get('/', protect, authorize('admin', 'professional', 'customer'), getAppointmentPhotos);
router.get('/type/:type', protect, authorize('admin', 'professional', 'customer'), getPhotosByType);

// Routes for individual photos
router.get('/:id', protect, authorize('admin', 'professional', 'customer'), getAppointmentPhoto);
router.put('/:id', protect, authorize('admin', 'professional'), updatePhotoCaption);
router.delete('/:id', protect, authorize('admin', 'professional'), deletePhoto);

module.exports = router;
