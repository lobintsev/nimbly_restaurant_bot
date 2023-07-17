import { DataTypes } from 'sequelize';
import sequelize from '../api/sqlDatabase.js';

const Message = sequelize.define('Message', {
  chatId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {});

export default Message;