const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Course = sequelize.define('Course', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    external_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true // For tracking courses from external APIs
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    instructor: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    institution: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    course_type: {
      type: DataTypes.ENUM('course', 'webinar', 'tutorial', 'lecture', 'workshop', 'certification'),
      allowNull: false,
      defaultValue: 'course'
    },
    category: {
      type: DataTypes.ENUM(
        'trading', 'finance', 'cryptocurrency', 'mathematics', 'science', 'technology', 
        'programming', 'business', 'economics', 'english', 'history', 'arts', 
        'psychology', 'health', 'personal_development', 'other'
      ),
      allowNull: false,
      defaultValue: 'other'
    },
    subcategory: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    skill_level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
      allowNull: false,
      defaultValue: 'beginner'
    },
    duration_hours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    duration_weeks: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    language: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'en'
    },
    course_url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    video_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    thumbnail_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    platform: {
      type: DataTypes.ENUM('coursera', 'edx', 'khan_academy', 'youtube', 'udemy', 'futurelearn', 'mit_ocw', 'custom'),
      allowNull: false,
      defaultValue: 'custom'
    },
    is_free: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    has_certificate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 5
      }
    },
    enrollment_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    prerequisites: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    learning_objectives: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    topics_covered: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    registration_deadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    }
  }, {
    tableName: 'courses',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['category', 'skill_level']
      },
      {
        fields: ['course_type']
      },
      {
        fields: ['platform']
      },
      {
        fields: ['is_free']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['is_featured']
      },
      {
        fields: ['rating']
      },
      {
        fields: ['start_date']
      },
      {
        fields: ['category', 'is_active', 'is_free']
      }
    ]
  });

  // Instance methods
  Course.prototype.getTypeEmoji = function() {
    const emojiMap = {
      'course': '📚',
      'webinar': '🎥',
      'tutorial': '📖',
      'lecture': '🎓',
      'workshop': '🛠️',
      'certification': '🏆'
    };
    return emojiMap[this.course_type] || '📚';
  };

  Course.prototype.getCategoryEmoji = function() {
    const emojiMap = {
      'trading': '📈',
      'finance': '💰',
      'cryptocurrency': '₿',
      'mathematics': '🔢',
      'science': '🔬',
      'technology': '💻',
      'programming': '👨‍💻',
      'business': '💼',
      'economics': '📊',
      'english': '📝',
      'history': '📜',
      'arts': '🎨',
      'psychology': '🧠',
      'health': '🏥',
      'personal_development': '🌟',
      'other': '📋'
    };
    return emojiMap[this.category] || '📋';
  };

  Course.prototype.getSkillLevelEmoji = function() {
    const emojiMap = {
      'beginner': '🟢',
      'intermediate': '🟡',
      'advanced': '🟠',
      'expert': '🔴'
    };
    return emojiMap[this.skill_level] || '🟢';
  };

  Course.prototype.getPlatformEmoji = function() {
    const emojiMap = {
      'coursera': '🎓',
      'edx': '🏛️',
      'khan_academy': '📚',
      'youtube': '🎥',
      'udemy': '💡',
      'futurelearn': '🔮',
      'mit_ocw': '🏫',
      'custom': '🌐'
    };
    return emojiMap[this.platform] || '🌐';
  };

  Course.prototype.isUpcoming = function() {
    if (!this.start_date) return false;
    return new Date(this.start_date) > new Date();
  };

  Course.prototype.isActive = function() {
    const now = new Date();
    if (this.start_date && new Date(this.start_date) > now) return false;
    if (this.end_date && new Date(this.end_date) < now) return false;
    return this.is_active;
  };

  Course.prototype.getDurationString = function() {
    if (this.duration_hours && this.duration_weeks) {
      return `${this.duration_weeks} weeks (${this.duration_hours} hours total)`;
    } else if (this.duration_hours) {
      return `${this.duration_hours} hours`;
    } else if (this.duration_weeks) {
      return `${this.duration_weeks} weeks`;
    }
    return 'Self-paced';
  };

  Course.prototype.getFormattedRating = function() {
    if (!this.rating) return 'No rating';
    const stars = Math.round(this.rating);
    return '⭐'.repeat(stars) + ` (${this.rating})`;
  };

  return Course;
};