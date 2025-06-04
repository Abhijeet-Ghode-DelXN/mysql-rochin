const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'dbjwofqrpk5edu', // Database name
  'u2sde6hhrcmxw',  // Username
  'u2sde6hhrcmxw', // Password
  {
    host: 'gcam1030.siteground.biz',
    port: 3306,
    dialect: 'mysql',
    dialectOptions: {
      connectTimeout: 60000, // 60 seconds timeout
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 60000, // 60 seconds
      idle: 10000
    },
    retry: {
      match: [
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/
      ],
      max: 3 // Retry 3 times
    },
    logging: console.log, // Enable detailed logging
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);

const connectDB = async () => {
  try {
    console.log('Attempting database connection with config:', {
      host: sequelize.config.host,
      port: sequelize.config.port,
      database: sequelize.config.database,
      username: sequelize.config.username
    });

    await sequelize.authenticate();
    console.log('✅ Database connection established!');

    if (process.env.NODE_ENV === 'development') {
      console.log('Syncing database models...');
      
      // Initialize models
      const models = require('../models');
      
      // First sync User model with alter: true to ensure schema matches
      console.log('Syncing User model with alter: true...');
      await models.User.sync({ alter: true });
      console.log('✅ User model synchronized');

      // Then sync other models with alter: false
      const modelNames = [
        'Announcement',
        'Customer',
        'Service',
        'Appointment',
        'Professional',
        'Estimate'
      ];

      for (const modelName of modelNames) {
        const Model = models[modelName];
        if (Model) {
          console.log(`Syncing ${modelName}...`);
          await Model.sync({ alter: false });
          console.log(`✅ ${modelName} synchronized`);
        }
      }

      console.log('✅ All models synchronized');

      // Test User model
      try {
        const testUser = await models.User.findOne();
        console.log('✅ User model test query successful');
      } catch (error) {
        console.error('❌ User model test query failed:', error);
      }

      // Test database connection
      try {
        await sequelize.query('SELECT 1+1 AS result');
        console.log('✅ Database connection test successful');
      } catch (error) {
        console.error('❌ Database connection test failed:', error);
      }
    }
  } catch (error) {
    console.error('❌ Connection failed:', {
      error: error.message,
      code: error.parent?.code,
      stack: error.stack
    });
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };