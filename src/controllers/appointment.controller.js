const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { sequelize } = require('../config/db');
const { Appointment, Customer, User, Service, AppointmentPhoto, AppointmentCrew } = require('../models');
const sendEmail = require('../utils/sendEmail');
const cloudinary = require('../utils/cloudinary');

// @desc    Get all appointments
// @route   GET /api/v1/appointments
// @access  Public/Private
exports.getAppointments = asyncHandler(async (req, res, next) => {
  // If status=Completed is specified, allow public access
  if (req.query.status === 'Completed') {
    // Add photos to the query
    res.advancedResults.data = await Promise.all(res.advancedResults.data.map(async (appointment) => {
      const populatedAppointment = await Appointment.findByPk(appointment.id, {
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
          },
          {
            model: AppointmentPhoto,
            as: 'photos'
          }
        ]
      });
      return populatedAppointment;
    }));
    return res.status(200).json(res.advancedResults);
  }

  // For other queries, check if user is authorized
  if (!req.user || !['admin', 'professional'].includes(req.user.role)) {
    return next(
      new ErrorResponse('Not authorized to access appointments', 403)
    );
  }

  res.status(200).json(res.advancedResults);
});

// @desc    Get single appointment
// @route   GET /api/v1/appointments/:id
// @access  Public/Private
exports.getAppointment = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findByPk(req.params.id, {
    include: [
      {
        model: Customer,
        as: 'customer',
        attributes: ['id', 'address', 'propertyDetails', 'notificationPreferences'],
        include: {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      },
      {
        model: Service,
        as: 'service'
      },
      {
        model: User,
        as: 'leadProfessional',
        attributes: ['id', 'name', 'phone']
      },
      {
        model: User,
        as: 'createdBy',
        attributes: ['id', 'name']
      },
      {
        model: AppointmentCrew,
        as: 'crew',
        include: {
          model: User,
          attributes: ['id', 'name', 'phone']
        }
      },
      {
        model: AppointmentPhoto,
        as: 'photos'
      }
    ]
  });

  if (!appointment) {
    return next(
      new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
    );
  }

  // Allow public access for completed appointments
  if (appointment.status === 'Completed') {
    return res.status(200).json({
      success: true,
      data: appointment
    });
  }

  // For non-completed appointments, check authorization
  if (!req.user) {
    return next(
      new ErrorResponse(`Not authorized to access this appointment`, 403)
    );
  }

  // Check if user is authorized to view
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ where: { userId: req.user.id } });
    if (!customer || appointment.customerId !== customer.id) {
      return next(
        new ErrorResponse(`Not authorized to access this appointment`, 403)
      );
    }
  }

  res.status(200).json({
    success: true,
    data: appointment
  });
});

// @desc    Get available time slots
// @route   GET /api/v1/appointments/availability
// @access  Public
exports.getAvailableTimeSlots = asyncHandler(async (req, res, next) => {
  const { date, serviceId } = req.query;

  // Validate input
  if (!date || !serviceId) {
    return next(new ErrorResponse('Please provide date and service ID', 400));
  }

  // Validate and parse date
  const selectedDate = new Date(date);
  if (isNaN(selectedDate)) {
    return next(new ErrorResponse('Invalid date format', 400));
  }

  // Get service details
  const service = await Service.findByPk(serviceId);
  if (!service) {
    return next(new ErrorResponse('Service not found', 404));
  }

  // Get business hours (you might want to store these in a config/model)
  const businessHours = {
    start: 8, // 8 AM
    end: 18,  // 6 PM
    slotInterval: 30 // minutes between slots
  };

  // Calculate time slots
  const startTime = new Date(selectedDate);
  startTime.setHours(businessHours.start, 0, 0, 0);

  const endTime = new Date(selectedDate);
  endTime.setHours(businessHours.end, 0, 0, 0);

  // Generate all possible slots
  const allSlots = [];
  let current = new Date(startTime);
  
  while (current < endTime) {
    const slotEnd = new Date(current.getTime() + service.duration * 60000);
    if (slotEnd > endTime) break;
    
    allSlots.push({
      start: current.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      end: slotEnd.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    });
    
    current = new Date(current.getTime() + businessHours.slotInterval * 60000);
  }

  // Format date for SQL query (YYYY-MM-DD)
  const formattedDate = selectedDate.toISOString().split('T')[0];

  // Get existing appointments
  const appointments = await Appointment.findAll({
    where: {
      date: formattedDate
    }
  });

  // Filter out occupied slots
  const availableSlots = allSlots.filter(slot => {
    return !appointments.some(appointment => {
      const apptStart = new Date(`1970-01-01T${appointment.startTime}`);
      const apptEnd = new Date(`1970-01-01T${appointment.endTime}`);
      const slotStart = new Date(`1970-01-01T${slot.start}`);
      const slotEnd = new Date(`1970-01-01T${slot.end}`);
      
      return (slotStart < apptEnd && slotEnd > apptStart);
    });
  });

  res.status(200).json({
    success: true,
    data: availableSlots
  });
});

