# 🤖 MidDexBot WhatsApp

> AI-Powered Nigerian Assistant on WhatsApp

[![Platform](https://img.shields.io/badge/Platform-WhatsApp-25D366?logo=whatsapp)](https://whatsapp.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**MidDexBot WhatsApp** is the WhatsApp version of MidDexBot - your comprehensive AI-powered assistant for Nigeria. Access restaurants, hotels, study tools, career guidance, crypto trading, and local marketplace - all through WhatsApp!

## ✨ Features

### 🍽️ Restaurant Discovery
- **3,001+ restaurants** across all 37 Nigerian states
- Search by state, cuisine, or location
- Real ratings, reviews & contact information
- Integrated with Google Places API

### 🏨 Hotel Search
- **1,347+ hotels** nationwide
- Compare prices and amenities
- Filter by location and price range
- Direct booking information

### 📚 Study Hub
- AI-powered homework assistance
- Course materials and resources
- Exam preparation tools
- Interactive learning support

### 💼 Career Tools
- CV analysis and optimization
- Job search assistance
- Interview preparation
- Career guidance

### 💰 Crypto Trading
- Live cryptocurrency prices
- Portfolio management
- Price alerts and tracking
- Market analysis

### 🛍️ Marketplace
- Local business directory
- Product and service listings
- Verified sellers
- Community marketplace

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- WhatsApp account
- Railway account (for deployment)
- PostgreSQL (production) or SQLite (development)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/Mideweb001/MidDexBot-WhatsApp.git
cd MidDexBot-WhatsApp
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the bot**
```bash
npm start
```

5. **Scan QR Code**
- Open WhatsApp on your phone
- Go to Settings > Linked Devices > Link a Device
- Scan the QR code in your terminal

6. **Test the bot**
- Send `!ping` to test connection
- Send `!start` to see the main menu

## 📱 Commands

### Basic Commands
- `!start` - Show main menu
- `!menu` - Display all features
- `!help` - Get help
- `!ping` - Test connection
- `!stats` - View statistics

### Restaurant Commands
- `!restaurants` - Restaurant menu
- `!state Lagos` - Search restaurants in Lagos
- `!state` - List all states

### Hotel Commands
- `!hotels` - Hotel menu
- `!hotelstate Lagos` - Search hotels in Lagos

### Coming Soon
- `!study` - Study Hub
- `!career` - Career Tools
- `!crypto` - Crypto Trading
- `!marketplace` - Marketplace

## 🏗️ Architecture

```
src/
├── bot.js              # Main WhatsApp bot
├── handlers/           # Message handlers
├── services/           # Business logic
│   ├── DatabaseService.js
│   ├── RestaurantDiscoveryService.js
│   ├── HotelService.js
│   └── ConversationManager.js
├── models/             # Database models
│   ├── User.js
│   ├── Restaurant.js
│   ├── Hotel.js
│   └── index.js
├── config/             # Configuration
│   └── NigerianStates.js
└── utils/              # Utility functions

scripts/
├── populate-restaurants.js
├── populate-hotels.js
└── db-stats.js
```

## 🗄️ Database

### Models
- **User** - WhatsApp users
- **Restaurant** - Restaurant listings
- **Hotel** - Hotel listings
- **Conversation** - Chat context
- **FoodOrder** - Order tracking
- **HotelBooking** - Booking records
- And 20+ more models...

### Development
Uses SQLite for local development:
```bash
npm start
```

### Production
Uses PostgreSQL on Railway:
```bash
DATABASE_URL=postgresql://... npm start
```

## 🚀 Deployment

### Railway Deployment

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
```

2. **Login to Railway**
```bash
railway login
```

3. **Create new project**
```bash
railway init
```

4. **Add PostgreSQL**
```bash
railway add --plugin postgresql
```

5. **Set environment variables**
```bash
railway variables set NODE_ENV=production
railway variables set SESSION_SECRET=your_secret
railway variables set OPENAI_API_KEY=your_key
```

6. **Deploy**
```bash
railway up
```

7. **Check logs for QR code**
```bash
railway logs
```

8. **Populate database**
```bash
railway run npm run populate:restaurants
railway run npm run populate:hotels
```

### Environment Variables

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=your_random_secret
OPENAI_API_KEY=sk-...
RAPIDAPI_KEY=your_key
GOOGLE_PLACES_API_KEY=your_key
PORT=3000
```

## 📊 Database Population

### Restaurants (3,001 entries)
```bash
npm run populate:restaurants
```

### Hotels (1,347 entries)
```bash
npm run populate:hotels
```

### Statistics
```bash
npm run db:stats
```

## 🔧 Development

### Run in development mode
```bash
npm run dev
```

### Database operations
```bash
# View statistics
npm run db:stats

# Populate restaurants
npm run populate:restaurants

# Populate hotels
npm run populate:hotels
```

## 🤝 Comparison with Telegram Bot

| Feature | Telegram | WhatsApp |
|---------|----------|----------|
| **UI** | Inline Keyboards | List Messages / Text |
| **Auth** | Bot Token | QR Code |
| **Commands** | `/command` | `!command` |
| **Hosting** | Webhook | Persistent Session |
| **Cost** | Free | Free (with whatsapp-web.js) |

## 📝 API Integrations

- **Google Places API** - Restaurant data
- **RapidAPI** - Hotel information
- **OpenAI API** - AI features
- **CoinGecko API** - Crypto prices

## ⚠️ Important Notes

### WhatsApp Sessions
- Session files are saved in `whatsapp-sessions/`
- **Never commit session files to git**
- Backup sessions for production use

### Rate Limits
- WhatsApp has ~20 messages/second limit
- Implement message queuing for bulk operations
- Use delays between messages

### Production Considerations
- Keep persistent storage for sessions
- Monitor for disconnections
- Implement auto-reconnect logic
- Regular session backups

## 🐛 Troubleshooting

### QR Code not showing
```bash
# Clear sessions
rm -rf whatsapp-sessions/
rm -rf .wwebjs_auth/
npm start
```

### Database connection error
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
node -e "require('./src/models').sequelize.authenticate()"
```

### Bot disconnects frequently
- Ensure stable internet connection
- Check Railway logs for errors
- Verify session persistence

## 📈 Roadmap

### Phase 1 (Week 1) ✅
- [x] Basic bot setup
- [x] Restaurant search
- [x] Hotel search
- [x] Database integration

### Phase 2 (Week 2)
- [ ] Study Hub implementation
- [ ] Career Tools features
- [ ] Crypto Trading integration
- [ ] Marketplace setup

### Phase 3 (Week 3)
- [ ] Advanced AI features
- [ ] Payment integration
- [ ] Booking system
- [ ] Admin dashboard

### Phase 4 (Month 2)
- [ ] Analytics
- [ ] User feedback system
- [ ] Multi-language support
- [ ] Business API migration

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Mideweb001**
- GitHub: [@Mideweb001](https://github.com/Mideweb001)
- Telegram Bot: [MidDexBot-AI-Assistant](https://github.com/Mideweb001/MidDexBot-AI-Assistant)

## 🙏 Acknowledgments

- Built with [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- Inspired by the original [MidDexBot Telegram](https://github.com/Mideweb001/MidDexBot-AI-Assistant)
- Powered by Node.js and Sequelize ORM
- Hosted on [Railway](https://railway.app)

## 📞 Support

For support, send a message to the bot or open an issue on GitHub.

---

**Made with ❤️ for Nigeria** 🇳🇬
