import { DataTypes } from 'sequelize';
import sequelize from '../api/sqlDatabase.js';

const User = sequelize.define('User', {
chatId: {
    type: DataTypes.BIGINT, // Updated data type
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  }
}, {});

export default User;