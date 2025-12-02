const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StudyGroup = sequelize.define('StudyGroup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    creator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // Association-based FK; explicit reference removed to avoid case issues on Postgres
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [3, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 50]
      }
    },
    interests: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [2, 100]
      }
    },
    location_type: {
      type: DataTypes.ENUM('online', 'in-person', 'hybrid'),
      allowNull: false,
      defaultValue: 'online'
    },
    max_members: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 2,
        max: 50
      }
    },
    current_members: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    study_level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'mixed'),
      allowNull: false,
      defaultValue: 'mixed'
    },
    meeting_schedule: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'UTC'
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'en'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    join_code: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    rules: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    next_meeting: {
      type: DataTypes.DATE,
      allowNull: true
    },
    meeting_link: {
      type: DataTypes.STRING,
      allowNull: true
    },
    achievements: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    study_goals: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'study_groups',
    indexes: [
      { fields: ['creator_id'] },
      { fields: ['subject'] },
      { fields: ['location'] },
      { fields: ['location_type'] },
      { fields: ['study_level'] },
      { fields: ['is_active'] },
      { fields: ['is_public'] },
      { fields: ['join_code'], unique: true },
      { fields: ['subject', 'location'] },
      { fields: ['is_active', 'is_public'] }
    ],
    hooks: {
      beforeCreate: async (studyGroup) => {
        // Generate unique join code
        if (!studyGroup.join_code) {
          studyGroup.join_code = generateJoinCode();
        }
      }
    }
  });

  // Instance methods
  StudyGroup.prototype.isFull = function() {
    return this.current_members >= this.max_members;
  };

  StudyGroup.prototype.hasSpace = function() {
    return this.current_members < this.max_members;
  };

  StudyGroup.prototype.getAvailableSpots = function() {
    return Math.max(0, this.max_members - this.current_members);
  };

  StudyGroup.prototype.canUserJoin = function(userId) {
    return this.is_active && this.hasSpace() && this.creator_id !== userId;
  };

  StudyGroup.prototype.addMember = async function() {
    this.current_members += 1;
    return await this.save();
  };

  StudyGroup.prototype.removeMember = async function() {
    this.current_members = Math.max(0, this.current_members - 1);
    return await this.save();
  };

  StudyGroup.prototype.getMatchingScore = function(userPreferences) {
    let score = 0;
    const weights = {
      subject: 40,
      interests: 25,
      location: 20,
      level: 10,
      language: 5
    };

    // Subject match
    if (userPreferences.subjects && userPreferences.subjects.includes(this.subject)) {
      score += weights.subject;
    }

    // Interest overlap
    if (userPreferences.interests && this.interests) {
      const userInterests = userPreferences.interests || [];
      const groupInterests = this.interests || [];
      const commonInterests = userInterests.filter(interest => 
        groupInterests.some(gi => gi.toLowerCase().includes(interest.toLowerCase()))
      );
      const interestScore = (commonInterests.length / Math.max(userInterests.length, 1)) * weights.interests;
      score += interestScore;
    }

    // Location match
    if (userPreferences.location && this.location) {
      if (this.location_type === 'online' || 
          userPreferences.location.toLowerCase() === this.location.toLowerCase()) {
        score += weights.location;
      }
    }

    // Study level compatibility
    if (userPreferences.study_level) {
      if (this.study_level === 'mixed' || this.study_level === userPreferences.study_level) {
        score += weights.level;
      }
    }

    // Language match
    if (userPreferences.language === this.language) {
      score += weights.language;
    }

    return Math.round(score);
  };

  return StudyGroup;
};

// Helper function to generate join codes
function generateJoinCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}