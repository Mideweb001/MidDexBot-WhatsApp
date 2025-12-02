const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Conversation = sequelize.define('Conversation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // FK handled via association; removed explicit reference to avoid case issues
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    conversation_type: {
      type: DataTypes.ENUM('document_analysis', 'study_session', 'research', 'homework_help', 'general'),
      defaultValue: 'general'
    },
    context_data: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    current_state: {
      type: DataTypes.STRING,
      allowNull: true // e.g., 'awaiting_document', 'processing', 'completed'
    },
    last_document_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // Association-based FK; removed explicit reference (documents)
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    session_data: {
      type: DataTypes.JSON,
      defaultValue: {} // Store temporary session variables
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'conversations',
    indexes: [
      {
        fields: ['user_id', 'is_active']
      },
      {
        fields: ['conversation_type']
      }
    ]
  });

  return Conversation;
};