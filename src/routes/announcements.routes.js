const express = require('express');
const {
  getAnnouncements,
  getActiveAnnouncement,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcement.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');
const models = require('../models');

// Public routes
router.get('/active', getActiveAnnouncement);

// Admin routes
router.get('/', protect, authorize('admin'), advancedResults(models.Announcement), getAnnouncements);
router.get('/:id', protect, authorize('admin'), getAnnouncement);
router.post('/', protect, authorize('admin'), createAnnouncement);
router.put('/:id', protect, authorize('admin'), updateAnnouncement);
router.delete('/:id', protect, authorize('admin'), deleteAnnouncement);

module.exports = router;
