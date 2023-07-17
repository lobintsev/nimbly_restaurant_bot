import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();
const databaseConfig = {
    database: process.env.DB,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,  // No protocol
    dialect: process.env.DB_DIALECT,
    port: process.env.DB_PORT,  // Integer not string
    dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // <<<<<<< YOU NEED THIS TO FIX YOUR ISSUE
        }
      }
  };
  console.log(databaseConfig);
const sequelize = new Sequelize(databaseConfig);

export default sequelize;