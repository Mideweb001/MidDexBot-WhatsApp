const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProcessedImage = sequelize.define('ProcessedImage', {
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
    telegram_file_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    telegram_file_path: {
      type: DataTypes.STRING,
      allowNull: true
    },
    image_type: {
      type: DataTypes.STRING,
      allowNull: true // e.g., 'photo', 'document_scan', 'handwritten_note'
    },
    ocr_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ai_analysis: {
      type: DataTypes.JSON,
      allowNull: true
    },
    confidence_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 1
      }
    },
    processing_status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    generated_pdf_path: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'processed_images',
    indexes: [
      {
        fields: ['user_id', 'created_at']
      },
      {
        fields: ['processing_status']
      },
      {
        fields: ['telegram_file_id']
      }
    ]
  });

  return ProcessedImage;
};