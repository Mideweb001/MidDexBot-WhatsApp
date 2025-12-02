# 🚀 Production Database Setup Guide

## 📋 Overview

This guide will help you set up and populate the WhatsApp bot's production database on Railway.

---

## ✅ Prerequisites

1. ✅ Railway CLI installed and logged in
2. ✅ WhatsApp bot deployed on Railway
3. ⏳ PostgreSQL database (we'll add this)
4. ⏳ Bot authenticated with WhatsApp

---

## 🗄️ Step 1: Add PostgreSQL Database

### Option A: Via Railway Dashboard (Recommended)

1. Open Railway dashboard:
   ```bash
   cd ~/MidDexBot-WhatsApp
   railway open
   ```

2. In your project:
   - Click the **"+ New"** button (top right)
   - Select **"Database"**
   - Choose **"PostgreSQL"**
   - Wait 1-2 minutes for provisioning

3. Verify DATABASE_URL is set:
   ```bash
   railway variables | grep DATABASE_URL
   ```

### Option B: Via CLI (if available)

```bash
cd ~/MidDexBot-WhatsApp
railway add
# Select "Database" → "PostgreSQL"
```

---

## 📊 Step 2: Populate the Database

### Automated Setup (Recommended)

We've created an automated script that handles everything:

```bash
cd ~/MidDexBot-WhatsApp
./scripts/setup-production-db.sh
```

This script will:
1. ✅ Check Railway authentication
2. ✅ Verify PostgreSQL is configured
3. ✅ Populate 3,001 restaurants (5-10 min)
4. ✅ Populate 1,347 hotels (5-10 min)
5. ✅ Show database statistics

**Total time**: ~15-20 minutes

###  Manual Setup (Alternative)

If you prefer manual control:

#### 2.1 Populate Restaurants

```bash
cd ~/MidDexBot-WhatsApp
railway run npm run populate:restaurants
```

**Expected output:**
```
🍽️  Populating restaurants database...
📍 Adding restaurants for Lagos...
✅ Added 15 restaurants
📍 Adding restaurants for Abuja...
✅ Added 12 restaurants
...
🎉 Successfully populated 3,001 restaurants!
```

**Time**: 5-10 minutes

#### 2.2 Populate Hotels

```bash
cd ~/MidDexBot-WhatsApp
railway run npm run populate:hotels
```

**Expected output:**
```
🏨 Populating hotels database...
📍 Adding hotels for Lagos...
✅ Added 8 hotels
📍 Adding hotels for Abuja...
✅ Added 6 hotels
...
🎉 Successfully populated 1,347 hotels!
```

**Time**: 5-10 minutes

---

## 📊 Step 3: Verify Database

### Check Statistics

```bash
cd ~/MidDexBot-WhatsApp
railway run npm run db:stats
```

or

```bash
railway run node scripts/db-stats.js
```

**Expected output:**
```
📊 Database Statistics:
══════════════════════════════════════════════════
🍽️  Restaurants: 3,001
🏨 Hotels: 1,347
👥 Users: 1
🛍️  Businesses: 0
💬 Conversations: 0
══════════════════════════════════════════════════

📍 Sample Restaurants:
   1. The Place Restaurant (4.5★)
      Victoria Island, Lagos
   2. NOK by Alara (4.7★)
      Ikoyi, Lagos
   ...

🏨 Sample Hotels:
   1. Eko Hotel & Suites (4.8★)
      Victoria Island, Lagos
   2. Transcorp Hilton (4.6★)
      Maitama, Abuja
   ...
```

### Verify via WhatsApp

Send these commands to your WhatsApp bot:

1. **Test Restaurant Search:**
   ```
   !state Lagos
   ```
   **Expected**: List of 10+ restaurants in Lagos

2. **Test Hotel Search:**
   ```
   !hotelstate Abuja
   ```
   **Expected**: List of 10+ hotels in Abuja

3. **Test Other States:**
   ```
   !state Rivers      # Port Harcourt
   !hotelstate Kano
   !state Oyo         # Ibadan
   ```

---

## 🔧 Troubleshooting

### Issue: "No PostgreSQL database detected"

**Solution:**
```bash
# 1. Open Railway dashboard
railway open

# 2. Add PostgreSQL manually (+ New → Database → PostgreSQL)

# 3. Verify it was added
railway variables | grep DATABASE_URL

# 4. Run setup script again
./scripts/setup-production-db.sh
```

### Issue: "Error: connect ECONNREFUSED"

**Problem**: Database not accessible

**Solution:**
```bash
# 1. Check if DATABASE_URL is set
railway variables | grep DATABASE_URL

# 2. Check if database is running (Railway dashboard)

# 3. Try redeploying
railway up
```

### Issue: "Duplicate key error"

**Problem**: Database already has data

**Solution:**
```bash
# Option 1: Check current data
railway run npm run db:stats

# Option 2: Clear and repopulate (if needed)
railway run node -e "
const db = require('./src/models');
(async () => {
  await db.Restaurant.destroy({ where: {}, truncate: true });
  await db.Hotel.destroy({ where: {}, truncate: true });
  console.log('Cleared!');
  process.exit(0);
})();
"

# Then repopulate
./scripts/setup-production-db.sh
```

### Issue: Population scripts timeout

**Problem**: Scripts taking too long

**Solution:**
```bash
# Run in smaller batches by state
railway run node -e "
const db = require('./src/models');
const RestaurantService = require('./src/services/RestaurantDiscoveryService');
(async () => {
  const service = new RestaurantService(db);
  // Populate just Lagos first
  await service.populateByState('Lagos');
  await db.sequelize.close();
})();
"
```

---

## 📈 Database Schema

### Main Tables

#### Restaurants
- `id` - Primary key
- `name` - Restaurant name
- `address` - Full address
- `phone` - Contact number
- `rating` - Google rating (1-5)
- `tags` - JSON array [state, city, cuisine]
- `created_at`, `updated_at`

#### Hotels
- `id` - Primary key
- `name` - Hotel name
- `location` - Address
- `phone` - Contact
- `rating` - Rating (1-5)
- `price_range` - Budget/Mid/Luxury
- `amenities` - JSON array
- `created_at`, `updated_at`

#### Users
- `id` - Primary key
- `whatsapp_id` - WhatsApp phone number
- `telegram_id` - Telegram ID (null for WhatsApp users)
- `platform` - 'whatsapp' or 'telegram'
- `first_name`, `username`
- `created_at`, `updated_at`

---

## 🎯 Post-Setup Checklist

### Database ✅
- [ ] PostgreSQL added to Railway
- [ ] DATABASE_URL environment variable set
- [ ] 3,001 restaurants populated
- [ ] 1,347 hotels populated
- [ ] Statistics verified

### Testing ✅
- [ ] `!state Lagos` returns restaurants
- [ ] `!hotelstate Abuja` returns hotels
- [ ] All 37 states searchable
- [ ] Results show correct data (name, address, rating)

### Performance ✅
- [ ] Queries return within 2-3 seconds
- [ ] No timeout errors
- [ ] Multiple searches work consecutively

---

## 📊 Expected Results by State

### Top 10 States by Restaurant Count:
1. **Lagos**: ~300+ restaurants
2. **Abuja (FCT)**: ~200+ restaurants
3. **Rivers (Port Harcourt)**: ~150+ restaurants
4. **Kano**: ~100+ restaurants
5. **Oyo (Ibadan)**: ~100+ restaurants
6. **Kaduna**: ~80+ restaurants
7. **Edo (Benin City)**: ~70+ restaurants
8. **Delta (Warri)**: ~60+ restaurants
9. **Anambra (Onitsha)**: ~60+ restaurants
10. **Enugu**: ~50+ restaurants

### Top 10 States by Hotel Count:
1. **Lagos**: ~100+ hotels
2. **Abuja (FCT)**: ~80+ hotels
3. **Rivers (Port Harcourt)**: ~60+ hotels
4. **Kano**: ~40+ hotels
5. **Oyo (Ibadan)**: ~35+ hotels
6. **Kaduna**: ~30+ hotels
7. **Cross River (Calabar)**: ~25+ hotels
8. **Edo (Benin City)**: ~25+ hotels
9. **Delta**: ~20+ hotels
10. **Plateau (Jos)**: ~20+ hotels

---

## 🚀 Next Steps After Population

1. **Test Thoroughly**
   - Try all 37 states
   - Verify data accuracy
   - Check response times

2. **Monitor Performance**
   ```bash
   railway logs --follow
   ```

3. **Add More Features**
   - Study Hub
   - Career Tools
   - Crypto Trading
   - Marketplace

4. **Scale as Needed**
   - Upgrade Railway plan if needed
   - Add caching (Redis)
   - Optimize queries

---

## 📞 Support

- **Railway Dashboard**: `railway open`
- **View Logs**: `railway logs --tail 100`
- **Check Status**: `railway status`
- **Restart**: `railway redeploy`

---

**Made with ❤️ for Nigeria** 🇳🇬

*Last updated: December 2, 2025*
