const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const PDFDocument = require('pdfkit');
const {
  Payment,
  Appointment,
  Customer,
  Service,
  User
} = require('../models');

// Helper functions
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatCurrency = (amount) => {
  return `$${parseFloat(amount).toFixed(2)}`;
};

// @desc    Generate revenue report
// @route   GET /api/v1/reports/revenue
// @access  Private/Admin
exports.generateRevenueReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, format } = req.query;
  
  if (!startDate || !endDate) {
    return next(new ErrorResponse('Please provide start and end dates', 400));
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Add one day to end date to include the full day
  end.setDate(end.getDate() + 1);
  
  if (start > end) {
    return next(new ErrorResponse('Start date must be before end date', 400));
  }

  try {
    // Query for completed payments in date range
    const payments = await Payment.findAll({
      where: {
        status: 'Completed',
        createdAt: {
          [Op.gte]: start,
          [Op.lt]: end
        }
      },
      include: [
        {
          model: Customer,
          as: 'customer',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'email']
            }
          ]
        },
        {
          model: Appointment,
          as: 'appointment',
          include: [
            {
              model: Service,
              as: 'service',
              attributes: ['name', 'category']
            }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Calculate total revenue
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Group by service category
    const revenueByCategory = {};
    payments.forEach(payment => {
      if (payment.appointment && payment.appointment.service) {
        const category = payment.appointment.service.category;
        if (!revenueByCategory[category]) {
          revenueByCategory[category] = 0;
        }
        revenueByCategory[category] += payment.amount;
      }
    });

    if (format === 'pdf') {
      // Create PDF document
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `revenue-report-${startDate}-to-${endDate}.pdf`;
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // Add content to PDF
      doc.fontSize(25).text('Revenue Report', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).text(`Date Range: ${formatDate(start)} to ${formatDate(end)}`, { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(16).text(`Total Revenue: ${formatCurrency(totalRevenue)}`, { align: 'center' });
      doc.moveDown();
      
      // Revenue by category
      doc.fontSize(14).text('Revenue by Service Category:', { underline: true });
      doc.moveDown(0.5);
      
      Object.entries(revenueByCategory).forEach(([category, amount]) => {
        doc.fontSize(12).text(`${category}: ${formatCurrency(amount)}`);
      });
      doc.moveDown();
      
      // Payment table
      doc.fontSize(14).text('Payment Details:', { underline: true });
      doc.moveDown(0.5);
      
      // Table headers
      const tableTop = doc.y;
      doc.fontSize(10)
        .text('Date', 50, tableTop)
        .text('Customer', 150, tableTop)
        .text('Service', 250, tableTop)
        .text('Amount', 380, tableTop, { width: 90, align: 'right' })
        .text('Method', 470, tableTop);
      
      doc.moveDown();
      let y = doc.y;
      
      // Table rows
      payments.forEach((payment, i) => {
        const customerName = payment.customer && payment.customer.user ? payment.customer.user.name : 'N/A';
        const serviceName = payment.appointment && payment.appointment.service ? payment.appointment.service.name : 'N/A';
        
        if (y > 700) { // Start a new page if near bottom
          doc.addPage();
          y = 50;
        }
        
        doc.fontSize(9)
          .text(formatDate(payment.createdAt), 50, y)
          .text(customerName, 150, y)
          .text(serviceName, 250, y)
          .text(formatCurrency(payment.amount), 380, y, { width: 90, align: 'right' })
          .text(payment.method, 470, y);
        
        y += 20;
      });
      
      // Finalize PDF
      doc.end();
    } else {
      // Default JSON response
      res.status(200).json({
        success: true,
        data: {
          dateRange: {
            start: formatDate(start),
            end: formatDate(end)
          },
          totalRevenue,
          revenueByCategory,
          payments: payments.map(payment => ({
            id: payment.id,
            date: formatDate(payment.createdAt),
            amount: payment.amount,
            customer: payment.customer && payment.customer.user ? payment.customer.user.name : 'N/A',
            service: payment.appointment && payment.appointment.service ? payment.appointment.service.name : 'N/A',
            category: payment.appointment && payment.appointment.service ? payment.appointment.service.category : 'N/A',
            paymentMethod: payment.method
          }))
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Generate appointment report
// @route   GET /api/v1/reports/appointments
// @access  Private/Admin
exports.generateAppointmentReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, status, format } = req.query;
  
  if (!startDate || !endDate) {
    return next(new ErrorResponse('Please provide start and end dates', 400));
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Add one day to end date to include the full day
  end.setDate(end.getDate() + 1);
  
  if (start > end) {
    return next(new ErrorResponse('Start date must be before end date', 400));
  }

  try {
    // Build query
    const whereClause = {
      date: {
        [Op.gte]: start,
        [Op.lt]: end
      }
    };
    
    if (status) {
      whereClause.status = status;
    }

    // Get appointments
    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'email', 'phone']
            }
          ]
        },
        {
          model: Service,
          as: 'service',
          attributes: ['name', 'category', 'duration']
        }
      ],
      order: [['date', 'ASC'], ['timeSlot.startTime', 'ASC']]
    });

    // Group by status
    const appointmentsByStatus = {};
    appointments.forEach(appointment => {
      if (!appointmentsByStatus[appointment.status]) {
        appointmentsByStatus[appointment.status] = 0;
      }
      appointmentsByStatus[appointment.status] += 1;
    });

    // Group by service category
    const appointmentsByCategory = {};
    appointments.forEach(appointment => {
      if (appointment.service) {
        const category = appointment.service.category;
        if (!appointmentsByCategory[category]) {
          appointmentsByCategory[category] = 0;
        }
        appointmentsByCategory[category] += 1;
      }
    });

    if (format === 'pdf') {
      // Create PDF document
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `appointment-report-${startDate}-to-${endDate}.pdf`;
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // Add content to PDF
      doc.fontSize(25).text('Appointment Report', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).text(`Date Range: ${formatDate(start)} to ${formatDate(end)}`, { align: 'center' });
      if (status) {
        doc.text(`Status: ${status}`, { align: 'center' });
      }
      doc.moveDown();
      
      doc.fontSize(16).text(`Total Appointments: ${appointments.length}`, { align: 'center' });
      doc.moveDown();
      
      // Appointments by status
      doc.fontSize(14).text('Appointments by Status:', { underline: true });
      doc.moveDown(0.5);
      
      Object.entries(appointmentsByStatus).forEach(([status, count]) => {
        doc.fontSize(12).text(`${status}: ${count}`);
      });
      doc.moveDown();
      
      // Appointments by category
      doc.fontSize(14).text('Appointments by Service Category:', { underline: true });
      doc.moveDown(0.5);
      
      Object.entries(appointmentsByCategory).forEach(([category, count]) => {
        doc.fontSize(12).text(`${category}: ${count}`);
      });
      doc.moveDown();
      
      // Appointment table
      doc.fontSize(14).text('Appointment Details:', { underline: true });
      doc.moveDown(0.5);
      
      // Table headers
      const tableTop = doc.y;
      doc.fontSize(10)
        .text('Date', 50, tableTop)
        .text('Time', 130, tableTop)
        .text('Customer', 190, tableTop)
        .text('Service', 310, tableTop)
        .text('Status', 430, tableTop)
        .text('Lead', 500, tableTop);
      
      doc.moveDown();
      let y = doc.y;
      
      // Table rows
      appointments.forEach((appointment, i) => {
        const customerName = appointment.customer && appointment.customer.user ? appointment.customer.user.name : 'N/A';
        const serviceName = appointment.service ? appointment.service.name : 'N/A';
        const leadName = appointment.crew && appointment.crew.leadProfessional ? appointment.crew.leadProfessional.name : 'Unassigned';
        
        if (y > 700) { // Start a new page if near bottom
          doc.addPage();
          y = 50;
        }
        
        doc.fontSize(9)
          .text(formatDate(appointment.date), 50, y)
          .text(`${appointment.timeSlot.startTime}-${appointment.timeSlot.endTime}`, 130, y)
          .text(customerName, 190, y, { width: 110 })
          .text(serviceName, 310, y, { width: 110 })
          .text(appointment.status, 430, y)
          .text(leadName, 500, y, { width: 90 });
        
        y += 20;
      });
      
      // Finalize PDF
      doc.end();
    } else {
      // Default JSON response
      res.status(200).json({
        success: true,
        data: {
          dateRange: {
            start: formatDate(start),
            end: formatDate(end)
          },
          totalAppointments: appointments.length,
          appointmentsByStatus,
          appointmentsByCategory,
          appointments: appointments.map(appointment => ({
            id: appointment.id,
            date: formatDate(appointment.date),
            timeSlot: `${appointment.timeSlot.startTime}-${appointment.timeSlot.endTime}`,
            customer: appointment.customer && appointment.customer.user ? appointment.customer.user.name : 'N/A',
            customerPhone: appointment.customer && appointment.customer.user ? appointment.customer.user.phone : 'N/A',
            service: appointment.service ? appointment.service.name : 'N/A',
            category: appointment.service ? appointment.service.category : 'N/A',
            status: appointment.status,
            packageType: appointment.packageType,
            leadProfessional: appointment.crew && appointment.crew.leadProfessional ? appointment.crew.leadProfessional.name : 'Unassigned'
          }))
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Generate customer report
// @route   GET /api/v1/reports/customers
// @access  Private/Admin
exports.generateCustomerReport = asyncHandler(async (req, res, next) => {
  const { format, sort, limit } = req.query;
  const sortBy = sort || 'recent'; // Options: recent, revenue, appointments
  const limitNumber = parseInt(limit) || 50;

  try {
    // Get all customers with their users
    const customers = await Customer.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email', 'phone', 'createdAt']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get all appointments aggregated by customer
    const appointmentsByCustomer = await Appointment.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('COUNT', sequelize.where(sequelize.col('status'), 'Completed')), 'completed']
      ],
      where: {
        customerId: customers.map(c => c.id)
      },
      group: ['customerId']
    });

    // Get payment totals by customer
    const paymentsByCustomer = await Payment.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        customerId: customers.map(c => c.id),
        status: 'Completed'
      },
      group: ['customerId']
    });

    // Map appointments and payments to customers
    const customerData = customers.map(customer => {
      const customerAppointments = appointmentsByCustomer.find(
        a => a.customerId === customer.id
      ) || { count: 0, completed: 0 };
      
      const customerPayments = paymentsByCustomer.find(
        p => p.customerId === customer.id
      ) || { total: 0, count: 0 };
      
      return {
        customer,
        totalAppointments: customerAppointments.count,
        completedAppointments: customerAppointments.completed,
        totalSpent: customerPayments.total,
        paymentCount: customerPayments.count,
        customerSince: customer.user ? customer.user.createdAt : null
      };
    });

    // Sort data based on the requested sort option
    let sortedData = [...customerData];
    if (sortBy === 'revenue') {
      sortedData.sort((a, b) => b.totalSpent - a.totalSpent);
    } else if (sortBy === 'appointments') {
      sortedData.sort((a, b) => b.totalAppointments - a.totalAppointments);
    } // Default is already 'recent' by createdAt

    // Limit the number of results
    sortedData = sortedData.slice(0, limitNumber);

    if (format === 'pdf') {
      // Create PDF document
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `customer-report.pdf`;
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // Add content to PDF
      doc.fontSize(25).text('Customer Report', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).text(`Sorted by: ${sortBy === 'revenue' ? 'Total Revenue' : sortBy === 'appointments' ? 'Total Appointments' : 'Most Recent'}`, { align: 'center' });
      doc.fontSize(12).text(`Total Customers: ${customers.length}`, { align: 'center' });
      doc.moveDown();
      
      // Customer table
      doc.fontSize(14).text('Customer Details:', { underline: true });
      doc.moveDown(0.5);
      
      // Table headers
      const tableTop = doc.y;
      doc.fontSize(9)
        .text('Customer', 50, tableTop)
        .text('Contact', 170, tableTop)
        .text('Since', 270, tableTop)
        .text('Appointments', 330, tableTop)
        .text('Completed', 400, tableTop)
        .text('Total Spent', 470, tableTop);
      
      doc.moveDown();
      let y = doc.y;
      
      // Table rows
      sortedData.forEach((data) => {
        const customerName = data.customer.user ? data.customer.user.name : 'N/A';
        const customerContact = data.customer.user ? data.customer.user.email : 'N/A';
        const customerSince = data.customerSince ? formatDate(data.customerSince) : 'N/A';
        
        if (y > 700) { // Start a new page if near bottom
          doc.addPage();
          y = 50;
        }
        
        doc.fontSize(8)
          .text(customerName, 50, y, { width: 110 })
          .text(customerContact, 170, y, { width: 90 })
          .text(customerSince, 270, y)
          .text(data.totalAppointments.toString(), 345, y)
          .text(data.completedAppointments.toString(), 415, y)
          .text(formatCurrency(data.totalSpent), 470, y);
        
        y += 20;
      });
      
      // Finalize PDF
      doc.end();
    } else {
      // Default JSON response
      res.status(200).json({
        success: true,
        data: {
          totalCustomers: customers.length,
          sortBy,
          customers: sortedData.map(data => ({
            id: data.customer.id,
            name: data.customer.user ? data.customer.user.name : 'N/A',
            email: data.customer.user ? data.customer.user.email : 'N/A',
            phone: data.customer.user ? data.customer.user.phone : 'N/A',
            address: data.customer.address ? `${data.customer.address.street}, ${data.customer.address.city}, ${data.customer.address.state} ${data.customer.address.zipCode}` : 'N/A',
            customerSince: data.customerSince ? formatDate(data.customerSince) : 'N/A',
            totalAppointments: data.totalAppointments,
            completedAppointments: data.completedAppointments,
            totalSpent: data.totalSpent,
            paymentCount: data.paymentCount
          }))
        }
      });
    }
  } catch (error) {
    next(error);
  }
});
