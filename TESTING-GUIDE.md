# WhatsApp Bot Testing Guide 🧪

Complete guide to test your WhatsApp bot locally before deploying to production.

---

## Option 1: Test Locally with Railway Database (Recommended) ⭐

This is the **best approach** - run the bot on your local machine but connect to the Railway PostgreSQL database (which now has all your restaurant and hotel data).

### Step 1: Setup Local Environment

```bash
cd ~/MidDexBot-WhatsApp

# Copy environment variables from Railway
railway variables > .env.railway

# Create local .env file
# Copy values from Railway: railway variables
cat > .env << 'EOF'
NODE_ENV=development
DATABASE_URL=your_railway_database_url_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
OPENAI_API_KEY=your_openai_api_key
RAPIDAPI_KEY=your_rapidapi_key
AMADEUS_API_KEY=your_amadeus_api_key
PORT=3000
EOF

# Install dependencies if not already done
npm install
```

### Step 2: Start the Bot Locally

```bash
cd ~/MidDexBot-WhatsApp
node src/bot.js
```

**Expected Output:**
```
🚀 Starting MidDexBot WhatsApp...
📱 Platform: WhatsApp
🌍 Environment: Development
✅ Database connected
✅ Database synchronized
✅ Express server running on port 3000
🏥 Health check: http://localhost:3000/health

🔐 QR Code received! Scan with WhatsApp:
==================================================
█ ▄▄▄▄▄ █▀ ▀▄▀▄█▀ ▀█  █▀ ▄▀  ▀  ▄▀   █▄▄█ ▄
[QR CODE APPEARS HERE]
==================================================
📱 Open WhatsApp > Settings > Linked Devices > Link a Device
📷 Scan the QR code above
```

### Step 3: Scan QR Code

1. **Open WhatsApp** on your phone
2. Go to **⚙️ Settings** > **Linked Devices**
3. Tap **"Link a Device"**
4. **Point your camera** at the QR code in your terminal
5. Wait for authentication (~5 seconds)

**Expected Output:**
```
✅ WhatsApp authenticated successfully!
✅ WhatsApp bot is ready!
👤 Connected as: Your Name (+1234567890)
```

### Step 4: Test All Features

Send these commands from **your WhatsApp account** to **your own number** (the bot will respond to you):

#### Basic Commands:
```
!ping
Expected: 🏓 Pong! Bot is responsive.

!start
Expected: Welcome menu with 6 options (Restaurants, Hotels, Study, Career, Crypto, Marketplace)

!help
Expected: List of all available commands

!stats
Expected: Database statistics (3,001 restaurants, 1,347 hotels)
```

#### Restaurant Search:
```
!restaurants
Expected: Menu to search by state or nearby

!state Lagos
Expected: List of 10+ restaurants in Lagos with names, ratings, addresses

!state Abuja
Expected: List of 10+ restaurants in Abuja

!state Rivers
Expected: List of restaurants in Rivers State
```

#### Hotel Search:
```
!hotels
Expected: Menu to search hotels by state

!hotelstate Lagos
Expected: List of 10+ hotels in Lagos

!hotelstate Abuja
Expected: List of hotels in Abuja
```

#### Location-Based Search:
```
[Send your location via WhatsApp]
Expected: Bot asks what you're looking for (restaurants, hotels, etc.)
```

### Step 5: Monitor for Errors

Keep your terminal open and watch for any errors:

```bash
# In another terminal, monitor logs
cd ~/MidDexBot-WhatsApp
tail -f whatsapp-bot.log  # If logging to file
```

**Common Issues & Fixes:**

| Issue | Solution |
|-------|----------|
| QR code expires | Restart bot: `Ctrl+C` then `node src/bot.js` |
| "Database not found" | Check DATABASE_URL in .env is correct |
| "No restaurants found" | Wait for population script to complete |
| Bot doesn't respond | Check WhatsApp connection: `!ping` |
| Rate limit errors | Google Maps API daily limit reached |

---

## Option 2: Test with Test Number (Professional) 📱

For production-like testing, use a separate WhatsApp number.

### Requirements:
- Spare phone with different number OR
- WhatsApp Business API (paid) OR
- Second SIM card

### Setup:
1. Get a test WhatsApp number (can use Google Voice, Twilio, etc.)
2. Install WhatsApp on spare device with test number
3. Run bot locally: `node src/bot.js`
4. Scan QR with test device
5. Send messages from your personal phone to test number

**Benefits:**
- Real-world testing scenario
- Don't pollute your personal chat
- Can test with multiple users
- Safer for production deployment

---

## Option 3: Railway Testing with Volumes 🚂

Test on Railway with persistent storage (fixes QR authentication issue).

### Step 1: Add Railway Volume

```bash
cd ~/MidDexBot-WhatsApp
railway open
```

In Railway Dashboard:
1. Click **MidDexBot-WhatsApp** service
2. Go to **Settings** → **Volumes**
3. Click **"+ New Volume"**
4. Set:
   - **Mount Path:** `/app/whatsapp-sessions`
   - **Size:** 1 GB (minimum)
5. Click **Add**
6. Wait for automatic redeploy (~2 minutes)

### Step 2: Test on Railway

```bash
# Check deployment logs
railway logs --tail 100

# Look for QR code in logs (will be ASCII art)
railway logs 2>&1 | grep -A 30 "QR Code"
```

**Scan the QR code from Railway logs** with WhatsApp.

### Step 3: Verify Persistence

```bash
# Trigger a redeploy
railway up

# Check logs - bot should reconnect WITHOUT showing new QR
railway logs --tail 50
```

