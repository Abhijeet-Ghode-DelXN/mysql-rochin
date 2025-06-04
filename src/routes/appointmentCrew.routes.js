const express = require('express');
const {
  getAppointmentCrew,
  addCrewMember,
  removeCrewMember,
  setLeadProfessional,
  getMyAssignments
} = require('../controllers/appointmentCrew.controller');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middlewares/auth');

// Routes that don't need appointmentId
router.get('/my-assignments', protect, authorize('professional'), getMyAssignments);

// Routes that need appointmentId
router.get('/', protect, authorize('admin', 'professional'), getAppointmentCrew);
router.post('/', protect, authorize('admin'), addCrewMember);
router.delete('/:id', protect, authorize('admin'), removeCrewMember);
router.put('/lead', protect, authorize('admin'), setLeadProfessional);

module.exports = router;
