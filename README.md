# Landscaping Service Management API - MySQL Backend

This is the MySQL version of the Landscaping Service Management API, converted from the original MongoDB implementation.

## Overview

This backend uses:
- Express.js for the API framework
- Sequelize ORM for MySQL database interactions
- JWT for authentication
- Nodemailer for email sending
- Cloudinary for image uploads

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   NODE_ENV=development
   PORT=5000
   
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=landscaping_db
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   
   # Email Configuration
   EMAIL_SERVICE=smtp
   EMAIL_USERNAME=your_email@example.com
   EMAIL_PASSWORD=your_email_password
   EMAIL_FROM=noreply@example.com
   EMAIL_FROM_NAME=Landscaping Service
   
   # Frontend URL for email links
   FRONTEND_URL=http://localhost:3000
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
4. Start the server:
   ```
   npm run dev
   ```

## API Documentation

The API follows RESTful conventions and includes the following main endpoints:

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/updatedetails` - Update user details
- `PUT /api/v1/auth/updatepassword` - Update password
- `POST /api/v1/auth/forgotpassword` - Forgot password
- `PUT /api/v1/auth/resetpassword/:resettoken` - Reset password
- `GET /api/v1/auth/verify-email/:verificationToken` - Verify email

### Estimates
- `GET /api/v1/estimates` - Get all estimates (admin/professional)
- `GET /api/v1/estimates/:id` - Get single estimate
- `POST /api/v1/estimates` - Create new estimate (admin)
- `PUT /api/v1/estimates/:id` - Update estimate (admin)
- `DELETE /api/v1/estimates/:id` - Delete estimate (admin)
- `POST /api/v1/estimates/:id/photos` - Upload estimate photos
- `POST /api/v1/estimates/request` - Request estimate (customer)
- `GET /api/v1/estimates/my-estimates` - Get customer's estimates (customer)
- `PUT /api/v1/estimates/:id/approve` - Approve estimate (customer)

## Database Schema

The MySQL database uses the following main tables:
- Users
- Customers
- Services
- Estimates
- EstimatePackages
- EstimateLineItems
- EstimatePhotos
- Appointments
- Payments

## Conversion Notes

This backend was converted from a MongoDB implementation to MySQL using Sequelize ORM. Key conversion points include:
- MongoDB schemas converted to Sequelize models
- MongoDB population replaced with Sequelize associations and includes
- MongoDB queries converted to Sequelize queries
- MongoDB ObjectId references replaced with integer foreign keys
- MongoDB middleware replaced with Sequelize hooks

## License

[MIT](LICENSE)
