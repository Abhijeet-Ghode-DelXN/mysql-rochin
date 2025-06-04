const { User, setupAssociations: setupUserAssociations } = require('./user.model');
const { Customer, setupAssociations: setupCustomerAssociations } = require('./customer.model');
const CustomerPreferredDay = require('./customerPreferredDay.model');
const PropertyImage = require('./propertyImage.model');
const { Service, setupAssociations: setupServiceAssociations } = require('./service.model');
const ServicePackage = require('./servicePackage.model');
const ServiceFrequency = require('./serviceFrequency.model');
const ServiceDiscount = require('./serviceDiscount.model');
const { Appointment, setupAssociations: setupAppointmentAssociations } = require('./appointment.model');
const AppointmentCrew = require('./appointmentCrew.model');
const AppointmentPhoto = require('./appointmentPhoto.model');
const { Estimate, setupAssociations: setupEstimateAssociations } = require('./estimate.model');
const EstimateService = require('./estimateService.model');
const EstimatePhoto = require('./estimatePhoto.model');
const EstimatePackage = require('./estimatePackage.model');
const EstimateLineItem = require('./estimateLineItem.model');
const { Professional, setupAssociations: setupProfessionalAssociations } = require('./professional.model');
const { Announcement, setupAssociations: setupAnnouncementAssociations } = require('./announcement.model');

// Create an object with all models
const models = {
  User,
  Customer,
  CustomerPreferredDay,
  PropertyImage,
  Service,
  ServicePackage,
  ServiceFrequency,
  ServiceDiscount,
  Appointment,
  AppointmentCrew,
  AppointmentPhoto,
  Professional,
  Estimate,
  EstimateService,
  EstimatePhoto,
  EstimatePackage,
  EstimateLineItem,
  Announcement
};

// Set up all associations
const setupAssociations = () => {
  setupUserAssociations(models);
  setupCustomerAssociations(models);
  setupServiceAssociations(models);
  setupAppointmentAssociations(models);
  setupEstimateAssociations(models);
  setupProfessionalAssociations(models);
  setupAnnouncementAssociations(models);
};

setupAssociations();

module.exports = {
  ...models,
  setupAssociations
};
