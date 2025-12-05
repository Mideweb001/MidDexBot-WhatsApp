# Quick Start: Test Your WhatsApp Bot 🚀

## 🎯 You're Ready to Test!

Your WhatsApp bot is deployed on Railway with a populated PostgreSQL database. Now test it locally before going live.

---

## Option 1: One-Command Test (Easiest) ⚡

```bash
cd ~/MidDexBot-WhatsApp
./test-local.sh
```

**That's it!** The script will:
1. Check your .env configuration
2. Install dependencies if needed
3. Start the bot
4. Display a QR code

**Then:**
1. Open WhatsApp on your phone
2. Go to **Settings → Linked Devices**
3. Tap **Link a Device**
4. Scan the QR code
5. Start testing with `!ping`

---

## Option 2: Manual Test (More Control) 🔧

### Step 1: Start the Bot
```bash
cd ~/MidDexBot-WhatsApp
node src/bot.js
```

### Step 2: Scan QR Code
When you see the QR code in your terminal:
1. Open WhatsApp → Settings → Linked Devices
2. Scan the code
3. Wait for "✅ WhatsApp authenticated successfully!"

### Step 3: Test Commands
Send these from your WhatsApp:

```
!ping
!start
!state Lagos
!hotelstate Abuja
!stats
!help
```

### Step 4: Stop the Bot
Press `Ctrl+C` in terminal

---

## 🧪 Essential Test Commands

| Command | Expected Result |
|---------|----------------|
| `!ping` | 🏓 Pong! Bot is responsive. |
| `!start` | Welcome menu with 6 categories |
| `!state Lagos` | List of 10+ Lagos restaurants |
| `!hotelstate Abuja` | List of 10+ Abuja hotels |
| `!stats` | Shows 3,001 restaurants + 1,347 hotels |
| `!help` | List of all available commands |

---

## ✅ What to Verify

- [ ] QR code appears and scans successfully
- [ ] Bot responds to `!ping` within 2 seconds
- [ ] Restaurant search returns Lagos restaurants
- [ ] Hotel search returns Abuja hotels
- [ ] Stats show correct database numbers
- [ ] No errors in terminal during testing
- [ ] Bot stays connected (doesn't disconnect)

---

## 🚫 Common Issues & Quick Fixes

### QR Code Expires
**Solution:** Just restart the bot (`Ctrl+C` then `./test-local.sh`)

### "Database connection failed"
**Solution:** Check your .env file has the correct DATABASE_URL

### "No restaurants found"
**Solution:** Wait for the population script to finish (check restaurant-population.log)

### Bot doesn't respond
**Solution:** 
1. Check bot is running: `ps aux | grep "node src/bot.js"`
2. Check WhatsApp connection: Send `!ping`
3. Restart bot if needed

---

## 📊 Check Population Status

While testing, verify your database is populated:

```bash
cd ~/MidDexBot-WhatsApp

# Check restaurant population progress
tail -20 restaurant-population.log | grep "Complete"

# Check database stats
railway run npm run db:stats
```

**Expected output:**
```
✅ Database Statistics:
📊 Total restaurants: 3,001
📊 Total hotels: 1,347
📊 Total users: 1
```

---

## 🎯 Next Steps After Successful Testing

Once you've verified everything works:

### 1. Deploy with Persistent Storage
```bash
cd ~/MidDexBot-WhatsApp
railway open
```
- Go to Settings → Volumes
- Add volume at `/app/whatsapp-sessions`
- Size: 1 GB
- This fixes QR authentication persistence

### 2. Monitor Production
```bash
railway logs --tail 100
```

### 3. Go Live!
- Share your WhatsApp number
- Monitor for errors
- Test with real users
- Scale as needed

---

## 📚 Full Documentation

- **Complete Testing Guide:** `TESTING-GUIDE.md`
- **Database Population:** `POPULATION-PROGRESS.md`
- **Deployment Status:** `CURRENT-STATUS-REPORT.md`
- **Project Overview:** `PROJECT-COMPLETE-SUMMARY.md`
- **Setup Instructions:** `FINAL-SETUP-INSTRUCTIONS.md`

---

## 🆘 Need Help?

1. **Check logs:** `tail -100 restaurant-population.log`
2. **Test health:** `curl http://localhost:3000/health`
3. **Review errors:** Look for ❌ in terminal output
4. **Restart fresh:** `Ctrl+C`, wait 5 seconds, `./test-local.sh`

---

**Ready?** Run `./test-local.sh` and start testing! 🚀
