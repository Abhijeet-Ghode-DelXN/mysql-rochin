const express = require('express');
const {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  uploadServicePhotos,
  getMyAppointments,
  requestReschedule,
  getCalendarAppointments,
  getAvailableTimeSlots
} = require('../controllers/appointment.controller');

const { Appointment, Customer, User, Service } = require('../models');

const router = express.Router();

const { protect, authorize, optional } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');

// Routes for admin and professional
router.get('/admin', advancedResults(
  Appointment,
  [
    {
      model: Customer,
      as: 'customer',
      attributes: ['id', 'address'],
      include: {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'phone']
      }
    },
    {
      model: Service,
      as: 'service',
      attributes: ['id', 'name', 'category']
    },
    {
      model: User,
      as: 'leadProfessional',
      attributes: ['id', 'name']
    }
  ]
), protect, authorize('admin', 'professional'), getAppointments);

// Public route for listing appointments (limited data)
router.get('/', optional, advancedResults(
  Appointment,
  [
    {
      model: Service,
      as: 'service',
      attributes: ['id', 'name', 'category']
    }
  ]
), getAppointments);

// Specific routes must come before parameterized routes
router.get('/availability', getAvailableTimeSlots);
router.get('/my-appointments', protect, authorize('customer'), getMyAppointments);
router.get('/calendar', protect, authorize('admin', 'professional', 'customer'), getCalendarAppointments);

// Parameterized routes
router.get('/:id', optional, getAppointment);
router.put('/:id/reschedule-request', protect, authorize('customer'), requestReschedule);
router.post('/:id/photos', protect, authorize('admin', 'professional'), uploadServicePhotos);

// Admin, Professional, and Customer routes
router.post('/', protect, authorize('customer'), createAppointment);
router.put('/:id', protect, authorize('admin', 'professional', 'customer'), updateAppointment);
router.delete('/:id', protect, authorize('admin'), deleteAppointment);

module.exports = router;
