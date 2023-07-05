import sequelize from './sqlDatabase.js';
import BOT from './bot.js';  // Import your bot from its module

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    await sequelize.sync();
    console.log('Database synchronized successfully.');

    BOT.launch();  // Start your bot here
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
})();