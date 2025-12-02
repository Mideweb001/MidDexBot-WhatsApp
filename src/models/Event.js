const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Event = sequelize.define('Event', {
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    event_type: {
      type: DataTypes.ENUM('exam', 'assignment', 'project', 'presentation', 'quiz', 'deadline', 'meeting', 'other'),
      allowNull: false,
      defaultValue: 'exam'
    },
    subject: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    event_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium'
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    completion_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reminder_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    reminder_intervals: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['1_week', '3_days', '1_day', '2_hours'] // When to send reminders before event
    },
    last_reminder_sent: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reminder_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    study_time_allocated: {
      type: DataTypes.INTEGER, // minutes
      allowNull: true
    },
    study_time_spent: {
      type: DataTypes.INTEGER, // minutes
      allowNull: false,
      defaultValue: 0
    },
    preparation_status: {
      type: DataTypes.ENUM('not_started', 'in_progress', 'well_prepared', 'ready'),
      allowNull: false,
      defaultValue: 'not_started'
    },
    stress_level: {
      type: DataTypes.INTEGER, // 1-5 scale
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    expected_duration: {
      type: DataTypes.INTEGER, // minutes for exam/presentation
      allowNull: true
    },
    related_homework_ids: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [] // Array of homework session IDs
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
    recurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    recurring_pattern: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'custom'),
      allowNull: true
    },
    recurring_end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    parent_event_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'events',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  }, {
    tableName: 'events',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['user_id', 'event_date']
      },
      {
        fields: ['event_type']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['is_completed']
      },
      {
        fields: ['reminder_enabled']
      },
      {
        fields: ['subject']
      },
      {
        fields: ['user_id', 'is_completed', 'event_date']
      },
      {
        fields: ['study_group_id']
      }
    ]
  });

  // Instance methods
  Event.prototype.getDaysUntil = function() {
    const now = new Date();
    const eventDate = new Date(this.event_date);
    const diffTime = eventDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  Event.prototype.getTimeUntil = function() {
    const now = new Date();
    const eventDate = new Date(this.event_date);
    const diffTime = eventDate - now;
    
    if (diffTime < 0) {
      return { expired: true, message: 'Event has passed' };
    }

    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, expired: false };
  };

  Event.prototype.getFormattedCountdown = function() {
    const timeUntil = this.getTimeUntil();
    
    if (timeUntil.expired) {
      return timeUntil.message;
    }

    const { days, hours, minutes } = timeUntil;
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  Event.prototype.getPriorityEmoji = function() {
    const emojiMap = {
      'low': '🟢',
      'medium': '🟡',
      'high': '🟠',
      'critical': '🔴'
    };
    return emojiMap[this.priority] || '⚪';
  };

  Event.prototype.getTypeEmoji = function() {
    const emojiMap = {
      'exam': '📝',
      'assignment': '📋',
      'project': '🏗️',
      'presentation': '🎤',
      'quiz': '❓',
      'deadline': '⏰',
      'meeting': '👥',
      'other': '📅'
    };
    return emojiMap[this.event_type] || '📅';
  };

  Event.prototype.getPreparationEmoji = function() {
    const emojiMap = {
      'not_started': '⚪',
      'in_progress': '🟡',
      'well_prepared': '🟠',
      'ready': '🟢'
    };
    return emojiMap[this.preparation_status] || '⚪';
  };

  Event.prototype.getUrgencyLevel = function() {
    const daysUntil = this.getDaysUntil();
    
    if (daysUntil < 0) return 'expired';
    if (daysUntil === 0) return 'today';
    if (daysUntil === 1) return 'tomorrow';
    if (daysUntil <= 3) return 'urgent';
    if (daysUntil <= 7) return 'soon';
    return 'upcoming';
  };

  Event.prototype.shouldSendReminder = function() {
    if (!this.reminder_enabled || this.is_completed) return false;
    
    const now = new Date();
    const eventDate = new Date(this.event_date);
    const timeUntil = eventDate - now;
    
    // Check each reminder interval
    for (const interval of this.reminder_intervals) {
      let reminderTime;
      
      switch (interval) {
        case '1_week':
          reminderTime = 7 * 24 * 60 * 60 * 1000;
          break;
        case '3_days':
          reminderTime = 3 * 24 * 60 * 60 * 1000;
          break;
        case '1_day':
          reminderTime = 24 * 60 * 60 * 1000;
          break;
        case '2_hours':
          reminderTime = 2 * 60 * 60 * 1000;
          break;
        case '30_minutes':
          reminderTime = 30 * 60 * 1000;
          break;
        default:
          continue;
      }
      
      // If we're within the reminder window and haven't sent a reminder recently
      if (timeUntil <= reminderTime && timeUntil > 0) {
        const lastReminder = this.last_reminder_sent ? new Date(this.last_reminder_sent) : null;
        const timeSinceLastReminder = lastReminder ? now - lastReminder : Infinity;
        
        // Don't spam - at least 30 minutes between reminders
        if (timeSinceLastReminder > 30 * 60 * 1000) {
          return { shouldSend: true, interval, timeUntil };
        }
      }
    }
    
    return { shouldSend: false };
  };

  Event.prototype.getStudyProgress = function() {
    if (!this.study_time_allocated) return null;
    
    const progress = (this.study_time_spent / this.study_time_allocated) * 100;
    return Math.min(progress, 100);
  };

  return Event;
};