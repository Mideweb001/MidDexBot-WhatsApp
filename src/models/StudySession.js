const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StudySession = sequelize.define('StudySession', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
      // Association-based FK; removed explicit reference (users)
    },
    session_type: {
      type: DataTypes.ENUM('research', 'notes', 'homework', 'study_plan', 'timer'),
      allowNull: false
    },
    topic: {
      type: DataTypes.STRING,
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ai_generated_content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'paused', 'cancelled'),
      defaultValue: 'active'
    },
    study_plan_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    notes_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    research_query: {
      type: DataTypes.STRING,
      allowNull: true
    },
    homework_subject: {
      type: DataTypes.STRING,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'study_sessions',
    indexes: [
      {
        fields: ['user_id', 'session_type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return StudySession;
};