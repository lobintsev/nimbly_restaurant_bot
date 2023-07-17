import sequelize from './api/sqlDatabase.js';
import BOT from './api/bot.js';  // Import your bot from its module
import dotenv from 'dotenv';
dotenv.config();

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    await sequelize.sync();
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
})();