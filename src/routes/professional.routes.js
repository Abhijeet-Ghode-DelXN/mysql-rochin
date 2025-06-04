const express = require('express');
const {
  getProfessionals,
  getProfessional,
  createProfessional,
  updateProfessional,
  deleteProfessional,
  getProfessionalWorkload,
  assignToAppointment,
  getAvailableProfessionals
} = require('../controllers/professional.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');
const models = require('../models');

// Routes for admin only
router.get('/', protect, authorize('admin'), advancedResults(models.Professional), getProfessionals);
router.get('/:id', protect, authorize('admin'), getProfessional);
router.post('/', protect, authorize('admin'), createProfessional);
router.put('/:id', protect, authorize('admin'), updateProfessional);
router.delete('/:id', protect, authorize('admin'), deleteProfessional);

// Professional-specific routes
router.get('/:id/workload', protect, authorize('admin'), getProfessionalWorkload);
router.put('/:id/assign/:appointmentId', protect, authorize('admin'), assignToAppointment);
router.get('/available', protect, authorize('admin'), getAvailableProfessionals);

module.exports = router;