// @desc    Create new appointment
// @route   POST /api/v1/appointments
// @access  Private/Customer
exports.createAppointment = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Get logged-in user ID from token
    const userId = req.user.id;
    
    // Find the Customer using the user ID
    const customer = await Customer.findOne({ 
      where: { userId },
      transaction
    });
    
    if (!customer) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Customer not found with user id of ${userId}`, 404)
      );
    }
    
    // Replace the customer ID in request body with correct one
    req.body.customerId = customer.id;
    
    // Check service exists
    const service = await Service.findByPk(req.body.serviceId, { transaction });
    if (!service) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Service not found with id of ${req.body.serviceId}`, 404)
      );
    }

    // Add user as creator
    req.body.createdById = userId;
    
    const appointment = await Appointment.create(req.body, { transaction });

    // Get customer's user info for notification
    const customerUser = await User.findByPk(customer.userId, { transaction });

    // Send confirmation email to customer
    if (customerUser && customerUser.email) {
      try {
        const formattedDate = new Date(appointment.date).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        await sendEmail({
          email: customerUser.email,
          subject: 'Appointment Confirmation',
          message: `Your landscaping appointment has been scheduled for ${formattedDate} from ${appointment.startTime} to ${appointment.endTime}. Service: ${service.name}. Please contact us if you need to reschedule.`
        });

        // Update notification status
        appointment.confirmationSent = true;
        await appointment.save({ transaction });
      } catch (err) {
        console.log('Email notification failed:', err);
      }
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Update appointment
// @route   PUT /api/v1/appointments/:id
// @access  Private (admin, professional, or customer for own appointment with limited fields)
exports.updateAppointment = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    let appointment = await Appointment.findByPk(req.params.id, { transaction });

    if (!appointment) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
      );
    }

    const userRole = req.user.role;
    
    // Store original values before update
    const originalDate = appointment.date;
    const originalStartTime = appointment.startTime;
    const originalEndTime = appointment.endTime;
    const originalStatus = appointment.status;

    // If user is admin or professional: allow full update
    if (userRole === 'admin' || userRole === 'professional') {
      await appointment.update(req.body, { transaction });
    }
    // If user is customer: restrict update to own appointment and only date/timeSlot
    else if (userRole === 'customer') {
      // Get customer ID for the current user
      const customer = await Customer.findOne({ 
        where: { userId: req.user.id },
        transaction
      });
      
      if (!customer) {
        await transaction.rollback();
        return next(new ErrorResponse('Customer profile not found', 404));
      }

      // Check if the appointment belongs to the customer
      if (appointment.customerId !== customer.id) {
        await transaction.rollback();
        return next(
          new ErrorResponse(`Not authorized to update this appointment`, 403)
        );
      }

      // Only allow date and time fields
      const allowedFields = ['date', 'startTime', 'endTime'];
      const invalidFields = Object.keys(req.body).filter(
        (key) => !allowedFields.includes(key)
      );
      
      if (invalidFields.length > 0) {
        await transaction.rollback();
        return next(
          new ErrorResponse(
            `Customers are only allowed to update 'date', 'startTime', and 'endTime'. You sent: ${invalidFields.join(', ')}`,
            403
          )
        );
      }

      // Update only the allowed fields
      if (req.body.date) appointment.date = req.body.date;
      if (req.body.startTime) appointment.startTime = req.body.startTime;
      if (req.body.endTime) appointment.endTime = req.body.endTime;

      await appointment.save({ transaction });
    } else {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Not authorized to update this appointment`, 403)
      );
    }

    // Check if status changed to 'Completed'
    if (req.body.status === 'Completed' && originalStatus !== 'Completed') {
      appointment.completedAt = Date.now();
      await appointment.save({ transaction });

      try {
        const customer = await Customer.findByPk(appointment.customerId, {
          include: {
            model: User,
            as: 'user'
          },
          transaction
        });
        
        if (customer && customer.user.email) {
          await sendEmail({
            email: customer.user.email,
            subject: 'Service Completed',
            message: `Your landscaping service has been completed. Thank you for your business!`
          });

          appointment.completionSent = true;
          await appointment.save({ transaction });
        }
      } catch (err) {
        console.log('Completion notification failed:', err);
      }
    }

    // Check if date or time changed (only if status didn't change to Completed)
    if (req.body.status !== 'Completed' || originalStatus === 'Completed') {
      const dateChanged = req.body.date && 
        new Date(req.body.date).toISOString().split('T')[0] !== originalDate;
      
      const timeChanged = (req.body.startTime && req.body.startTime !== originalStartTime) ||
        (req.body.endTime && req.body.endTime !== originalEndTime);

      if (dateChanged || timeChanged) {
        try {
          const customer = await Customer.findByPk(appointment.customerId, {
            include: {
              model: User,
              as: 'user'
            },
            transaction
          });
          
          if (customer && customer.user.email) {
            const formattedDate = new Date(appointment.date).toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            await sendEmail({
              email: customer.user.email,
              subject: 'Appointment Rescheduled',
              message: `Your landscaping appointment has been rescheduled to ${formattedDate} from ${appointment.startTime} to ${appointment.endTime}. Please contact us if you have any questions.`
            });
          }
        } catch (err) {
          console.log('Reschedule notification failed:', err);
        }
      }
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

// @desc    Delete appointment
// @route   DELETE /api/v1/appointments/:id
// @access  Private/Admin
exports.deleteAppointment = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const appointment = await Appointment.findByPk(req.params.id, { transaction });

    if (!appointment) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user is authorized to delete
    if (req.user.role !== 'admin') {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Not authorized to delete this appointment`, 403)
      );
    }

    // Delete associated photos from Cloudinary
    const appointmentPhotos = await AppointmentPhoto.findAll({
      where: { appointmentId: req.params.id },
      transaction
    });

    for (const photo of appointmentPhotos) {
      if (photo.publicId) {
        try {
          await cloudinary.uploader.destroy(photo.publicId);
        } catch (err) {
          console.log('Error deleting photo from Cloudinary:', err);
        }
      }
    }

    // Delete appointment and all associated records
    await appointment.destroy({ transaction });
    
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

