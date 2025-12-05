#!/bin/bash

# Population Monitor Script
# Monitors the progress of restaurant and hotel population

echo "📊 Database Population Monitor"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if restaurant population is running
RESTAURANT_PID=$(ps aux | grep "populate-restaurants" | grep -v grep | awk '{print $2}')
HOTEL_PID=$(ps aux | grep "populate-hotels" | grep -v grep | awk '{print $2}')

if [ ! -z "$RESTAURANT_PID" ]; then
    echo "🍽️  Restaurant Population: ✅ RUNNING (PID: $RESTAURANT_PID)"
    
    # Count completed cities
    if [ -f restaurant-population.log ]; then
        COMPLETED=$(grep "Complete:" restaurant-population.log | wc -l | tr -d ' ')
        CURRENT_CITY=$(tail -50 restaurant-population.log | grep "📍" | tail -1)
        
        echo "   Progress: $COMPLETED/37 cities completed"
        echo "   Current: $CURRENT_CITY"
        echo ""
        
        # Show last 5 completed cities
        echo "   Recent completions:"
        grep "Complete:" restaurant-population.log | tail -5 | sed 's/^/     /'
    fi
else
    echo "🍽️  Restaurant Population: ⏹️  NOT RUNNING"
    
    if [ -f restaurant-population.log ]; then
        # Check if it completed
        if grep -q "🎉" restaurant-population.log; then
            echo "   Status: ✅ COMPLETED"
            TOTAL=$(grep "Total restaurants:" restaurant-population.log | tail -1)
            echo "   $TOTAL"
        else
            COMPLETED=$(grep "Complete:" restaurant-population.log | wc -l | tr -d ' ')
            echo "   Last status: $COMPLETED/37 cities completed"
        fi
    fi
fi

echo ""

if [ ! -z "$HOTEL_PID" ]; then
    echo "🏨 Hotel Population: ✅ RUNNING (PID: $HOTEL_PID)"
    
    if [ -f hotel-population.log ]; then
        COMPLETED=$(grep "Complete:" hotel-population.log | wc -l | tr -d ' ')
        CURRENT_CITY=$(tail -50 hotel-population.log | grep "📍" | tail -1)
        
        echo "   Progress: $COMPLETED/37 cities completed"
        echo "   Current: $CURRENT_CITY"
    fi
else
    echo "🏨 Hotel Population: ⏹️  NOT RUNNING"
    
    if [ -f hotel-population.log ]; then
        if grep -q "🎉" hotel-population.log; then
            echo "   Status: ✅ COMPLETED"
            TOTAL=$(grep "Total hotels:" hotel-population.log | tail -1)
            echo "   $TOTAL"
        fi
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo ""

# Database stats if available
echo "📈 Database Statistics:"
echo "────────────────────────────────────────────────────────"

# Try to get stats from Railway
cd ~/MidDexBot-WhatsApp
railway run node -e "
const db = require('./src/models');
(async () => {
  try {
    await db.sequelize.authenticate();
    const restaurants = await db.Restaurant.count();
    const hotels = await db.Hotel.count();
    const users = await db.User.count();
    
    console.log('   📍 Restaurants: ' + restaurants);
    console.log('   🏨 Hotels: ' + hotels);
    console.log('   👥 Users: ' + users);
    
    process.exit(0);
  } catch (error) {
    console.log('   ❌ Unable to fetch stats (database may be busy)');
    process.exit(1);
  }
})();
" 2>/dev/null || echo "   ⏳ Database busy or unreachable"

echo ""
echo "════════════════════════════════════════════════════════"
echo ""

# Next steps
if [ -z "$RESTAURANT_PID" ] && [ -z "$HOTEL_PID" ]; then
    echo "💡 Next Steps:"
    echo ""
    
    if [ -f restaurant-population.log ] && grep -q "🎉" restaurant-population.log; then
        echo "   ✅ Restaurants complete!"
        if [ -f hotel-population.log ] && grep -q "🎉" hotel-population.log; then
            echo "   ✅ Hotels complete!"
            echo ""
            echo "   🎉 All done! Start testing:"
            echo "   $ ./test-local.sh"
        else
            echo "   ⏭️  Start hotel population:"
            echo "   $ railway run npm run populate:hotels | tee hotel-population.log"
        fi
    else
        echo "   ⏭️  Start restaurant population:"
        echo "   $ railway run npm run populate:restaurants | tee restaurant-population.log"
    fi
fi

echo ""
echo "🔄 Refresh this monitor: ./monitor-population.sh"
echo ""
