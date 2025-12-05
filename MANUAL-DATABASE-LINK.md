# Manual Database Linking Instructions

## Step 1: Link Database in Railway Dashboard

The Railway dashboard should have opened automatically. Follow these steps:

1. **In the Railway Dashboard:**
   - You should see two services: `MidDexBot-WhatsApp` (your bot) and `Postgres` (database)
   - Click on the **MidDexBot-WhatsApp** service (not Postgres)

2. **Go to Variables Tab:**
   - Click on the **"Variables"** tab
   - Click **"+ New Variable"** or **"Reference"**

3. **Add Database Reference:**
   - Click on **"Add Reference"**
   - Select **"DATABASE_URL"** from the Postgres service
   - This will automatically add: `${{Postgres.DATABASE_URL}}`

4. **Save and Redeploy:**
   - The service will automatically redeploy with the new DATABASE_URL
   - Wait 1-2 minutes for deployment to complete

## Step 2: Verify DATABASE_URL

After the dashboard is set up, run this command to verify:

```bash
cd ~/MidDexBot-WhatsApp
railway variables | grep DATABASE
```

You should see output like:
```
DATABASE_URL │ postgres://postgres:...@...railway.app:5432/railway
```

## Step 3: Populate Database

Once DATABASE_URL is confirmed, run these commands:

### Option A: Automated (Recommended)
```bash
cd ~/MidDexBot-WhatsApp
./scripts/setup-production-db.sh
```

### Option B: Manual Step-by-Step
```bash
cd ~/MidDexBot-WhatsApp

# 1. Populate restaurants (3,001 entries, ~5-10 minutes)
railway run npm run populate:restaurants

# 2. Populate hotels (1,347 entries, ~5-10 minutes)
railway run npm run populate:hotels

# 3. Check statistics
railway run npm run db:stats
```

## Expected Output

After successful population, you should see:

```
✅ Database Statistics:
📊 Total restaurants: 3,001
📊 Total hotels: 1,347
📊 Total users: 0
📊 Coverage: 37 Nigerian states
```

## Troubleshooting

### If DATABASE_URL is not showing:
1. Make sure both services are in the same project
2. Try adding a variable manually: 
   - Name: `DATABASE_URL`
   - Value: Copy from Postgres service's variables

### If population fails:
1. Check Railway logs: `railway logs --tail 50`
2. Verify connection: `railway run node -e "console.log(process.env.DATABASE_URL ? 'Connected' : 'Not connected')"`
3. Check Postgres service is running in Railway dashboard

### If QR authentication keeps failing:
This is a known issue with Railway's ephemeral storage. Options:
1. Use Railway's **Volumes** feature to persist WhatsApp session
2. Deploy to a VPS with persistent storage (DigitalOcean, AWS, etc.)
3. Use Railway for database only, run bot locally

---

**Next Steps After Database Population:**
1. Test bot commands: `!state Lagos`, `!hotelstate Abuja`
2. Verify search results are populated
3. Test all menu options
4. Monitor Railway logs for any errors
