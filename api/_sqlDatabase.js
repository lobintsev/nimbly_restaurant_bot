import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const databaseConfig = {
    database: process.env.POSTGRES_DATABASE,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST,  // No protocol
    dialect: 'postgres',
    port: parseInt(process.env.POSTGRES_PORT, 10),  // Integer not string
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