Expected:
```
✅ WhatsApp authenticated successfully!
✅ Session restored from storage
✅ WhatsApp bot is ready!
```

---

## Testing Checklist ✅

Use this checklist to ensure everything works:

### Core Functionality
- [ ] Bot starts without errors
- [ ] QR code appears and can be scanned
- [ ] Authentication succeeds
- [ ] Express server responds at `/health`
- [ ] Database connection established
- [ ] `!ping` command works

### Restaurant Features
- [ ] `!restaurants` shows menu
- [ ] `!state Lagos` returns Lagos restaurants
- [ ] `!state Abuja` returns Abuja restaurants
- [ ] Results show correct data (name, rating, address)
- [ ] Can test multiple states
- [ ] Location sharing triggers search

### Hotel Features
- [ ] `!hotels` shows menu
- [ ] `!hotelstate Lagos` returns Lagos hotels
- [ ] `!hotelstate Abuja` returns Abuja hotels
- [ ] Results show correct data

### Menu Navigation
- [ ] `!start` shows main menu
- [ ] `!menu` shows category menu
- [ ] Inline buttons work (if implemented)
- [ ] Back/navigation buttons work

### Error Handling
- [ ] Invalid commands show help message
- [ ] Invalid state names show error
- [ ] Empty searches handled gracefully
- [ ] API failures don't crash bot

### Performance
- [ ] Responses arrive within 3 seconds
- [ ] Multiple rapid commands handled
- [ ] Bot doesn't disconnect randomly
- [ ] Memory usage stays stable

---

## Recommended Testing Flow 🔄

Follow this sequence for comprehensive testing:

### Phase 1: Basic Connection (5 minutes)
```bash
cd ~/MidDexBot-WhatsApp
node src/bot.js
# Scan QR, send !ping, !start, !help
```

### Phase 2: Database Queries (10 minutes)
```
!stats                    # Check data loaded
!state Lagos              # Test most restaurants
!state Abuja              # Test capital city
!state "Akwa Ibom"        # Test state with space
!hotelstate Lagos         # Test hotels
!hotelstate Abuja         # Test hotel capital
```

### Phase 3: Edge Cases (5 minutes)
```
!state InvalidState       # Should show error
!state                    # Should ask for state
!hotelstate               # Should ask for state
hello                     # Should show help/menu
```

### Phase 4: Load Testing (5 minutes)
Send 10+ rapid commands:
```
!ping
!stats
!state Lagos
!state Abuja
!state Rivers
!state Kano
!ping
!help
!start
!stats
```

### Phase 5: Verify Data Accuracy (10 minutes)
Pick 3 random restaurants from results and verify:
- [ ] Name is correct
- [ ] Rating makes sense (0-5 stars)
- [ ] Address is in correct state
- [ ] Contact info (if available)

---

## Quick Start Commands 🚀

### Start Testing Now:
```bash
cd ~/MidDexBot-WhatsApp

# Create .env with Railway database
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:mcPZnsApvMWsoKYhZxMDZKKLCjZBlYpR@shuttle.proxy.rlwy.net:37672/railway
GOOGLE_MAPS_API_KEY=AIzaSyBVX84gYl4Unw4qMhygFHxbSg6Y80MAB4o
NODE_ENV=development
EOF

# Install and start
npm install
node src/bot.js

# Scan QR code when it appears
# Start testing with: !ping
```

### Stop Testing:
```bash
# Press Ctrl+C in terminal
# Or kill process:
pkill -f "node src/bot.js"
```

---

## Production Readiness Checklist 📋

Before going live, ensure:

- [ ] All test commands work locally
- [ ] Database has 3,001 restaurants + 1,347 hotels
- [ ] No errors in local testing (30+ minutes)
- [ ] QR authentication works consistently
- [ ] Railway deployment successful
- [ ] Railway Volume added for session persistence
- [ ] All API keys configured in Railway
- [ ] Health check endpoint responds
- [ ] Error handling tested
- [ ] Response times acceptable (<3 seconds)
- [ ] Documentation complete
- [ ] Backup/recovery plan ready

---

## Next Steps After Testing 🎯

Once local testing is successful:

1. **Fix Railway Authentication:**
   - Add Volume as described above
   - Or deploy to platform with persistent storage

2. **Monitor in Production:**
   ```bash
   railway logs --tail 100  # Watch for errors
   ```

3. **Gradual Rollout:**
   - Share with 5-10 test users first
   - Monitor for 24 hours
   - Fix any issues
   - Full public launch

4. **Setup Monitoring:**
   - Error tracking (Sentry, LogRocket)
   - Performance monitoring
   - User analytics
   - Database backups

---

## Support & Troubleshooting 🆘

### Bot Not Responding
1. Check bot is running: `ps aux | grep "node src/bot.js"`
2. Check WhatsApp connection: Send `!ping`
3. Restart bot: `Ctrl+C` then `node src/bot.js`

### Database Errors
1. Test connection: `railway run node -e "console.log(process.env.DATABASE_URL)"`
2. Check data exists: `railway run npm run db:stats`
3. Verify .env has correct DATABASE_URL

### QR Code Issues
1. QR expires after 60 seconds - restart bot
2. Already linked elsewhere? Unlink in WhatsApp settings
3. Use fresh QR code for each test

### Get Help
- Check logs: `tail -100 whatsapp-bot.log`
- Test health: `curl http://localhost:3000/health`
- Review documentation: See README.md

---

**Ready to Test?** Start with Option 1 (local testing) - it's the fastest and safest way! 🚀
