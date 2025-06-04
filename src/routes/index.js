const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth.routes');
const estimateRoutes = require('./estimate.routes');
const serviceRoutes = require('./service.routes');
const customerRoutes = require('./customer.routes');
const appointmentRoutes = require('./appointment.routes');
const userRoutes = require('./user.routes');
const professionalRoutes = require('./professional.routes');
const announcementRoutes = require('./announcement.routes');
const businessSettingRoutes = require('./business-setting.routes');
const dashboardRoutes = require('./dashboard.routes');
const galleryRoutes = require('./gallery.routes');
const heroImageRoutes = require('./hero-image.routes');
const messageRoutes = require('./message.routes');
const paymentRoutes = require('./payment.routes');
const portfolioRoutes = require('./portfolio.routes');
const reportRoutes = require('./report.routes');
// Add other route imports as they are implemented

// API version prefix
const API_PREFIX = '/api/v1';

// Mount routes function - to be used in server.js
const mountRoutes = (app) => {
  // Core routes
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/estimates`, estimateRoutes);
  app.use(`${API_PREFIX}/services`, serviceRoutes);
  app.use(`${API_PREFIX}/customers`, customerRoutes);
  app.use(`${API_PREFIX}/appointments`, appointmentRoutes);
  app.use(`${API_PREFIX}/users`, userRoutes);
  app.use(`${API_PREFIX}/professionals`, professionalRoutes);
  app.use(`${API_PREFIX}/announcements`, announcementRoutes);
  app.use(`${API_PREFIX}/business-settings`, businessSettingRoutes);
  app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
  app.use(`${API_PREFIX}/gallery`, galleryRoutes);
  app.use(`${API_PREFIX}/hero-image`, heroImageRoutes);
  app.use(`${API_PREFIX}/message`, messageRoutes);
  app.use(`${API_PREFIX}/payments`, paymentRoutes);
  app.use(`${API_PREFIX}/portfolio`, portfolioRoutes);
  app.use(`${API_PREFIX}/reports`, reportRoutes);
  // Add other routes as they are implemented
  
  // Welcome route
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to the Landscaping Service Management API (MySQL Version)',
      apiDocumentation: `${req.protocol}://${req.get('host')}${API_PREFIX}/docs`,
    });
  });
};

module.exports = mountRoutes;
