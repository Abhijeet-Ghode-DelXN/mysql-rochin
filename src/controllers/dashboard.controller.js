const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { sequelize } = require('../config/db');
const {
  Appointment,
  Estimate,
  Payment,
  Customer,
  Service,
  User,
  Professional
} = require('../models');

// @desc    Get dashboard stats
// @route   GET /api/v1/dashboard
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Get counts
    const [appointmentCount, estimateCount, customerCount, serviceCount, paymentCount, userCount, professionalCount] = 
      await Promise.all([
        Appointment.count({ transaction }),
        Estimate.count({ transaction }),
        Customer.count({ transaction }),
        Service.count({ transaction }),
        Payment.count({ transaction }),
        User.count({ transaction }),
        Professional.count({ transaction })
      ]);

    // Get upcoming appointments (next 7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const upcomingAppointments = await Appointment.findAll({
      where: {
        date: {
          [sequelize.Op.between]: [today, nextWeek]
        }
      },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name']
        },
        {
          model: Service,
          as: 'service',
          attributes: ['id', 'name']
        }
      ],
      order: [['date', 'ASC']],
      limit: 5,
      transaction
    });

    // Get pending estimates
    const pendingEstimates = await Estimate.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name']
        }
      ],
      limit: 5,
      transaction
    });

    // Get recent payments
    const recentPayments = await Payment.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name']
        }
      ],
      limit: 5,
      transaction
    });

    // Get monthly revenue - last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);

    const monthlyRevenue = await Payment.findAll({
      where: {
        createdAt: {
          [sequelize.Op.gte]: sixMonthsAgo
        },
        status: 'completed'
      },
      attributes: [
        [sequelize.fn('EXTRACT', sequelize.col('YEAR'), sequelize.col('createdAt')), 'year'],
        [sequelize.fn('EXTRACT', sequelize.col('MONTH'), sequelize.col('createdAt')), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['year', 'month'],
      order: [['year', 'ASC'], ['month', 'ASC']],
      transaction
    });

    // Get service distribution
    const serviceDistribution = await Appointment.findAll({
      attributes: [
        [sequelize.fn('EXTRACT', sequelize.col('YEAR'), sequelize.col('createdAt')), 'year'],
        [sequelize.fn('EXTRACT', sequelize.col('MONTH'), sequelize.col('createdAt')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['year', 'month'],
      order: [['year', 'ASC'], ['month', 'ASC']],
      transaction
    });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {
        counts: {
          appointments: appointmentCount,
          estimates: estimateCount,
          customers: customerCount,
          services: serviceCount,
          payments: paymentCount,
          users: userCount,
          professionals: professionalCount
        },
        upcomingAppointments,
        pendingEstimates,
        recentPayments,
        monthlyRevenue,
        serviceDistribution
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get appointment analytics
// @route   GET /api/v1/dashboard/appointments
// @access  Private/Admin
exports.getAppointmentAnalytics = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Get appointments by status
    const appointmentsByStatus = await Appointment.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      transaction
    });

    // Get appointments by day of week
    const appointmentsByDayOfWeek = await Appointment.findAll({
      attributes: [
        [sequelize.fn('EXTRACT', sequelize.col('DAYOFWEEK'), sequelize.col('date')), 'dayOfWeek'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['dayOfWeek'],
      order: [['dayOfWeek', 'ASC']],
      transaction
    });

    // Get appointment completion rate
    const [totalAppointments, completedAppointments] = await Promise.all([
      Appointment.count({ transaction }),
      Appointment.count({
        where: { status: 'completed' },
        transaction
      })
    ]);

    const completionRate = totalAppointments > 0 
      ? (completedAppointments / totalAppointments) * 100 
      : 0;

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {
        appointmentsByStatus,
        appointmentsByDayOfWeek,
        completionRate: Math.round(completionRate * 100) / 100
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get revenue analytics
// @route   GET /api/v1/dashboard/revenue
// @access  Private/Admin
exports.getRevenueAnalytics = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Get total revenue
    const totalRevenue = await Payment.findAll({
      where: { status: 'completed' },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      transaction
    });

    // Get revenue by service category
    const revenueByServiceCategory = await Payment.findAll({
      where: { status: 'completed' },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            {
              model: Service,
              as: 'service',
              attributes: ['category']
            }
          ]
        }
      ],
      attributes: [
        [sequelize.col('appointment.service.category'), 'category'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['category'],
      order: [['total', 'DESC']],
      transaction
    });

    // Get revenue by month (current year)
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const revenueByMonth = await Payment.findAll({
      where: {
        createdAt: {
          [sequelize.Op.gte]: startOfYear
        },
        status: 'completed'
      },
      attributes: [
        [sequelize.fn('EXTRACT', sequelize.col('MONTH'), sequelize.col('createdAt')), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['month'],
      order: [['month', 'ASC']],
      transaction
    });

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        revenueByServiceCategory,
        revenueByMonth
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get customer analytics
// @route   GET /api/v1/dashboard/customers
// @access  Private/Admin
exports.getCustomerAnalytics = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Customer growth by month
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);

    const customerGrowth = await Customer.findAll({
      where: {
        createdAt: {
          [sequelize.Op.gte]: sixMonthsAgo
        }
      },
      attributes: [
        [sequelize.fn('EXTRACT', sequelize.col('YEAR'), sequelize.col('createdAt')), 'year'],
        [sequelize.fn('EXTRACT', sequelize.col('MONTH'), sequelize.col('createdAt')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['year', 'month'],
      order: [['year', 'ASC'], ['month', 'ASC']],
      transaction
    });

    // Top customers by revenue
    const topCustomers = await Payment.findAll({
      where: { status: 'completed' },
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
        }
      ],
      attributes: [
        [sequelize.col('customer.id'), 'customerId'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalSpent'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'paymentCount']
      ],
      group: ['customerId'],
      order: [['totalSpent', 'DESC']],
      limit: 10,
      transaction
    });

    // Customer retention rate
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Customers with appointments in last 30 days
    const recentCustomers = await Appointment.findAll({
      where: {
        date: {
          [sequelize.Op.gte]: thirtyDaysAgo
        }
      },
      attributes: ['customerId'],
      distinct: true,
      transaction
    });

    // Customers with appointments between 30-60 days ago
    const previousPeriodCustomers = await Appointment.findAll({
      where: {
        date: {
          [sequelize.Op.gte]: sixtyDaysAgo,
          [sequelize.Op.lt]: thirtyDaysAgo
        }
      },
      attributes: ['customerId'],
      distinct: true,
      transaction
    });

    // Count how many previous customers returned
    const returningCustomers = previousPeriodCustomers.filter(
      prevCustomer => recentCustomers.some(
        recentCustomer => recentCustomer.customerId === prevCustomer.customerId
      )
    ).length;

    const retentionRate = previousPeriodCustomers.length > 0 
      ? (returningCustomers / previousPeriodCustomers.length) * 100
      : 0;

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {
        customerGrowth,
        topCustomers,
        retentionRate: Math.round(retentionRate * 100) / 100
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});
