const express = require('express');
const {
  getAnnouncements,
  getActiveAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcement.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/active', getActiveAnnouncement);

// Admin-only routes
router.get('/', protect, authorize('admin'), getAnnouncements);
router.post('/', protect, authorize('admin'), createAnnouncement);
router.put('/:id', protect, authorize('admin'), updateAnnouncement);
router.delete('/:id', protect, authorize('admin'), deleteAnnouncement);

module.exports = router;
