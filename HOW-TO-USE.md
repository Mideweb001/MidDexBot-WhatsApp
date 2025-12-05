# 📱 How to Use Your WhatsApp Bot

## 🔑 Important: This is YOUR Bot

The bot is running on **your WhatsApp number**: +234 903 520 4046

**This means:**
- ✅ Bot responds from YOUR account
- ✅ People message YOUR number
- ✅ You can test by messaging yourself
- ❌ Can't search for it like a Telegram bot

---

## 🧪 Testing the Bot (Yourself)

### Step 1: Start the Bot
```bash
cd ~/MidDexBot-WhatsApp
./test-bot.sh
```

Wait for this message:
```
🚀 Bot is fully operational!
```

### Step 2: Test from Another Phone

**Best way to test:**
1. Use a friend's phone OR a second phone
2. Save your number: +234 903 520 4046
3. Send a WhatsApp message to yourself: `!ping`
4. Bot should auto-respond!

**OR Test from Same Phone (Saved Messages):**
1. Open WhatsApp on your phone
2. Go to your own contact/profile
3. Tap "Message Myself" (if available)
4. Send: `!ping`

---

## 👥 How Other People Use Your Bot

### Method 1: Direct Number
Share your WhatsApp number:
```
+234 903 520 4046
```

Tell them to:
1. Save the number
2. Send `!start` or `!help`
3. Use bot commands

### Method 2: WhatsApp Link
Share this link (auto-opens chat):
```
https://wa.me/2349035204046?text=!start
```

When clicked:
- Opens WhatsApp directly
- Pre-fills message with "!start"
- User just hits send

### Method 3: QR Code
Generate a WhatsApp QR code:
- Go to: https://wa.me/2349035204046
- Create QR code (using any QR generator)
- People scan → Direct to your WhatsApp

---

## 🎯 Commands Users Can Send

### Basic Commands
```
!start    - Show welcome menu
!help     - List all commands
!ping     - Test if bot is working
!stats    - Database statistics
```

### Restaurant Search
```
!state Lagos              - Find restaurants in Lagos
!state "Port Harcourt"    - Multi-word states need quotes
!state Abuja              - Find restaurants in Abuja
```

### Hotel Search
```
!hotelstate Lagos    - Find hotels in Lagos
!hotelstate Kano     - Find hotels in Kano
!hotelstate Abuja    - Find hotels in Abuja
```

### Location-Based Search
Users can also **share their location** and bot will find nearby:
- Restaurants
- Hotels

---

## 📢 Promoting Your Bot

### 1. Social Media
Post this:
```
🤖 Try my new WhatsApp bot!

🍽️ Find restaurants across Nigeria
🏨 Search for hotels in any state
📊 Instant recommendations

Message me on WhatsApp:
+234 903 520 4046

Or click: https://wa.me/2349035204046?text=!start

Send "!help" to get started!
```

### 2. WhatsApp Status
Update your status:
```
🤖 My number is now a bot!
Send me "!help" to try it
🍽️ Restaurants | 🏨 Hotels
```

### 3. Groups
Share in WhatsApp groups:
```
Hey everyone! 👋

I built a bot that finds restaurants and hotels across Nigeria!

To use it:
1. Message: +234 903 520 4046
2. Send: !state Lagos
3. Get instant results!

Commands: !help
```

---

## ⚙️ Important Setup Notes

### Your Bot Needs to Be Running
- Bot must be active on your computer/server
- If laptop sleeps, bot stops responding
- **Solution:** Deploy to Railway (24/7 uptime)

### Deploy to Railway for 24/7 Access
```bash
cd ~/MidDexBot-WhatsApp
git push origin main
railway up
```

Then add Railway Volume:
1. Go to Railway dashboard
2. Settings → Volumes → New Volume
3. Mount path: `/app/whatsapp-sessions`
4. Bot stays online 24/7

---

## 🔒 Privacy & Security

### What Users See
- Your WhatsApp name
- Your profile picture
- Your "About" status
- They're messaging YOUR number

### What Bot Sees
- User's phone number
- Messages they send
- Location (if shared)

### Best Practices
1. **Use WhatsApp Business** (separate from personal)
2. **Set business hours** in profile
3. **Add privacy policy** in About
4. **Don't store sensitive data**

---

## 🐛 Troubleshooting

### Bot Not Responding?

**Check if bot is running:**
```bash
# In terminal where bot is running, you should see:
🚀 Bot is fully operational!
```

**Restart bot:**
```bash
cd ~/MidDexBot-WhatsApp
./test-bot.sh
```

### Users Say "Not Working"?

**Common issues:**
1. Bot stopped (computer went to sleep)
2. Internet connection down
3. Railway deployment needed
4. User sent wrong command format

**Solutions:**
- Keep bot running 24/7 (use Railway)
- Check Railway logs: `railway logs --tail 50`
- Share command list clearly

### Test Commands Not Working?

**Try this:**
1. Stop bot: `Ctrl+C`
2. Restart: `./test-bot.sh`
3. Wait for "Bot is fully operational!"
4. Test again with `!ping`

---

## 📊 Monitoring Usage

### Check Bot Logs
```bash
# See recent activity
railway logs --tail 100

# Watch live
railway logs --follow
```

### Check Database Stats
```bash
cd ~/MidDexBot-WhatsApp
railway run npm run db:stats
```

Shows:
- Total users who used bot
- Restaurant search count
- Hotel search count

---

## 🚀 Next Steps

### 1. Test Locally (5 minutes)
```bash
cd ~/MidDexBot-WhatsApp
./test-bot.sh
```
Message yourself: `!ping`

### 2. Deploy to Railway (24/7)
```bash
git push origin main
railway up
```

### 3. Share with Friends (Beta Test)
Send them:
- Your WhatsApp number
- Command list
- Ask for feedback

### 4. Public Launch
- Post on social media
- Share in groups
- Create QR code poster

---

## 💡 Pro Tips

### 1. Set Auto-Reply Greeting
In WhatsApp Business settings:
- Away message: "🤖 This is an automated bot. Send !help for commands"
- Greeting message: "👋 Welcome! Send !start to begin"

### 2. Create Quick Reply Buttons
WhatsApp Business allows quick replies:
- "!help" → Full command list
- "!state Lagos" → Lagos restaurants
- "!stats" → Database stats

### 3. Track Popular Commands
Check Railway logs to see:
- Most searched cities
- Peak usage times
- Popular features

### 4. Update Bot Features
Add new commands in `src/bot.js`:
- Custom searches
- Filters (price, rating)
- Booking features
- Payment integration

---

## 📞 Your Bot Details

**WhatsApp Number:** +234 903 520 4046  
**Bot Name:** Midex  
**Database:** 3,016 restaurants + 1,345 hotels  
**Coverage:** All 37 Nigerian states  
**Status:** ✅ Operational

---

## 🎉 Ready to Go Live?

**Run this now to test:**
```bash
cd ~/MidDexBot-WhatsApp && ./test-bot.sh
```

**Then share with the world:**
```
https://wa.me/2349035204046?text=!start
```

Good luck! 🚀
