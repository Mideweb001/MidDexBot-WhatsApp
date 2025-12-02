class ConversationManager {
  constructor(databaseService) {
    this.db = databaseService;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
  }

  async handleMessage(chatId, message, bot, telegramUser = null) {
    try {
      // Find or create user in database
      let user = null;
      if (telegramUser) {
        user = await this.db.findOrCreateUser(telegramUser);
      } else {
        user = await this.db.getUserByTelegramId(chatId);
      }

      if (!user) {
        await bot.sendMessage(chatId, '🤖 Please use /start to initialize your session.');
        return;
      }

      // Get or create conversation
      const conversation = await this.db.findOrCreateConversation(user.id);
      
      // Update conversation with message data
      const currentData = conversation.session_data || {};
      const messageHistory = currentData.messageHistory || [];
      
      messageHistory.push({
        message: message,
        timestamp: new Date().toISOString(),
        type: 'user'
      });
      
      // Keep only last 20 messages to prevent database bloat
      if (messageHistory.length > 20) {
        messageHistory.splice(0, messageHistory.length - 20);
      }
      
      const updatedData = {
        ...currentData,
        messageHistory,
        messageCount: (currentData.messageCount || 0) + 1,
        lastActivity: Date.now()
      };
      
      await this.db.updateConversationData(user.id, updatedData);
      
      // Determine response based on context
      const response = this.generateResponse(message, updatedData);
      
      // Send response
      if (response) {
        await bot.sendMessage(chatId, response);
        
        // Add bot response to history
        messageHistory.push({
          message: response,
          timestamp: new Date().toISOString(),
          type: 'bot'
        });
        
        await this.db.updateConversationData(user.id, {
          messageHistory
        });
      }
      
    } catch (error) {
      console.error('❌ Conversation handling error:', error);
      await bot.sendMessage(chatId, '🤖 I\'m having trouble understanding. Please try again or upload a document to analyze.');
    }
  }

  async getOrCreateSession(telegramId) {
    try {
      const user = await this.db.getUserByTelegramId(telegramId);
      if (!user) return null;
      
      const conversation = await this.db.findOrCreateConversation(user.id);
      return {
        userId: user.id,
        telegramId: telegramId,
        conversation: conversation,
        sessionData: conversation.session_data || {}
      };
    } catch (error) {
      console.error('❌ Error getting/creating session:', error);
      return null;
    }
  }

  generateResponse(message, sessionData) {
    const messageLower = message.toLowerCase().trim();
    
    // Greeting responses
    if (this.isGreeting(messageLower)) {
      return this.getGreetingResponse(sessionData);
    }
    
    // Help requests
    if (this.isHelpRequest(messageLower)) {
      return this.getHelpResponse();
    }
    
    // Document-related queries
    if (this.isDocumentQuery(messageLower)) {
      return this.getDocumentResponse(messageLower);
    }
    
    // Feature inquiries
    if (this.isFeatureInquiry(messageLower)) {
      return this.getFeatureResponse(messageLower);
    }
    
    // Conversational responses
    return this.getConversationalResponse(messageLower, sessionData);
  }

  isGreeting(message) {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'];
    return greetings.some(greeting => message.includes(greeting));
  }

  getGreetingResponse(sessionData) {
    const greetings = [
      '👋 Hello! I\'m here to help you analyze documents with AI.',
      '🤖 Hi there! Ready to process some documents?',
      '📄 Hello! Send me any document and I\'ll analyze it for you.',
      '✨ Hey! I can help you extract insights from your documents.'
    ];
    
    // Personalize based on session history
    if (sessionData.messageCount > 5) {
      greetings.push('👋 Welcome back! What document would you like me to analyze today?');
    }
    
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  isHelpRequest(message) {
    const helpKeywords = ['help', 'what can you do', 'commands', 'how', 'instructions', 'guide'];
    return helpKeywords.some(keyword => message.includes(keyword));
  }

  getHelpResponse() {
    return `
🤖 *I can help you with:*

📄 *Document Analysis*
• Upload PDF files for text extraction
• Image OCR for text recognition
• Document summarization
• Key information extraction

🎯 *Quick Commands*
• /start - Get started
• /help - Show commands
• /analyze - Analyze documents

Just upload any document and I'll analyze it automatically!
    `;
  }

  isDocumentQuery(message) {
    const docKeywords = ['document', 'pdf', 'file', 'analyze', 'process', 'extract', 'summarize', 'text'];
    return docKeywords.some(keyword => message.includes(keyword));
  }

  getDocumentResponse(message) {
    if (message.includes('pdf')) {
      return '📄 I can analyze PDF files! Just upload one and I\'ll extract text and provide insights.';
    }
    
    if (message.includes('image') || message.includes('photo')) {
      return '🖼️ I can read text from images using OCR! Send me any image with text.';
    }
    
    if (message.includes('summarize') || message.includes('summary')) {
      return '📋 I can create summaries! Upload a document and I\'ll provide a concise summary.';
    }
    
    return '📄 Upload any document (PDF, image, text file) and I\'ll analyze it for you!';
  }

  isFeatureInquiry(message) {
    const featureKeywords = ['feature', 'capability', 'can you', 'able to', 'support'];
    return featureKeywords.some(keyword => message.includes(keyword));
  }

  getFeatureResponse(message) {
    return `
🚀 *My Key Features:*

✅ PDF text extraction and analysis
✅ Image OCR (text recognition)
✅ Document summarization
✅ Key information extraction
✅ AI-powered insights
✅ Multiple file format support

Just upload a document to get started!
    `;
  }

  getConversationalResponse(message, sessionData) {
    // Handle common conversational patterns
    if (message.includes('thank')) {
      return '😊 You\'re welcome! Feel free to upload more documents for analysis.';
    }
    
    if (message.includes('good') || message.includes('great') || message.includes('awesome')) {
      return '🎉 Glad you like it! Upload another document whenever you need analysis.';
    }
    
    if (message.includes('bad') || message.includes('error') || message.includes('wrong')) {
      return '😔 Sorry about that! Please try uploading the document again, or contact support if the issue persists.';
    }
    
    // Default conversational response
    const responses = [
      '🤖 I\'m here to help with document analysis! Upload a file to get started.',
      '📄 Send me any document and I\'ll analyze it for you.',
      '✨ Ready to process your documents with MidDexBot! Just upload one.',
      '🔍 I specialize in document analysis. What would you like me to examine?'
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Database-based user data methods
  async getUserData(telegramId, key = null) {
    try {
      const data = await this.db.getConversationData(telegramId, key);
      return data;
    } catch (error) {
      console.error('❌ Error getting user data:', error);
      return null;
    }
  }

  async setUserData(telegramId, key, value) {
    try {
      const user = await this.db.getUserByTelegramId(telegramId);
      if (!user) return false;
      
      const updateData = {};
      updateData[key] = value;
      
      await this.db.updateConversationData(user.id, updateData);
      return true;
    } catch (error) {
      console.error('❌ Error setting user data:', error);
      return false;
    }
  }

  async getUserPreferences(telegramId) {
    try {
      const user = await this.db.getUserByTelegramId(telegramId);
      return user ? user.preferences : {};
    } catch (error) {
      console.error('❌ Error getting user preferences:', error);
      return {};
    }
  }

  async setUserPreference(telegramId, key, value) {
    try {
      const preferences = {};
      preferences[key] = value;
      await this.db.updateUserPreferences(telegramId, preferences);
      return true;
    } catch (error) {
      console.error('❌ Error setting user preference:', error);
      return false;
    }
  }

  async clearUserSession(telegramId) {
    try {
      const user = await this.db.getUserByTelegramId(telegramId);
      if (user) {
        await this.db.clearConversation(user.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error clearing user session:', error);
      return false;
    }
  }

  async getSessionStats() {
    try {
      // Get basic stats from database
      const activeConversations = await this.db.Conversation.count({
        where: { is_active: true }
      });
      
      return {
        activeSessions: activeConversations,
        totalUsers: await this.db.User.count()
      };
    } catch (error) {
      console.error('❌ Error getting session stats:', error);
      return { activeSessions: 0, totalUsers: 0 };
    }
  }
}

module.exports = ConversationManager;