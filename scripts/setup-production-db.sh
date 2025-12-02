#!/bin/bash

# WhatsApp Bot Production Database Setup Script
# This script helps you populate the production database

echo "🚀 MidDexBot WhatsApp - Database Population Script"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the MidDexBot-WhatsApp directory"
    exit 1
fi

# Check if Railway CLI is logged in
if ! railway whoami > /dev/null 2>&1; then
    echo "❌ Error: Not logged into Railway CLI"
    echo "Run: railway login"
    exit 1
fi

echo "✅ Railway CLI authenticated"
echo ""

# Check for PostgreSQL
echo "🔍 Checking for PostgreSQL database..."
if railway variables | grep -q "DATABASE_URL"; then
    echo "✅ PostgreSQL database found"
    DATABASE_URL=$(railway variables | grep DATABASE_URL | awk '{print $3}')
    echo "   $DATABASE_URL"
else
    echo "⚠️  No PostgreSQL database detected"
    echo ""
    echo "📋 To add PostgreSQL:"
    echo "   1. Go to Railway dashboard: railway open"
    echo "   2. Click '+ New' button"
    echo "   3. Select 'Database' → 'PostgreSQL'"
    echo "   4. Wait 1-2 minutes for provisioning"
    echo "   5. Run this script again"
    echo ""
    read -p "Press Enter to open Railway dashboard..."
    railway open
    exit 0
fi

echo ""
echo "📊 Starting database population..."
echo ""

# Populate Restaurants
echo "🍽️  Step 1: Populating Restaurants (3,001 entries)"
echo "   This will take 5-10 minutes..."
echo ""
railway run npm run populate:restaurants

if [ $? -eq 0 ]; then
    echo "✅ Restaurants populated successfully!"
else
    echo "❌ Error populating restaurants"
    exit 1
fi

echo ""
echo "─────────────────────────────────────────────────"
echo ""

# Populate Hotels
echo "🏨 Step 2: Populating Hotels (1,347 entries)"
echo "   This will take 5-10 minutes..."
echo ""
railway run npm run populate:hotels

if [ $? -eq 0 ]; then
    echo "✅ Hotels populated successfully!"
else
    echo "❌ Error populating hotels"
    exit 1
fi

echo ""
echo "═════════════════════════════════════════════════"
echo "🎉 Database Population Complete!"
echo "═════════════════════════════════════════════════"
echo ""

# Get statistics
echo "📊 Database Statistics:"
echo ""
railway run node -e "
const db = require('./src/models');
(async () => {
  try {
    await db.sequelize.authenticate();
    const restaurantCount = await db.Restaurant.count();
    const hotelCount = await db.Hotel.count();
    const userCount = await db.User.count();
    
    console.log('✅ Restaurants:', restaurantCount);
    console.log('✅ Hotels:', hotelCount);
    console.log('✅ Users:', userCount);
    
    await db.sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
"

echo ""
echo "🎯 Next Steps:"
echo "   1. Test your WhatsApp bot"
echo "   2. Send: !state Lagos"
echo "   3. Send: !hotelstate Abuja"
echo "   4. Verify results"
echo ""
echo "📱 Happy chatting!"
