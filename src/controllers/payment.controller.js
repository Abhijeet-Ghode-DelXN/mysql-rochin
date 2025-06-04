const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const { sequelize } = require('../config/db');
const {
  Payment,
  Appointment,
  Estimate,
  Customer,
  User
} = require('../models');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Get all payments
// @route   GET /api/v1/payments
// @access  Private/Admin
exports.getPayments = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const payments = await Payment.findAll({
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
          model: Appointment,
          as: 'appointment',
          include: [
            {
              model: Service,
              as: 'service',
              attributes: ['name']
            }
          ]
        },
        {
          model: Estimate,
          as: 'estimate',
          attributes: ['estimateNumber']
        },
        {
          model: User,
          as: 'processedBy',
          attributes: ['name']
        }
      ],
      order: [['createdAt', 'DESC']],
      transaction
    });

    await transaction.commit();

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get single payment
// @route   GET /api/v1/payments/:id
// @access  Private
exports.getPayment = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const payment = await Payment.findOne({
      where: { id: req.params.id },
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
          model: Appointment,
          as: 'appointment',
          include: [
            {
              model: Service,
              as: 'service',
              attributes: ['name']
            }
          ]
        },
        {
          model: Estimate,
          as: 'estimate',
          attributes: ['estimateNumber']
        },
        {
          model: User,
          as: 'processedBy',
          attributes: ['name']
        }
      ],
      transaction
    });

    if (!payment) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user is authorized to view
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({
        where: { userId: req.user.id },
        transaction
      });
      
      if (!customer || payment.customerId !== customer.id) {
        await transaction.rollback();
        return next(
          new ErrorResponse(`Not authorized to view this payment`, 403)
        );
      }
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Process payment with Stripe
// @route   POST /api/v1/payments/process
// @access  Private
exports.processPayment = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { 
      amount, 
      paymentType, 
      cardToken, 
      customerId, 
      appointmentId, 
      estimateId,
      billingAddress
    } = req.body;

    if (!amount || !paymentType || !cardToken) {
      await transaction.rollback();
      return next(
        new ErrorResponse('Please provide amount, payment type, and card token', 400)
      );
    }

    if (!customerId && req.user.role !== 'customer') {
      await transaction.rollback();
      return next(
        new ErrorResponse('Customer ID is required', 400)
      );
    }

    // If user is customer, get their customer ID
    let customer;
    if (req.user.role === 'customer') {
      customer = await Customer.findOne({
        where: { userId: req.user.id },
        transaction
      });
      if (!customer) {
        await transaction.rollback();
        return next(new ErrorResponse('Customer profile not found', 404));
      }
    } else {
      customer = await Customer.findByPk(customerId, { transaction });
      if (!customer) {
        await transaction.rollback();
        return next(
          new ErrorResponse(`Customer not found with id of ${customerId}`, 404)
        );
      }
    }

    // Check if paying for appointment or estimate
    if (appointmentId) {
      const appointment = await Appointment.findByPk(appointmentId, { transaction });
      if (!appointment) {
        await transaction.rollback();
        return next(
          new ErrorResponse(`Appointment not found with id of ${appointmentId}`, 404)
        );
      }
    } else if (estimateId) {
      const estimate = await Estimate.findByPk(estimateId, { transaction });
      if (!estimate) {
        await transaction.rollback();
        return next(
          new ErrorResponse(`Estimate not found with id of ${estimateId}`, 404)
        );
      }
    }

    // Create a charge using Stripe
    try {
      const customerUser = await User.findByPk(customer.userId, { transaction });
      
      // Process payment with Stripe
      const charge = await stripe.charges.create({
        amount: amount * 100, // Stripe requires cents
        currency: 'usd',
        source: cardToken,
        description: `Payment for ${paymentType} - Customer: ${customerUser.name}`,
        receipt_email: customerUser.email,
        metadata: {
          customer_id: customer.id,
          customer_name: customerUser.name,
          payment_type: paymentType,
          appointment_id: appointmentId || 'N/A',
          estimate_id: estimateId || 'N/A'
        }
      });

      // Create payment record
      const payment = await Payment.create({
        customerId: customer.id,
        appointmentId: appointmentId || null,
        estimateId: estimateId || null,
        paymentType,
        amount,
        status: 'Completed',
        method: 'Credit Card',
        currency: 'USD',
        gateway: 'Stripe',
        gatewayTransactionId: charge.id,
        receiptUrl: charge.receipt_url,
        billingAddress,
        cardDetails: {
          lastFour: charge.payment_method_details.card.last4,
          brand: charge.payment_method_details.card.brand,
          expiryMonth: charge.payment_method_details.card.exp_month,
          expiryYear: charge.payment_method_details.card.exp_year
        },
        processedById: req.user.id
      }, { transaction });

      // Update appointment or estimate payment status
      if (appointmentId) {
        await Appointment.update(
          {
            'payment.status': 'Paid',
            'payment.amount': amount,
            'payment.transactionId': charge.id,
            'payment.paymentDate': new Date()
          },
          { where: { id: appointmentId }, transaction }
        );
      } else if (estimateId && paymentType === 'Deposit') {
        await Estimate.update(
          {
            'deposit.amount': amount,
            'deposit.paymentId': payment.id,
            'deposit.paidOn': new Date()
          },
          { where: { id: estimateId }, transaction }
        );
      }

      // Send confirmation email
      try {
        await sendEmail({
          email: customerUser.email,
          subject: 'Payment Confirmation',
          message: `Thank you for your payment of $${amount} for ${paymentType}. Your transaction ID is ${charge.id}. A receipt has been sent to your email.`
        });
      } catch (err) {
        console.log('Email notification failed:', err);
      }

      await transaction.commit();

      res.status(200).json({
        success: true,
        data: payment
      });
    } catch (err) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Payment processing failed: ${err.message}`, 500)
      );
    }
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Create manual payment (Admin)
// @route   POST /api/v1/payments/manual
// @access  Private/Admin
exports.createManualPayment = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { 
      customerId, 
      appointmentId, 
      estimateId, 
      paymentType, 
      amount, 
      method,
      notes 
    } = req.body;

    if (!customerId || !paymentType || !amount || !method) {
      await transaction.rollback();
      return next(
        new ErrorResponse('Please provide customer ID, payment type, amount, and method', 400)
      );
    }

    // Check if customer exists
    const customer = await Customer.findByPk(customerId, { transaction });
    if (!customer) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Customer not found with id of ${customerId}`, 404)
      );
    }

    // Create payment record
    const payment = await Payment.create({
      customerId,
      appointmentId: appointmentId || null,
      estimateId: estimateId || null,
      paymentType,
      amount,
      status: 'Completed',
      method,
      currency: 'USD',
      gateway: 'Manual',
      notes,
      processedById: req.user.id
    }, { transaction });

    // Update appointment or estimate payment status
    if (appointmentId) {
      await Appointment.update(
        {
          'payment.status': 'Paid',
          'payment.amount': amount,
          'payment.paymentMethod': method,
          'payment.paymentDate': new Date()
        },
        { where: { id: appointmentId }, transaction }
      );
    } else if (estimateId && paymentType === 'Deposit') {
      await Estimate.update(
        {
          'deposit.amount': amount,
          'deposit.paymentId': payment.id,
          'deposit.paidOn': new Date()
        },
        { where: { id: estimateId }, transaction }
      );
    }

    // Send confirmation email
    try {
      const customerUser = await User.findByPk(customer.userId, { transaction });
      if (customerUser && customerUser.email) {
        await sendEmail({
          email: customerUser.email,
          subject: 'Payment Received',
          message: `We have received your payment of $${amount} for ${paymentType}. Thank you for your business.`
        });
      }
    } catch (err) {
      console.log('Email notification failed:', err);
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Get receipt
// @route   GET /api/v1/payments/:id/receipt
// @access  Private
exports.getReceipt = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const payment = await Payment.findOne({
      where: { id: req.params.id },
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
          attributes: ['date', 'timeSlot'],
          include: [
            {
              model: Service,
              as: 'service',
              attributes: ['name']
            }
          ]
        },
        {
          model: Estimate,
          as: 'estimate',
          attributes: ['estimateNumber']
        },
        {
          model: User,
          as: 'processedBy',
          attributes: ['name']
        }
      ],
      transaction
    });

    if (!payment) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user is authorized to view
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({
        where: { userId: req.user.id },
        transaction
      });
      
      if (!customer || payment.customerId !== customer.id) {
        await transaction.rollback();
        return next(
          new ErrorResponse(`Not authorized to view this receipt`, 403)
        );
      }
    }

    // Generate PDF receipt
    const pdfBuffer = await generatePDF(payment);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.id}.pdf`);

    // Send PDF
    res.send(pdfBuffer);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Process refund
// @route   POST /api/v1/payments/:id/refund
// @access  Private/Admin
exports.processRefund = asyncHandler(async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { amount, reason } = req.body;

    const payment = await Payment.findByPk(req.params.id, { transaction });

    if (!payment) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
      );
    }

    if (payment.status === 'Refunded') {
      await transaction.rollback();
      return next(
        new ErrorResponse('This payment has already been refunded', 400)
      );
    }

    // If no amount provided, refund full amount
    const refundAmount = amount || payment.amount;

    try {
      // Process refund with Stripe if it was a Stripe payment
      let stripeRefund;
      if (payment.gateway === 'Stripe' && payment.gatewayTransactionId) {
        stripeRefund = await stripe.refunds.create({
          charge: payment.gatewayTransactionId,
          amount: refundAmount * 100, // Stripe requires cents
          reason: 'requested_by_customer'
        });
      }

      // Update payment record
      payment.status = refundAmount === payment.amount ? 'Refunded' : 'Partially Refunded';
      payment.refund = {
        amount: refundAmount,
        reason: reason || 'Customer requested refund',
        refundedAt: new Date(),
        refundTransactionId: stripeRefund ? stripeRefund.id : null
      };

      await payment.save({ transaction });

      // Update appointment payment status if applicable
      if (payment.appointmentId) {
        await Appointment.update(
          {
            'payment.status': payment.status
          },
          { where: { id: payment.appointmentId }, transaction }
        );
      }

      // Notify customer
      try {
        const customer = await Customer.findByPk(payment.customerId, {
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['email']
            }
          ],
          transaction
        });
        
        if (customer && customer.user.email) {
          await sendEmail({
            email: customer.user.email,
            subject: 'Refund Processed',
            message: `Your refund of $${refundAmount} has been processed. Reason: ${reason || 'Customer requested refund'}. Please allow 5-7 business days for the funds to appear in your account.`
          });
        }
      } catch (err) {
        console.log('Email notification failed:', err);
      }

      await transaction.commit();

      res.status(200).json({
        success: true,
        data: payment
      });
    } catch (err) {
      await transaction.rollback();
      return next(
        new ErrorResponse(`Refund processing failed: ${err.message}`, 500)
      );
    }
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});
