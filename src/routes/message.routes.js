const express = require('express');
const {
  getMessages,
  getMessage,
  createMessage,
  updateMessage,
  deleteMessage,
  markAsRead
} = require('../controllers/message.controller');

const router = express.Router();

const { protect } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');
const models = require('../models');

// Public routes
router.post('/', createMessage);

// Protected routes
router.get('/', protect, advancedResults(models.Message), getMessages);
router.get('/:id', protect, getMessage);
router.put('/:id', protect, updateMessage);
router.delete('/:id', protect, deleteMessage);
router.put('/:id/read', protect, markAsRead);

module.exports = router;
