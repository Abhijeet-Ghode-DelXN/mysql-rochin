const { sequelize } = require('../src/config/db');
const models = require('../src/models');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  try {
    console.log('Starting admin user seeding...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Sync models
    console.log('Syncing models...');
    await sequelize.sync({ alter: true });
    console.log('✅ Models synchronized');

    // Models are initialized when `../src/models` is required (due to models/index.js).
    // No need to call models.setupAssociations() again here.

    // Check if admin user already exists
    console.log('Checking for existing admin user...');
    const existingAdmin = await models.User.findOne({
      where: {
        email: process.env.ADMIN_EMAIL || 'admin@example.com'
      }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists. Updating password and ensuring details are correct...');
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
      console.log(`Setting plain text password for ${process.env.ADMIN_EMAIL || 'admin@example.com'} to: [${adminPassword}]. The model's hook will hash it.`);
      existingAdmin.password = adminPassword;
      existingAdmin.name = existingAdmin.name || 'System Admin'; // Ensure name is set
      existingAdmin.role = 'admin'; // Ensure role is admin
      existingAdmin.active = true; // Ensure user is active

      await existingAdmin.save();
      console.log('✅ Admin user password and details updated successfully');
      console.log('Updated admin user details:', existingAdmin.toJSON());
      process.exit(0);
    }

    // Create admin user
    console.log('Creating new admin user...');
    const password = process.env.ADMIN_PASSWORD || 'Admin@123';
    console.log(`Using password: ${password}`);
    
    const salt = await bcrypt.genSalt(10);
    console.log('Generated salt');
    
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Password hashed successfully');

    const admin = await models.User.create({
      name: 'System Admin',
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      active: true,
      emailVerified: true
    });

    console.log('✅ Admin user created successfully');
    console.log('Admin user details:', admin);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedAdmin();
