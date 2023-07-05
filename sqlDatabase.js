import { Sequelize } from 'sequelize';
import databaseConfig from './databaseConfig.js';

const sequelize = new Sequelize(databaseConfig);

export default sequelize;