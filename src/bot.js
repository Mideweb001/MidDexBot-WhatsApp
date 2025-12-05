require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Import database models
const db = require('./models');
const DatabaseService = require('./services/DatabaseService');
const RestaurantDiscoveryService = require('./services/RestaurantDiscoveryService');
const HotelService = require('./services/HotelService');
const ConversationManager = require('./services/ConversationManager');

class WhatsAppBot {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize WhatsApp client
    const puppeteerOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    };

    // Let puppeteer/whatsapp-web.js find Chromium automatically
    // Only set executablePath if explicitly provided and file exists
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      const fs = require('fs');
      if (fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
        puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        console.log(`🌐 Using Chromium at: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
      } else {
        console.log(`⚠️ PUPPETEER_EXECUTABLE_PATH set but not found, letting puppeteer auto-detect`);
      }
    }

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: './whatsapp-sessions'
      }),
      puppeteer: puppeteerOptions
    });

    // Initialize services
    this.databaseService = null;
    this.restaurantService = null;
    this.hotelService = null;
    this.conversationManager = null;

    // Express server for health checks
    this.app = express();
    this.port = process.env.PORT || 3000;

    this.setupExpress();
    this.setupWhatsAppHandlers();
  }

  setupExpress() {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        platform: 'whatsapp',
        timestamp: new Date().toISOString(),
        connected: this.client.info ? true : false
      });
    });

    this.app.get('/', (req, res) => {
      res.send(`
        <html>
          <head><title>MidDexBot WhatsApp</title></head>
          <body style="font-family: Arial; padding: 20px;">
            <h1>🤖 MidDexBot WhatsApp</h1>
            <p><strong>Status:</strong> ${this.client.info ? '✅ Connected' : '⏳ Initializing...'}</p>
            <p><strong>Platform:</strong> WhatsApp</p>
            <p><strong>Version:</strong> 1.0.0</p>
            <hr>
            <h3>📱 Features:</h3>
            <ul>
              <li>🍽️ Restaurant Discovery (3,001 restaurants across Nigeria)</li>
              <li>🏨 Hotel Search (1,347 hotels across Nigeria)</li>
              <li>📚 Study Hub (AI-powered learning assistance)</li>
              <li>💼 Career Tools (CV analysis & job search)</li>
              <li>💰 Crypto Trading (Live prices & portfolio)</li>
              <li>🛍️ Marketplace (Local business directory)</li>
            </ul>
            <p><em>Send "!start" to begin</em></p>
          </body>
        </html>
      `);
    });
  }

  setupWhatsAppHandlers() {
    // QR Code generation
    this.client.on('qr', (qr) => {
      console.log('🔐 QR Code received! Scan with WhatsApp:');
      console.log('='.repeat(50));
      qrcode.generate(qr, { small: true });
      console.log('='.repeat(50));
      console.log('📱 Open WhatsApp > Settings > Linked Devices > Link a Device');
      console.log('📷 Scan the QR code above');
    });

    // Authentication
    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp authenticated successfully!');
    });

    this.client.on('auth_failure', (error) => {
      console.error('❌ Authentication failed:', error);
    });

    // Ready event
    this.client.on('ready', async () => {
      console.log('✅ WhatsApp bot is ready!');
      console.log(`📱 Connected as: ${this.client.info.pushname}`);
      console.log(`📞 Phone: ${this.client.info.wid.user}`);
      
      // Initialize database
      await this.initializeDatabase();
      
      console.log('🚀 Bot is fully operational!');
    });

    // Message handler
    this.client.on('message', async (message) => {
      await this.handleMessage(message);
    });

    // Disconnection
    this.client.on('disconnected', (reason) => {
      console.log('⚠️ WhatsApp disconnected:', reason);
    });
  }

  async initializeDatabase() {
    try {
      console.log('🔄 Initializing database...');
      
      // Sync database
      await db.sequelize.sync({ alter: !this.isProduction });
      
      // Initialize services
      this.databaseService = new DatabaseService(db);
      this.restaurantService = new RestaurantDiscoveryService(db);
      this.hotelService = new HotelService(db);
      this.conversationManager = new ConversationManager(db);
      
      // Get stats
      const restaurantCount = await db.Restaurant.count();
      const hotelCount = await db.Hotel.count();
      const userCount = await db.User.count();
      
      console.log('✅ Database initialized successfully!');
      console.log(`📊 Stats: ${userCount} users, ${restaurantCount} restaurants, ${hotelCount} hotels`);
      
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  async handleMessage(message) {
    try {
      // Ignore group messages and status updates
      if (message.from.includes('@g.us') || message.from === 'status@broadcast') {
        return;
      }

      const contact = await message.getContact();
      const chatId = message.from;
      const text = message.body.trim();
      
      console.log(`📨 Message from ${contact.pushname}: ${text}`);

      // Find or create user
      const user = await this.findOrCreateUser(contact);

      // Command handling
      if (text.startsWith('!')) {
        await this.handleCommand(message, user, text);
      } else {
        // Regular message handling (conversation context)
        await this.handleConversation(message, user, text);
      }

    } catch (error) {
      console.error('❌ Error handling message:', error);
      await message.reply('❌ Sorry, an error occurred. Please try again.');
    }
  }

  async findOrCreateUser(contact) {
    try {
      const [user] = await db.User.findOrCreate({
        where: { whatsapp_id: contact.id.user },
        defaults: {
          whatsapp_id: contact.id.user,
          first_name: contact.pushname || contact.name || 'User',
          username: contact.number,
          platform: 'whatsapp',
          is_bot: false,
          language_code: 'en'
        }
      });
      return user;
    } catch (error) {
      console.error('❌ Error finding/creating user:', error);
      throw error;
    }
  }

  async handleCommand(message, user, text) {
    const command = text.toLowerCase().split(' ')[0];
    const args = text.split(' ').slice(1).join(' ');

    switch (command) {
      case '!start':
      case '!menu':
        await this.sendMainMenu(message, user);
        break;

      case '!ping':
        await message.reply('🏓 Pong! Bot is alive and running!');
        break;

      case '!restaurants':
        await this.sendRestaurantMenu(message, user);
        break;

      case '!hotels':
        await this.sendHotelMenu(message, user);
        break;

      case '!state':
        if (args) {
          await this.searchByState(message, user, args, 'restaurant');
        } else {
          await this.sendStateList(message, 'restaurant');
        }
        break;

      case '!hotelstate':
        if (args) {
          await this.searchByState(message, user, args, 'hotel');
        } else {
          await this.sendStateList(message, 'hotel');
        }
        break;

      case '!stats':
        await this.sendStats(message);
        break;

      case '!help':
        await this.sendHelp(message);
        break;

      default:
        await message.reply(`❓ Unknown command: ${command}\n\nSend !help for available commands.`);
    }
  }

  async handleConversation(message, user, text) {
    // Check for active conversation context
    const context = await this.conversationManager.getUserData(user.id, 'context');
    
    if (context === 'awaiting_state') {
      // User is selecting a state
      await this.searchByState(message, user, text, 'restaurant');
    } else {
      // No context, send main menu
      await message.reply('👋 Hi! Send !start or !menu to see what I can do.');
    }
  }

  async sendMainMenu(message, user) {
    const menuText = `🤖 *MidDexBot - Your AI Assistant*

👋 Welcome ${user.first_name}!

*Available Services:*

🍽️ *Restaurants*
   • Browse 3,001+ restaurants across Nigeria
   • Search by state, cuisine, or location
   • Get ratings, reviews & contact info
   📱 Command: !restaurants

🏨 *Hotels*
   • Find from 1,347+ hotels nationwide
   • Compare prices & amenities
   • Book accommodations easily
   📱 Command: !hotels

📚 *Study Hub*
   • AI-powered homework help
   • Course materials & resources
   • Exam preparation tools
   📱 Command: !study

💼 *Career Tools*
   • CV analysis & optimization
   • Job search assistance
   • Interview preparation
   📱 Command: !career

💰 *Crypto Trading*
   • Live cryptocurrency prices
   • Portfolio management
   • Price alerts & tracking
   📱 Command: !crypto

🛍️ *Marketplace*
   • Local business directory
   • Product & service listings
   • Verified sellers
   📱 Command: !marketplace

_Type any command to get started!_
📱 Need help? Send !help`;

    await message.reply(menuText);
  }

  async sendRestaurantMenu(message, user) {
    const text = `🍽️ *Restaurant Discovery*

Find the best restaurants across Nigeria!

*Search Options:*

1️⃣ *By State*
   • Browse restaurants by location
   • 37 states covered
   📱 Command: !state [state name]
   📱 Example: !state Lagos

2️⃣ *By Cuisine*
   • Nigerian, Continental, Asian, etc.
   📱 Command: !cuisine [type]

3️⃣ *Top Rated*
   • Best restaurants nationwide
   📱 Command: !toprestaurants

*Quick Access:*
• Lagos: !state Lagos
• Abuja: !state Abuja
• Port Harcourt: !state Rivers

📊 *Total: 3,001+ restaurants available*

_What would you like to search for?_`;

    await message.reply(text);
    await this.conversationManager.setUserData(user.id, 'context', 'awaiting_state');
  }

  async sendHotelMenu(message, user) {
    const text = `🏨 *Hotel Search*

Discover hotels across Nigeria!

*Search Options:*

1️⃣ *By State*
   • Find hotels by location
   • 37 states covered
   📱 Command: !hotelstate [state name]
   📱 Example: !hotelstate Lagos

2️⃣ *By Price Range*
   • Budget, Mid-range, Luxury
   📱 Command: !hotelprice [range]

3️⃣ *Top Rated*
   • Best hotels nationwide
   📱 Command: !tophotels

*Quick Access:*
• Lagos: !hotelstate Lagos
• Abuja: !hotelstate Abuja
• Port Harcourt: !hotelstate Rivers

📊 *Total: 1,347+ hotels available*

_Where are you looking to stay?_`;

    await message.reply(text);
  }

  async searchByState(message, user, stateName, type = 'restaurant') {
    try {
      await message.reply(`🔍 Searching for ${type}s in ${stateName}...`);

      let results;
      if (type === 'restaurant') {
        results = await this.restaurantService.browseRestaurantsByState(stateName, 10);
      } else {
        results = await this.hotelService.searchHotelsByState(stateName, 10);
      }

      if (!results || results.length === 0) {
        await message.reply(`❌ No ${type}s found in ${stateName}.\n\nTry another state or send !state to see all available states.`);
        return;
      }

      // Send results
      const emoji = type === 'restaurant' ? '🍽️' : '🏨';
      let responseText = `${emoji} *Found ${results.length} ${type}s in ${stateName}:*\n\n`;

      results.forEach((item, index) => {
        responseText += `${index + 1}. *${item.name}*\n`;
        responseText += `   📍 ${item.address || item.location}\n`;
        if (item.rating) responseText += `   ⭐ ${item.rating}/5.0\n`;
        if (item.phone) responseText += `   📞 ${item.phone}\n`;
        responseText += `\n`;
      });

      responseText += `_Send !state [name] to search another state_`;

      await message.reply(responseText);

    } catch (error) {
      console.error(`❌ Error searching ${type}s:`, error);
      await message.reply(`❌ Error searching for ${type}s. Please try again.`);
    }
  }

  async sendStateList(message, type = 'restaurant') {
    const NigerianStates = require('./config/NigerianStates');
    
    const emoji = type === 'restaurant' ? '🍽️' : '🏨';
    let text = `${emoji} *Nigerian States (${NigerianStates.states.length})*\n\n`;
    
    text += `*Select a state to browse ${type}s:*\n\n`;
    
    NigerianStates.states.forEach((state, index) => {
      text += `${index + 1}. ${state}\n`;
    });
    
    const command = type === 'restaurant' ? '!state' : '!hotelstate';
    text += `\n📱 _Usage: ${command} [state name]_\n`;
    text += `📝 _Example: ${command} Lagos_`;
    
    await message.reply(text);
  }

  async sendStats(message) {
    try {
      const restaurantCount = await db.Restaurant.count();
      const hotelCount = await db.Hotel.count();
      const userCount = await db.User.count();

      const text = `📊 *MidDexBot Statistics*

👥 *Users:* ${userCount}
🍽️ *Restaurants:* ${restaurantCount}
🏨 *Hotels:* ${hotelCount}
📱 *Platform:* WhatsApp
✅ *Status:* Online

_Last updated: ${new Date().toLocaleString()}_`;

      await message.reply(text);
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      await message.reply('❌ Error retrieving statistics.');
    }
  }

  async sendHelp(message) {
    const text = `📚 *MidDexBot Help*

*Basic Commands:*
• !start - Main menu
• !menu - Show all features
• !help - This help message
• !ping - Test bot connection
• !stats - View statistics

*Restaurant Commands:*
• !restaurants - Restaurant menu
• !state [name] - Search restaurants by state
• !state - List all states

*Hotel Commands:*
• !hotels - Hotel menu
• !hotelstate [name] - Search hotels by state

*Other Features:*
• !study - Study Hub (coming soon)
• !career - Career Tools (coming soon)
• !crypto - Crypto Trading (coming soon)
• !marketplace - Marketplace (coming soon)

*Examples:*
• !state Lagos
• !hotelstate Abuja
• !restaurants

_Need more help? Contact support!_`;

    await message.reply(text);
  }

  async start() {
    try {
      console.log('🚀 Starting MidDexBot WhatsApp...');
      console.log('📱 Platform: WhatsApp');
      console.log('🌍 Environment:', this.isProduction ? 'Production' : 'Development');
      
      // Start Express server
      this.app.listen(this.port, () => {
        console.log(`✅ Express server running on port ${this.port}`);
        console.log(`🏥 Health check: http://localhost:${this.port}/health`);
      });

      // Initialize WhatsApp client
      await this.client.initialize();
      
    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      process.exit(1);
    }
  }
}

// Start the bot
const bot = new WhatsAppBot();
bot.start();

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️ Shutting down bot...');
  await bot.client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️ Shutting down bot...');
  await bot.client.destroy();
  process.exit(0);
});
