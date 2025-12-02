const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserCourse = sequelize.define('UserCourse', {
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
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    enrollment_status: {
      type: DataTypes.ENUM('enrolled', 'in_progress', 'completed', 'dropped', 'wishlist'),
      allowNull: false,
      defaultValue: 'enrolled'
    },
    enrollment_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completion_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    progress_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    time_spent_hours: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0
    },
    last_accessed: {
      type: DataTypes.DATE,
      allowNull: true
    },
    current_module: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    current_lesson: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    completed_modules: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    quiz_scores: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    assignments_completed: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    personal_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    personal_review: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_favorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    reminder_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    study_schedule: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {} // {days: ['monday', 'wednesday'], time: '19:00'}
    },
    certificate_earned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    certificate_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    skills_learned: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    learning_goals: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    }
  }, {
    tableName: 'user_courses',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['user_id', 'enrollment_status']
      },
      {
        fields: ['course_id']
      },
      {
        fields: ['enrollment_status']
      },
      {
        fields: ['progress_percentage']
      },
      {
        fields: ['is_favorite']
      },
      {
        fields: ['last_accessed']
      },
      {
        fields: ['completion_date']
      },
      {
        unique: true,
        fields: ['user_id', 'course_id']
      }
    ]
  });

  // Instance methods
  UserCourse.prototype.getProgressEmoji = function() {
    const progress = this.progress_percentage;
    if (progress === 0) return '⚪';
    if (progress < 25) return '🔴';
    if (progress < 50) return '🟠';
    if (progress < 75) return '🟡';
    if (progress < 100) return '🔵';
    return '🟢';
  };

  UserCourse.prototype.getStatusEmoji = function() {
    const emojiMap = {
      'enrolled': '📝',
      'in_progress': '📖',
      'completed': '✅',
      'dropped': '❌',
      'wishlist': '⭐'
    };
    return emojiMap[this.enrollment_status] || '📝';
  };

  UserCourse.prototype.getProgressBar = function(length = 10) {
    const filled = Math.round((this.progress_percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  };

  UserCourse.prototype.getDaysEnrolled = function() {
    const enrollmentDate = new Date(this.enrollment_date);
    const now = new Date();
    const diffTime = Math.abs(now - enrollmentDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  UserCourse.prototype.getEstimatedCompletion = function() {
    if (this.progress_percentage === 0) return null;
    
    const daysEnrolled = this.getDaysEnrolled();
    const progressRate = this.progress_percentage / daysEnrolled;
    const remainingProgress = 100 - this.progress_percentage;
    const estimatedDays = Math.ceil(remainingProgress / progressRate);
    
    return estimatedDays;
  };

  UserCourse.prototype.markCompleted = function() {
    this.enrollment_status = 'completed';
    this.progress_percentage = 100;
    this.completion_date = new Date();
    return this.save();
  };

  UserCourse.prototype.updateProgress = function(percentage, moduleCompleted = null) {
    this.progress_percentage = Math.min(percentage, 100);
    this.last_accessed = new Date();
    
    if (moduleCompleted && !this.completed_modules.includes(moduleCompleted)) {
      this.completed_modules.push(moduleCompleted);
    }
    
    if (this.progress_percentage === 100 && this.enrollment_status !== 'completed') {
      this.enrollment_status = 'completed';
      this.completion_date = new Date();
    } else if (this.progress_percentage > 0 && this.enrollment_status === 'enrolled') {
      this.enrollment_status = 'in_progress';
      this.start_date = new Date();
    }
    
    return this.save();
  };

  return UserCourse;
};