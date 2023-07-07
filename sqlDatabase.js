import { Sequelize } from 'sequelize';
import databaseConfig from './databaseСonfiguration.js';

const sequelize = new Sequelize(databaseConfig);

export default sequelize;