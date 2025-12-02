const { Event, User, StudyGroup } = require('../models');
const { Op } = require('sequelize');

class EventManager {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }

  // === CORE EVENT OPERATIONS ===

  async createEvent(userId, eventData) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Parse date if it's a string
      if (typeof eventData.event_date === 'string') {
        eventData.event_date = new Date(eventData.event_date);
      }

      // Validate date is in the future
      if (eventData.event_date <= new Date()) {
        throw new Error('Event date must be in the future');
      }

      // Set default reminder intervals based on event type
      if (!eventData.reminder_intervals) {
        eventData.reminder_intervals = this.getDefaultReminderIntervals(eventData.event_type);
      }

      const event = await Event.create({
        user_id: user.id,
        ...eventData
      });

      return event;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async getEventById(eventId) {
    try {
      const event = await Event.findByPk(eventId, {
        include: [
          { model: User, as: 'user' },
          { model: StudyGroup, as: 'studyGroup' }
        ]
      });
      return event;
    } catch (error) {
      console.error('Error getting event by ID:', error);
      throw error;
    }
  }

  async getUserEvents(userId, options = {}) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const {
        limit = 20,
        offset = 0,
        includeCompleted = false,
        eventType = null,
        priority = null,
        upcoming = true
      } = options;

      const whereClause = { user_id: user.id };

      if (!includeCompleted) {
        whereClause.is_completed = false;
      }

      if (eventType) {
        whereClause.event_type = eventType;
      }

      if (priority) {
        whereClause.priority = priority;
      }

      if (upcoming) {
        whereClause.event_date = { [Op.gte]: new Date() };
      }

      const events = await Event.findAll({
        where: whereClause,
        order: [['event_date', 'ASC']],
        limit,
        offset,
        include: [
          { model: StudyGroup, as: 'studyGroup' }
        ]
      });

      return events;
    } catch (error) {
      console.error('Error getting user events:', error);
      throw error;
    }
  }

  async updateEvent(eventId, updateData) {
    try {
      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Parse date if it's a string
      if (updateData.event_date && typeof updateData.event_date === 'string') {
        updateData.event_date = new Date(updateData.event_date);
      }

      await event.update(updateData);
      return event;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId) {
    try {
      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      await event.destroy();
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  async markEventCompleted(eventId, completionData = {}) {
    try {
      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      await event.update({
        is_completed: true,
        completion_date: new Date(),
        ...completionData
      });

      return event;
    } catch (error) {
      console.error('Error marking event completed:', error);
      throw error;
    }
  }

  // === COUNTDOWN AND TIME MANAGEMENT ===

  async getUpcomingEvents(userId, days = 7) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + days);

      const events = await Event.findAll({
        where: {
          user_id: user.id,
          is_completed: false,
          event_date: {
            [Op.between]: [now, futureDate]
          }
        },
        order: [['event_date', 'ASC']],
        include: [
          { model: StudyGroup, as: 'studyGroup' }
        ]
      });

      return events;
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      throw error;
    }
  }

  async getTodayEvents(userId) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const events = await Event.findAll({
        where: {
          user_id: user.id,
          is_completed: false,
          event_date: {
            [Op.between]: [startOfDay, endOfDay]
          }
        },
        order: [['event_date', 'ASC']],
        include: [
          { model: StudyGroup, as: 'studyGroup' }
        ]
      });

      return events;
    } catch (error) {
      console.error('Error getting today events:', error);
      throw error;
    }
  }

  async getEventCountdown(eventId) {
    try {
      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const timeUntil = event.getTimeUntil();
      const formattedCountdown = event.getFormattedCountdown();
      const urgencyLevel = event.getUrgencyLevel();

      return {
        event,
        timeUntil,
        formattedCountdown,
        urgencyLevel,
        daysUntil: event.getDaysUntil()
      };
    } catch (error) {
      console.error('Error getting event countdown:', error);
      throw error;
    }
  }

  // === REMINDER SYSTEM ===

  async getEventsNeedingReminders() {
    try {
      const events = await Event.findAll({
        where: {
          is_completed: false,
          reminder_enabled: true,
          event_date: { [Op.gte]: new Date() }
        },
        include: [
          { model: User, as: 'user' }
        ]
      });

      const eventsNeedingReminders = [];

      for (const event of events) {
        const reminderCheck = event.shouldSendReminder();
        if (reminderCheck.shouldSend) {
          eventsNeedingReminders.push({
            event,
            reminderInterval: reminderCheck.interval,
            timeUntil: reminderCheck.timeUntil
          });
        }
      }

      return eventsNeedingReminders;
    } catch (error) {
      console.error('Error getting events needing reminders:', error);
      throw error;
    }
  }

  async markReminderSent(eventId) {
    try {
      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      await event.update({
        last_reminder_sent: new Date(),
        reminder_count: event.reminder_count + 1
      });

      return event;
    } catch (error) {
      console.error('Error marking reminder sent:', error);
      throw error;
    }
  }

  async updateReminderSettings(eventId, reminderData) {
    try {
      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      await event.update({
        reminder_enabled: reminderData.reminder_enabled,
        reminder_intervals: reminderData.reminder_intervals || event.reminder_intervals
      });

      return event;
    } catch (error) {
      console.error('Error updating reminder settings:', error);
      throw error;
    }
  }

  // === STATISTICS AND ANALYTICS ===

  async getUserEventStats(userId) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      // Total events
      const totalEvents = await Event.count({
        where: { user_id: user.id }
      });

      // Completed events
      const completedEvents = await Event.count({
        where: { 
          user_id: user.id,
          is_completed: true
        }
      });

      // Upcoming events
      const upcomingEvents = await Event.count({
        where: {
          user_id: user.id,
          is_completed: false,
          event_date: { [Op.gte]: now }
        }
      });

      // Events by type
      const eventsByType = await Event.findAll({
        where: { user_id: user.id },
        attributes: [
          'event_type',
          [Event.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: 'event_type',
        raw: true
      });

      // Events by priority
      const eventsByPriority = await Event.findAll({
        where: { user_id: user.id },
        attributes: [
          'priority',
          [Event.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: 'priority',
        raw: true
      });

      // Recent completion rate
      const recentEvents = await Event.findAll({
        where: {
          user_id: user.id,
          event_date: { [Op.gte]: thirtyDaysAgo }
        }
      });

      const recentCompleted = recentEvents.filter(e => e.is_completed).length;
      const completionRate = recentEvents.length > 0 ? (recentCompleted / recentEvents.length) * 100 : 0;

      // Average preparation time
      const eventsWithStudyTime = recentEvents.filter(e => e.study_time_spent > 0);
      const avgPreparationTime = eventsWithStudyTime.length > 0 
        ? eventsWithStudyTime.reduce((sum, e) => sum + e.study_time_spent, 0) / eventsWithStudyTime.length
        : 0;

      return {
        totalEvents,
        completedEvents,
        upcomingEvents,
        completionRate: Math.round(completionRate),
        eventsByType,
        eventsByPriority,
        avgPreparationTime: Math.round(avgPreparationTime),
        period: '30 days'
      };
    } catch (error) {
      console.error('Error getting user event stats:', error);
      throw error;
    }
  }

  // === UTILITY METHODS ===

  getDefaultReminderIntervals(eventType) {
    const intervals = {
      'exam': ['1_week', '3_days', '1_day', '2_hours'],
      'assignment': ['3_days', '1_day', '2_hours'],
      'project': ['1_week', '3_days', '1_day'],
      'presentation': ['3_days', '1_day', '2_hours', '30_minutes'],
      'quiz': ['1_day', '2_hours'],
      'deadline': ['3_days', '1_day', '2_hours'],
      'meeting': ['1_day', '2_hours', '30_minutes'],
      'other': ['1_day', '2_hours']
    };

    return intervals[eventType] || intervals['other'];
  }

  parseNaturalLanguageDate(dateString) {
    // Simple natural language date parsing
    const now = new Date();
    const lower = dateString.toLowerCase().trim();

    if (lower === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
    }

    if (lower === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59);
    }

    if (lower.includes('next week')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      return new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 23, 59);
    }

    // Try to parse as regular date
    try {
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (error) {
      // Fall back to manual parsing
    }

    // Extract day/month patterns
    const dayMonthMatch = dateString.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dayMonthMatch) {
      const day = parseInt(dayMonthMatch[1]);
      const month = parseInt(dayMonthMatch[2]) - 1; // Month is 0-indexed
      const year = dayMonthMatch[3] ? 
        (dayMonthMatch[3].length === 2 ? 2000 + parseInt(dayMonthMatch[3]) : parseInt(dayMonthMatch[3])) :
        now.getFullYear();
      
      return new Date(year, month, day, 23, 59);
    }

    throw new Error('Unable to parse date: ' + dateString);
  }

  formatEventForTelegram(event, includeCountdown = true) {
    const typeEmoji = event.getTypeEmoji();
    const priorityEmoji = event.getPriorityEmoji();
    const preparationEmoji = event.getPreparationEmoji();
    
    let message = `${typeEmoji} *${event.title}*\n`;
    
    if (event.description) {
      message += `📄 ${event.description}\n`;
    }
    
    message += `📅 ${event.event_date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n`;
    
    if (includeCountdown) {
      const countdown = event.getFormattedCountdown();
      const urgency = event.getUrgencyLevel();
      
      if (urgency === 'expired') {
        message += `⏰ *Event has passed*\n`;
      } else if (urgency === 'today') {
        message += `🔥 *TODAY!* ${countdown} remaining\n`;
      } else if (urgency === 'tomorrow') {
        message += `⚡ *TOMORROW!* ${countdown} remaining\n`;
      } else {
        message += `⏰ ${countdown} remaining\n`;
      }
    }
    
    message += `${priorityEmoji} Priority: ${event.priority.charAt(0).toUpperCase() + event.priority.slice(1)}\n`;
    message += `${preparationEmoji} Status: ${event.preparation_status.replace('_', ' ')}\n`;
    
    if (event.subject) {
      message += `📚 Subject: ${event.subject}\n`;
    }
    
    if (event.location) {
      message += `📍 Location: ${event.location}\n`;
    }
    
    if (event.study_time_allocated) {
      const progress = event.getStudyProgress();
      const progressBar = this.generateProgressBar(progress || 0);
      message += `📖 Study Progress: ${progressBar} ${Math.round(progress || 0)}%\n`;
    }
    
    return message;
  }

  generateProgressBar(percentage, length = 10) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  generateCalendarView(events, date = new Date()) {
    // Generate a simple text-based calendar view
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    let calendar = `📅 *${monthNames[month]} ${year}*\n\n`;
    calendar += 'Mo Tu We Th Fr Sa Su\n';
    
    // Add empty spaces for days before the first day
    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) {
      calendar += '   ';
    }
    
    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day);
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.event_date);
        return eventDate.toDateString() === currentDate.toDateString();
      });
      
      if (dayEvents.length > 0) {
        calendar += `*${day.toString().padStart(2, ' ')}*`;
      } else {
        calendar += ` ${day.toString().padStart(2, ' ')}`;
      }
      
      if ((day + startingDayOfWeek - 1) % 7 === 0) {
        calendar += '\n';
      } else {
        calendar += ' ';
      }
    }
    
    return calendar;
  }
}

module.exports = EventManager;