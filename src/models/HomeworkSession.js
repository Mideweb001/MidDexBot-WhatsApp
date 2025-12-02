const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HomeworkSession = sequelize.define('HomeworkSession', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // Association-based FK; explicit reference removed to avoid case issues on Postgres
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [10, 5000] // Minimum 10 characters, max 5000
      }
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 50]
      }
    },
    topic: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [2, 100]
      }
    },
    difficulty_level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
      allowNull: false,
      defaultValue: 'intermediate'
    },
    question_type: {
      type: DataTypes.ENUM('multiple_choice', 'short_answer', 'essay', 'problem_solving', 'calculation', 'analysis', 'other'),
      allowNull: false,
      defaultValue: 'other'
    },
    ai_response: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    step_by_step_solution: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    additional_resources: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    confidence_score: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 1
      }
    },
    processing_time_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'needs_clarification'),
      allowNull: false,
      defaultValue: 'pending'
    },
    feedback_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    feedback_comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    follow_up_questions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    related_homework_ids: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    study_group_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'study_groups',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    is_shared: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_favorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    time_spent_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    completion_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'homework_sessions',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['subject'] },
      { fields: ['topic'] },
      { fields: ['difficulty_level'] },
      { fields: ['question_type'] },
      { fields: ['status'] },
      { fields: ['study_group_id'] },
      { fields: ['is_shared'] },
      { fields: ['is_favorite'] },
      { fields: ['created_at'] },
      { fields: ['user_id', 'subject'] },
      { fields: ['user_id', 'status'] },
      { fields: ['subject', 'difficulty_level'] },
      { fields: ['feedback_rating'] }
    ]
  });

  // Instance methods
  HomeworkSession.prototype.isCompleted = function() {
    return this.status === 'completed' && this.completion_percentage >= 100;
  };

  HomeworkSession.prototype.needsClarification = function() {
    return this.status === 'needs_clarification';
  };

  HomeworkSession.prototype.addFollowUpQuestion = async function(question) {
    const followUps = this.follow_up_questions || [];
    followUps.push({
      question,
      timestamp: new Date(),
      answered: false
    });
    this.follow_up_questions = followUps;
    return await this.save();
  };

  HomeworkSession.prototype.markCompleted = async function() {
    this.status = 'completed';
    this.completion_percentage = 100;
    return await this.save();
  };

  HomeworkSession.prototype.addFeedback = async function(rating, comment = null) {
    this.feedback_rating = rating;
    this.feedback_comment = comment;
    return await this.save();
  };

  HomeworkSession.prototype.shareWithStudyGroup = async function(studyGroupId) {
    this.study_group_id = studyGroupId;
    this.is_shared = true;
    return await this.save();
  };

  HomeworkSession.prototype.toggleFavorite = async function() {
    this.is_favorite = !this.is_favorite;
    return await this.save();
  };

  HomeworkSession.prototype.getFormattedSolution = function() {
    if (!this.step_by_step_solution) return null;
    
    let formatted = '';
    const steps = this.step_by_step_solution;
    
    if (Array.isArray(steps)) {
      steps.forEach((step, index) => {
        formatted += `**Step ${index + 1}:** ${step}\n\n`;
      });
    } else if (typeof steps === 'object') {
      Object.entries(steps).forEach(([key, value]) => {
        formatted += `**${key}:** ${value}\n\n`;
      });
    }
    
    return formatted;
  };

  HomeworkSession.prototype.getDifficultyEmoji = function() {
    const emojis = {
      beginner: '🟢',
      intermediate: '🟡',
      advanced: '🟠',
      expert: '🔴'
    };
    return emojis[this.difficulty_level] || '⚪';
  };

  HomeworkSession.prototype.getSubjectEmoji = function() {
    const emojis = {
      'Mathematics': '📐',
      'Physics': '⚛️',
      'Chemistry': '🧪',
      'Biology': '🧬',
      'Computer Science': '💻',
      'Engineering': '⚙️',
      'History': '📚',
      'Literature': '📖',
      'Languages': '🗣️',
      'Economics': '💰',
      'Psychology': '🧠',
      'Philosophy': '🤔',
      'Art': '🎨',
      'Music': '🎵'
    };
    return emojis[this.subject] || '📝';
  };

  HomeworkSession.prototype.getEstimatedTime = function() {
    const timeByDifficulty = {
      beginner: 10,
      intermediate: 20,
      advanced: 35,
      expert: 60
    };
    return timeByDifficulty[this.difficulty_level] || 20;
  };

  return HomeworkSession;
};