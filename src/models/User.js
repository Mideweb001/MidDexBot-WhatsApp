const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    telegram_id: {
      type: DataTypes.BIGINT,
      unique: true,
      allowNull: false,
      index: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    language_code: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'en'
    },
    is_premium: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {
        notifications: true,
        study_reminders: true,
        default_language: 'en'
      }
    },
    last_active: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'users',
    indexes: [
      {
        unique: true,
        fields: ['telegram_id']
      }
    ]
  });

  return User;
};