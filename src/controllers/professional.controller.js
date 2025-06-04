const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { sequelize } = require('../config/db');
const { User, Professional, Appointment, AppointmentCrew } = require('../models');

// @desc    Get all professionals
// @route   GET /api/v1/professionals
// @access  Private/Admin
exports.getProfessionals = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const professionals = await Professional.findAll({
      transaction,
      include: {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone']
      }
    });

    await transaction.commit();

    res.status(200).json({
      success: true,
      count: professionals.length,
      data: professionals
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get single professional
// @route   GET /api/v1/professionals/:id
// @access  Private/Admin
exports.getProfessional = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const professional = await Professional.findByPk(req.params.id, {
      transaction,
      include: {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone']
      }
    });

    if (!professional) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Professional not found with id of ${req.params.id}`, 404)
      );
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: professional
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Create new professional
// @route   POST /api/v1/professionals
// @access  Private/Admin
exports.createProfessional = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Create user first
    const user = await User.create({
      ...req.body,
      role: 'professional'
    }, { transaction });

    // Create professional profile
    const professional = await Professional.create({
      userId: user.id,
      ...req.body.professional
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        user,
        professional
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Update professional
// @route   PUT /api/v1/professionals/:id
// @access  Private/Admin
exports.updateProfessional = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const professional = await Professional.findByPk(req.params.id, {
      transaction,
      include: {
        model: User,
        as: 'user'
      }
    });

    if (!professional) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Professional not found with id of ${req.params.id}`, 404)
      );
    }

    // Update user data if provided
    if (req.body.user) {
      await professional.user.update(req.body.user, { transaction });
    }

    // Update professional data
    await professional.update(req.body.professional, { transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: professional
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Delete professional
// @route   DELETE /api/v1/professionals/:id
// @access  Private/Admin
exports.deleteProfessional = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const professional = await Professional.findByPk(req.params.id, {
      transaction
    });

    if (!professional) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Professional not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if professional has assigned appointments
    const assignedAppointments = await AppointmentCrew.count({
      where: {
        userId: professional.userId
      },
      transaction
    });

    if (assignedAppointments > 0) {
      await transaction.rollback();
      return next(
        new ErrorResponse(
          `Cannot delete professional with ${assignedAppointments} assigned appointments`,
          400
        )
      );
    }

    // Delete professional and associated user
    await professional.destroy({ transaction });
    await User.destroy({
      where: { id: professional.userId },
      transaction
    });

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

// @desc    Get professional workload
// @route   GET /api/v1/professionals/:id/workload
// @access  Private/Admin
exports.getProfessionalWorkload = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const professional = await Professional.findByPk(req.params.id, {
      transaction,
      include: {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone']
      }
    });

    if (!professional) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Professional not found with id of ${req.params.id}`, 404)
      );
    }

    // Get current date
    const today = new Date();
    
    // Get start and end dates for current week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    // Get all appointments for this professional in the current week
    const appointments = await Appointment.findAll({
      where: {
        date: {
          [sequelize.Op.between]: [startOfWeek, endOfWeek]
        }
      },
      include: [
        {
          model: Service,
          as: 'service',
          attributes: ['id', 'name', 'duration']
        },
        {
          model: AppointmentCrew,
          where: { userId: professional.userId }
        }
      ],
      transaction
    });

    // Calculate total work hours
    let totalMinutes = 0;
    appointments.forEach(appointment => {
      // If service has duration, use it
      if (appointment.service && appointment.service.duration) {
        totalMinutes += appointment.service.duration;
      } else {
        // Otherwise estimate 2 hours per appointment
        totalMinutes += 120;
      }
    });

    const totalHours = Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal place

    // Organize appointments by day
    const workloadByDay = {
      Sunday: { count: 0, hours: 0 },
      Monday: { count: 0, hours: 0 },
      Tuesday: { count: 0, hours: 0 },
      Wednesday: { count: 0, hours: 0 },
      Thursday: { count: 0, hours: 0 },
      Friday: { count: 0, hours: 0 },
      Saturday: { count: 0, hours: 0 }
    };

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    appointments.forEach(appointment => {
      const day = days[new Date(appointment.date).getDay()];
      workloadByDay[day].count += 1;
      
      let appointmentHours = 0;
      if (appointment.service && appointment.service.duration) {
        appointmentHours = appointment.service.duration / 60;
      } else {
        appointmentHours = 2; // Default 2 hours
      }
      
      workloadByDay[day].hours += appointmentHours;
    });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {
        professional: {
          id: professional.id,
          name: professional.user.name,
          email: professional.user.email,
          phone: professional.user.phone
        },
        currentWeek: {
          startDate: startOfWeek,
          endDate: endOfWeek,
          totalAppointments: appointments.length,
          totalHours
        },
        workloadByDay
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Assign professional to appointment
// @route   PUT /api/v1/professionals/:id/assign/:appointmentId
// @access  Private/Admin
exports.assignToAppointment = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const professional = await Professional.findByPk(req.params.id, {
      transaction,
      include: {
        model: User,
        as: 'user',
        attributes: ['id']
      }
    });

    if (!professional) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Professional not found with id of ${req.params.id}`, 404)
      );
    }

    const appointment = await Appointment.findByPk(req.params.appointmentId, {
      transaction,
      include: {
        model: Service,
        as: 'service',
        attributes: ['id', 'name', 'duration']
      }
    });

    if (!appointment) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Appointment not found with id of ${req.params.appointmentId}`, 404)
      );
    }

    // Check if appointment date conflicts with professional's existing schedule
    const appointmentDate = new Date(appointment.date);
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find professional's appointments for the same day
    const existingAppointments = await Appointment.findAll({
      where: {
        date: {
          [sequelize.Op.between]: [startOfDay, endOfDay]
        }
      },
      include: {
        model: AppointmentCrew,
        where: { userId: professional.userId }
      },
      transaction
    });

    // Check for time conflicts
    let hasConflict = false;
    const appointmentStart = appointment.startTime;
    const appointmentEnd = appointment.endTime;

    existingAppointments.forEach(existingAppointment => {
      const existingStart = existingAppointment.startTime;
      const existingEnd = existingAppointment.endTime;

      // Check for time overlaps
      if ((appointmentStart >= existingStart && appointmentStart < existingEnd) ||
          (appointmentEnd > existingStart && appointmentEnd <= existingEnd) ||
          (appointmentStart <= existingStart && appointmentEnd >= existingEnd)) {
        hasConflict = true;
      }
    });

    if (hasConflict) {
      await transaction.rollback();
      return next(
        new ErrorResponse(
          `Professional has scheduling conflict on ${appointmentDate.toDateString()}`,
          400
        )
      );
    }

    // Determine if this is for lead professional or crew member
    const { isLead } = req.body;

    if (isLead) {
      appointment.leadProfessionalId = professional.userId;
    } else {
      // Check if professional is already assigned
      const isAssigned = await AppointmentCrew.findOne({
        where: {
          appointmentId: appointment.id,
          userId: professional.userId
        },
        transaction
      });

      if (!isAssigned) {
        await AppointmentCrew.create({
          appointmentId: appointment.id,
          userId: professional.userId
        }, { transaction });
      }
    }

    await appointment.save({ transaction });
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

// @desc    Get all available professionals for a time slot
// @route   GET /api/v1/professionals/available
// @access  Private/Admin
exports.getAvailableProfessionals = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { date, startTime, endTime } = req.query;

    if (!date || !startTime || !endTime) {
      await transaction.rollback();
      return next(
        new ErrorResponse('Please provide date, startTime and endTime', 400)
      );
    }

    // Get all professionals
    const professionals = await Professional.findAll({
      transaction,
      include: {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone']
      }
    });

    const appointmentDate = new Date(date);
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find all appointments for that day
    const appointments = await Appointment.findAll({
      where: {
        date: {
          [sequelize.Op.between]: [startOfDay, endOfDay]
        }
      },
      include: {
        model: AppointmentCrew,
        required: true
      },
      transaction
    });

    // Filter available professionals
    const availableProfessionals = professionals.filter(professional => {
      const professionalId = professional.userId;
      
      // Check if professional has any conflicting appointments
      const hasConflict = appointments.some(appointment => {
        const isAssigned = appointment.crew.some(
          crew => crew.userId === professionalId
        );
        
        if (!isAssigned) return false;
        
        const appointmentStart = appointment.startTime;
        const appointmentEnd = appointment.endTime;
        
        // Check for time overlap
        return (
          (startTime >= appointmentStart && startTime < appointmentEnd) ||
          (endTime > appointmentStart && endTime <= appointmentEnd) ||
          (startTime <= appointmentStart && endTime >= appointmentEnd)
        );
      });
      
      return !hasConflict;
    });

    await transaction.commit();

    res.status(200).json({
      success: true,
      count: availableProfessionals.length,
      data: availableProfessionals
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});
