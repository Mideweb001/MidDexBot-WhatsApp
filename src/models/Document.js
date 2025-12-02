const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
      // FK enforced via association in models/index.js; explicit references removed to avoid casing issues on Postgres
    },
    telegram_file_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: true
    },
    file_type: {
      type: DataTypes.ENUM('pdf', 'image', 'document', 'text'),
      allowNull: false
    },
    document_type: {
      type: DataTypes.STRING,
      allowNull: true // e.g., 'Resume/CV', 'Cover Letter', 'General Document'
    },
    extracted_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ai_analysis: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ats_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    processing_status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    word_count: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'documents',
    indexes: [
      {
        fields: ['user_id', 'created_at']
      },
      {
        fields: ['document_type']
      },
      {
        fields: ['processing_status']
      }
    ]
  });

  return Document;
};