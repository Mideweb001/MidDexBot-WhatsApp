const { sequelize, User, Document, Conversation, ProcessedImage, StudySession } = require('../models');

class DatabaseService {
  constructor() {
    this.sequelize = sequelize;
    this.User = User;
    this.Document = Document;
    this.Conversation = Conversation;
    this.ProcessedImage = ProcessedImage;
    this.StudySession = StudySession;
  }

  async initialize() {
    try {
      // Test the connection
      await this.sequelize.authenticate();
      console.log('✅ Database connection established successfully');

      // Sync all models (create tables if they don't exist)
      if (process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
        // Production PostgreSQL: Use more conservative syncing to avoid ENUM migration issues
        console.log('🏭 Production mode: Syncing PostgreSQL tables...');
        try {
          // Try normal sync first (creates tables if they don't exist)
          await this.sequelize.sync({ 
            alter: false,  // Don't alter existing tables to avoid ENUM issues
            force: false
          });
          console.log('✅ Production database tables synchronized');
        } catch (syncError) {
          console.warn('⚠️ Database sync encountered issues (this is normal for existing tables):', syncError.message);
          // Continue anyway - tables likely already exist
        }
      } else {
        // Development SQLite: Use alter for schema changes
        await this.sequelize.sync({ 
          alter: true,
          force: false
        });
        console.log('✅ Database models synchronized');
      }

      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  // User operations
  async findOrCreateUser(telegramUser) {
    try {
      const [user, created] = await this.User.findOrCreate({
        where: { telegram_id: telegramUser.id },
        defaults: {
          telegram_id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          language_code: telegramUser.language_code,
          is_premium: telegramUser.is_premium || false,
          last_active: new Date()
        }
      });

      // Update user data if not created (existing user)
      if (!created) {
        await user.update({
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          language_code: telegramUser.language_code,
          is_premium: telegramUser.is_premium || false,
          last_active: new Date()
        });
      }

      return user;
    } catch (error) {
      console.error('❌ Error finding/creating user:', error);
      throw error;
    }
  }

  async getUserByTelegramId(telegramId) {
    try {
      return await this.User.findOne({
        where: { telegram_id: telegramId }
      });
    } catch (error) {
      console.error('❌ Error getting user:', error);
      throw error;
    }
  }

  async updateUserPreferences(telegramId, preferences) {
    try {
      const user = await this.getUserByTelegramId(telegramId);
      if (user) {
        await user.update({
          preferences: { ...user.preferences, ...preferences }
        });
        return user;
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating user preferences:', error);
      throw error;
    }
  }

  // Document operations
  async createDocument(userId, documentData) {
    try {
      return await this.Document.create({
        user_id: userId,
        ...documentData
      });
    } catch (error) {
      console.error('❌ Error creating document:', error);
      throw error;
    }
  }

  async updateDocument(documentId, updates) {
    try {
      const document = await this.Document.findByPk(documentId);
      if (document) {
        await document.update(updates);
        return document;
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating document:', error);
      throw error;
    }
  }

  async getUserDocuments(userId, limit = 10) {
    try {
      return await this.Document.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit
      });
    } catch (error) {
      console.error('❌ Error getting user documents:', error);
      throw error;
    }
  }

  async getLastUserDocument(userId) {
    try {
      return await this.Document.findOne({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.error('❌ Error getting last user document:', error);
      throw error;
    }
  }

  // Conversation operations
  async findOrCreateConversation(userId, conversationType = 'general') {
    try {
      const [conversation, created] = await this.Conversation.findOrCreate({
        where: { 
          user_id: userId,
          is_active: true
        },
        defaults: {
          user_id: userId,
          conversation_type: conversationType,
          context_data: {},
          session_data: {},
          is_active: true
        }
      });

      return conversation;
    } catch (error) {
      console.error('❌ Error finding/creating conversation:', error);
      throw error;
    }
  }

  async updateConversationData(userId, data) {
    try {
      const conversation = await this.findOrCreateConversation(userId);
      const updatedSessionData = { ...conversation.session_data, ...data };
      
      await conversation.update({
        session_data: updatedSessionData,
        updated_at: new Date()
      });

      return conversation;
    } catch (error) {
      console.error('❌ Error updating conversation data:', error);
      throw error;
    }
  }

  async getConversationData(userId, key = null) {
    try {
      // Check if user exists first
      const user = await this.User.findByPk(userId);
      if (!user) {
        console.warn('❌ User not found for conversation:', userId);
        return null;
      }
      
      const conversation = await this.findOrCreateConversation(userId);
      if (key) {
        return conversation.session_data[key] || null;
      }
      return conversation.session_data;
    } catch (error) {
      console.error('❌ Error getting conversation data:', error);
      return null;
    }
  }

  async clearConversation(userId) {
    try {
      const conversation = await this.findOrCreateConversation(userId);
      await conversation.update({
        session_data: {},
        context_data: {},
        current_state: null
      });
      return true;
    } catch (error) {
      console.error('❌ Error clearing conversation:', error);
      return false;
    }
  }

  // Processed Image operations
  async createProcessedImage(userId, imageData) {
    try {
      return await this.ProcessedImage.create({
        user_id: userId,
        ...imageData
      });
    } catch (error) {
      console.error('❌ Error creating processed image:', error);
      throw error;
    }
  }

  async updateProcessedImage(imageId, updates) {
    try {
      const image = await this.ProcessedImage.findByPk(imageId);
      if (image) {
        await image.update(updates);
        return image;
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating processed image:', error);
      throw error;
    }
  }

  async getUserProcessedImages(userId, limit = 10) {
    try {
      return await this.ProcessedImage.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit
      });
    } catch (error) {
      console.error('❌ Error getting user processed images:', error);
      throw error;
    }
  }

  async getLastProcessedImage(userId) {
    try {
      return await this.ProcessedImage.findOne({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.error('❌ Error getting last processed image:', error);
      throw error;
    }
  }

  // Study Session operations
  async createStudySession(userId, sessionData) {
    try {
      return await this.StudySession.create({
        user_id: userId,
        ...sessionData
      });
    } catch (error) {
      console.error('❌ Error creating study session:', error);
      throw error;
    }
  }

  async updateStudySession(sessionId, updates) {
    try {
      const session = await this.StudySession.findByPk(sessionId);
      if (session) {
        await session.update(updates);
        return session;
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating study session:', error);
      throw error;
    }
  }

  async getUserStudySessions(userId, sessionType = null, limit = 10) {
    try {
      const whereClause = { user_id: userId };
      if (sessionType) {
        whereClause.session_type = sessionType;
      }

      return await this.StudySession.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit
      });
    } catch (error) {
      console.error('❌ Error getting user study sessions:', error);
      throw error;
    }
  }

  async getActiveStudySession(userId, sessionType = null) {
    try {
      const whereClause = { 
        user_id: userId,
        status: 'active'
      };
      if (sessionType) {
        whereClause.session_type = sessionType;
      }

      return await this.StudySession.findOne({
        where: whereClause,
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.error('❌ Error getting active study session:', error);
      throw error;
    }
  }

  // Analytics and Statistics
  async getUserStats(userId) {
    try {
      const [documentsCount, imagesCount, studySessionsCount] = await Promise.all([
        this.Document.count({ where: { user_id: userId } }),
        this.ProcessedImage.count({ where: { user_id: userId } }),
        this.StudySession.count({ where: { user_id: userId } })
      ]);

      const completedStudySessions = await this.StudySession.count({
        where: { 
          user_id: userId,
          status: 'completed'
        }
      });

      const totalStudyTime = await this.StudySession.sum('duration_minutes', {
        where: { 
          user_id: userId,
          status: 'completed'
        }
      }) || 0;

      return {
        documentsProcessed: documentsCount,
        imagesProcessed: imagesCount,
        studySessionsTotal: studySessionsCount,
        studySessionsCompleted: completedStudySessions,
        totalStudyTimeMinutes: totalStudyTime
      };
    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      throw error;
    }
  }

  // Cleanup operations
  async cleanupOldData(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
      
      // Clean up old completed study sessions
      const deletedSessions = await this.StudySession.destroy({
        where: {
          status: 'completed',
          completed_at: {
            [require('sequelize').Op.lt]: cutoffDate
          }
        }
      });

      // Clean up old processed images
      const deletedImages = await this.ProcessedImage.destroy({
        where: {
          processing_status: 'completed',
          created_at: {
            [require('sequelize').Op.lt]: cutoffDate
          }
        }
      });

      console.log(`🧹 Cleaned up ${deletedSessions} old study sessions and ${deletedImages} old processed images`);
      
      return { deletedSessions, deletedImages };
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.sequelize.close();
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  }
}

module.exports = DatabaseService;