// @desc    Upload service photos
// @route   POST /api/v1/appointments/:id/photos
// @access  Private/Professional
exports.uploadServicePhotos = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const appointment = await Appointment.findByPk(req.params.id, { transaction });

    if (!appointment) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if appointment is completed
    if (appointment.status !== 'Completed') {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Photos can only be uploaded for completed appointments`, 400)
      );
    }

    // Check if user is authorized to upload photos
    if (req.user.role !== 'admin' && req.user.role !== 'professional') {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Not authorized to upload photos for this appointment`, 403)
      );
    }

    if (!req.body.photos || !Array.isArray(req.body.photos) || req.body.photos.length === 0) {
      await transaction.rollback();
      return next(new ErrorResponse(`Please upload at least one photo`, 400));
    }

    // Check if before or after service
    if (!req.body.photoType || !['beforeService', 'afterService'].includes(req.body.photoType)) {
      await transaction.rollback();
      return next(new ErrorResponse(`Please specify photoType as 'beforeService' or 'afterService'`, 400));
    }

    const uploadPromises = req.body.photos.map(photo => {
      return new Promise((resolve, reject) => {
        try {
          // Upload to cloudinary
          cloudinary.uploader.upload(
            `data:${photo.contentType};base64,${photo.data}`,
            {
              folder: `landscaping/appointments/${appointment.id}/${req.body.photoType}`,
              resource_type: 'auto',
              public_id: photo.name.split('.')[0] // Use filename without extension as public_id
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve({
                  url: result.secure_url,
                  publicId: result.public_id,
                  caption: '',
                  uploadedAt: Date.now()
                });
              }
            }
          );
        } catch (err) {
          reject(err);
        }
      });
    });

    const uploadedPhotos = await Promise.all(uploadPromises);

    // Create photo records in database
    const photoRecords = await Promise.all(uploadedPhotos.map(photo => {
      return AppointmentPhoto.create({
        appointmentId: appointment.id,
        photoType: req.body.photoType,
        url: photo.url,
        publicId: photo.publicId,
        caption: photo.caption,
        uploadedAt: photo.uploadedAt
      }, { transaction });
    }));

    await transaction.commit();

    res.status(200).json({
      success: true,
      count: photoRecords.length,
      data: photoRecords
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get my appointments (Customer)
// @route   GET /api/v1/appointments/my-appointments
// @access  Private/Customer
exports.getMyAppointments = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({ where: { userId: req.user.id } });

  if (!customer) {
    return next(new ErrorResponse(`No customer profile found`, 404));
  }

  const appointments = await Appointment.findAll({
    where: { customerId: customer.id },
    include: [
      {
        model: Service,
        as: 'service',
        attributes: ['id', 'name', 'category']
      }
    ],
    order: [['date', 'DESC']]
  });

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

// @desc    Request reschedule (Customer)
// @route   PUT /api/v1/appointments/:id/reschedule-request
// @access  Private/Customer
exports.requestReschedule = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { requestedDate, requestedTime, reason } = req.body;

    if (!requestedDate || !requestedTime) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Please provide requested date and time`, 400)
      );
    }

    const appointment = await Appointment.findByPk(req.params.id, { transaction });

    if (!appointment) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
      );
    }

    // Verify customer owns this appointment
    const customer = await Customer.findOne({ 
      where: { userId: req.user.id },
      transaction
    });
    
    if (!customer || appointment.customerId !== customer.id) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Not authorized to reschedule this appointment`, 403)
      );
    }

    // Add reschedule request to notes
    if (!appointment.customerNotes) {
      appointment.customerNotes = '';
    }
    
    appointment.customerNotes += `\n[RESCHEDULE REQUEST] Date: ${requestedDate}, Time: ${requestedTime}, Reason: ${reason || 'Not provided'}`;
    appointment.status = 'Rescheduled';
    
    await appointment.save({ transaction });

    // Notify admin about reschedule request
    try {
      const admins = await User.findAll({
        where: { role: 'admin' },
        transaction
      });
      
      if (admins.length > 0) {
        await sendEmail({
          email: admins[0].email,
          subject: 'Appointment Reschedule Request',
          message: `Customer ${req.user.name} has requested to reschedule their appointment on ${new Date(appointment.date).toLocaleDateString()} to ${requestedDate} at ${requestedTime}. Reason: ${reason || 'Not provided'}`
        });
      }
    } catch (err) {
      console.log('Reschedule notification failed:', err);
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

// @desc    Get appointments by date range
// @route   GET /api/v1/appointments/calendar
// @access  Private
exports.getCalendarAppointments = asyncHandler(async (req, res, next) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return next(
      new ErrorResponse(`Please provide start and end dates`, 400)
    );
  }

  let whereClause = {
    date: {
      [sequelize.Op.between]: [new Date(start), new Date(end)]
    }
  };

  // If customer, only show their appointments
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ where: { userId: req.user.id } });
    if (!customer) {
      return next(new ErrorResponse(`No customer profile found`, 404));
    }
    whereClause.customerId = customer.id;
  }

  // If professional, only show appointments they're assigned to
  if (req.user.role === 'professional') {
    const appointmentsAsLead = await Appointment.findAll({
      where: {
        ...whereClause,
        leadProfessionalId: req.user.id
      }
    });
    
    const appointmentsAsCrew = await AppointmentCrew.findAll({
      where: { userId: req.user.id },
      include: {
        model: Appointment,
        where: whereClause
      }
    });
    
    const appointmentIds = [
      ...appointmentsAsLead.map(a => a.id),
      ...appointmentsAsCrew.map(ac => ac.appointmentId)
    ];
    
    whereClause.id = {
      [sequelize.Op.in]: appointmentIds
    };
  }

  const appointments = await Appointment.findAll({
    where: whereClause,
    include: [
      {
        model: Customer,
        as: 'customer',
        attributes: ['id', 'address']
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
    ],
    order: [['date', 'ASC']]
  });

  // Format for calendar display with null checks
  const calendarAppointments = appointments.map(apt => {
    // Get service name with fallback
    const serviceName = apt.service?.name || 'Unassigned Service';
    
    // Get customer address with fallback
    const customerAddress = apt.customer?.address || 'No Address';
    
    // Get start and end times with validation
    const startTime = apt.startTime || '00:00';
    const endTime = apt.endTime || '00:00';
    
    // Create date objects with validation
    const startDate = new Date(`${apt.date}T${startTime}`);
    const endDate = new Date(`${apt.date}T${endTime}`);
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error(`Invalid date for appointment ${apt.id}:`, {
        date: apt.date,
        startTime,
        endTime
      });
      return null;
    }

    return {
      id: apt.id,
      title: `${serviceName} - ${customerAddress}`,
      start: startDate,
      end: endDate,
      color: apt.getCalendarColor ? apt.getCalendarColor() : '#3174ad', // Use instance method if available
      status: apt.status || 'Scheduled',
      customer: apt.customer || null,
      packageType: apt.packageType || 'Standard',
      recurring: apt.recurringType !== 'One-time'
    };
  }).filter(Boolean); // Remove any null entries from invalid dates

  res.status(200).json({
    success: true,
    count: calendarAppointments.length,
    data: calendarAppointments
  });
});
