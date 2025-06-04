const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { sequelize } = require('../config/db');
const { Appointment, AppointmentCrew, User } = require('../models');

// @desc    Get crew members for an appointment
// @route   GET /api/v1/appointments/:appointmentId/crew
// @access  Private/Admin/Professional
exports.getAppointmentCrew = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findByPk(req.params.appointmentId);

  if (!appointment) {
    return next(
      new ErrorResponse(`Appointment not found with id of ${req.params.appointmentId}`, 404)
    );
  }

  const crew = await AppointmentCrew.findAll({
    where: { appointmentId: req.params.appointmentId },
    include: {
      model: User,
      attributes: ['id', 'name', 'email', 'phone', 'role']
    }
  });

  res.status(200).json({
    success: true,
    count: crew.length,
    data: crew
  });
});

// @desc    Add crew member to appointment
// @route   POST /api/v1/appointments/:appointmentId/crew
// @access  Private/Admin
exports.addCrewMember = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId } = req.body;

    if (!userId) {
      await transaction.rollback();
      return next(new ErrorResponse('Please provide a user ID', 400));
    }

    // Check if appointment exists
    const appointment = await Appointment.findByPk(req.params.appointmentId, { transaction });
    if (!appointment) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Appointment not found with id of ${req.params.appointmentId}`, 404)
      );
    }

    // Check if user exists and is a professional
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
    }

    if (user.role !== 'professional' && user.role !== 'admin') {
      await transaction.rollback();
      return next(new ErrorResponse('Only professionals can be added to crew', 400));
    }

    // Check if user is already in crew
    const existingCrew = await AppointmentCrew.findOne({
      where: {
        appointmentId: req.params.appointmentId,
        userId
      },
      transaction
    });

    if (existingCrew) {
      await transaction.rollback();
      return next(new ErrorResponse('User is already assigned to this appointment', 400));
    }

    // Add crew member
    const crewMember = await AppointmentCrew.create({
      appointmentId: req.params.appointmentId,
      userId
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: crewMember
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Remove crew member from appointment
// @route   DELETE /api/v1/appointments/:appointmentId/crew/:id
// @access  Private/Admin
exports.removeCrewMember = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Check if appointment exists
    const appointment = await Appointment.findByPk(req.params.appointmentId, { transaction });
    if (!appointment) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Appointment not found with id of ${req.params.appointmentId}`, 404)
      );
    }

    // Check if crew assignment exists
    const crewMember = await AppointmentCrew.findOne({
      where: {
        id: req.params.id,
        appointmentId: req.params.appointmentId
      },
      transaction
    });

    if (!crewMember) {
      await transaction.rollback();
      return next(new ErrorResponse(`Crew assignment not found with id of ${req.params.id}`, 404));
    }

    // Remove crew member
    await crewMember.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Set lead professional for appointment
// @route   PUT /api/v1/appointments/:appointmentId/lead
// @access  Private/Admin
exports.setLeadProfessional = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId } = req.body;

    if (!userId) {
      await transaction.rollback();
      return next(new ErrorResponse('Please provide a user ID', 400));
    }

    // Check if appointment exists
    const appointment = await Appointment.findByPk(req.params.appointmentId, { transaction });
    if (!appointment) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Appointment not found with id of ${req.params.appointmentId}`, 404)
      );
    }

    // Check if user exists and is a professional
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
    }

    if (user.role !== 'professional' && user.role !== 'admin') {
      await transaction.rollback();
      return next(new ErrorResponse('Only professionals can be lead professionals', 400));
    }

    // Update appointment with lead professional
    appointment.leadProfessionalId = userId;
    await appointment.save({ transaction });

    // Ensure the lead professional is also in the crew
    const existingCrew = await AppointmentCrew.findOne({
      where: {
        appointmentId: req.params.appointmentId,
        userId
      },
      transaction
    });

    if (!existingCrew) {
      await AppointmentCrew.create({
        appointmentId: req.params.appointmentId,
        userId
      }, { transaction });
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get my assigned appointments (Professional)
// @route   GET /api/v1/appointments/my-assignments
// @access  Private/Professional
exports.getMyAssignments = asyncHandler(async (req, res, next) => {
  // Find appointments where user is in crew or is lead professional
  const assignedCrewAppointments = await AppointmentCrew.findAll({
    where: { userId: req.user.id },
    attributes: ['appointmentId']
  });

  const appointmentIds = assignedCrewAppointments.map(crew => crew.appointmentId);

  // Also find appointments where user is lead professional
  const leadAppointments = await Appointment.findAll({
    where: { leadProfessionalId: req.user.id },
    attributes: ['id']
  });

  // Combine both sets of appointment IDs
  const allAppointmentIds = [
    ...appointmentIds,
    ...leadAppointments.map(apt => apt.id)
  ];

  // Remove duplicates
  const uniqueAppointmentIds = [...new Set(allAppointmentIds)];

  // Get full appointment details
  const appointments = await Appointment.findAll({
    where: {
      id: {
        [sequelize.Op.in]: uniqueAppointmentIds
      }
    },
    include: [
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
      }
    ],
    order: [['date', 'ASC']]
  });

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});
