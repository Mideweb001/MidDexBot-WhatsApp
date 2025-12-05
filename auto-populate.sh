#!/bin/bash

# Auto Population Script
# Automatically runs restaurant population followed by hotel population

echo "🚀 Starting Automatic Database Population"
echo "════════════════════════════════════════════════════════"
echo ""

cd ~/MidDexBot-WhatsApp

# Step 1: Populate Restaurants
echo "📍 Step 1/3: Populating Restaurants (3,001 entries)"
echo "────────────────────────────────────────────────────────"
echo "⏰ Estimated time: 8-12 minutes"
echo "📝 Logging to: restaurant-population.log"
echo ""

railway run npm run populate:restaurants 2>&1 | tee restaurant-population.log

# Check if successful
if grep -q "🎉" restaurant-population.log; then
    echo ""
    echo "✅ Restaurant population completed successfully!"
    echo ""
    
    # Step 2: Populate Hotels
    echo "🏨 Step 2/3: Populating Hotels (1,347 entries)"
    echo "────────────────────────────────────────────────────────"
    echo "⏰ Estimated time: 5-8 minutes"
    echo "📝 Logging to: hotel-population.log"
    echo ""
    
    railway run npm run populate:hotels 2>&1 | tee hotel-population.log
    
    # Check if successful
    if grep -q "🎉" hotel-population.log; then
        echo ""
        echo "✅ Hotel population completed successfully!"
        echo ""
        
        # Step 3: Verify
        echo "📊 Step 3/3: Verifying Database"
        echo "────────────────────────────────────────────────────────"
        echo ""
        
        railway run npm run db:stats
        
        echo ""
        echo "════════════════════════════════════════════════════════"
        echo "🎉 ALL POPULATION COMPLETE!"
        echo "════════════════════════════════════════════════════════"
        echo ""
        echo "✅ Restaurants: 3,001 entries"
        echo "✅ Hotels: 1,347 entries"
        echo "✅ Total: 4,348 entries"
        echo ""
        echo "🚀 Ready to test! Run:"
        echo "   $ ./test-local.sh"
        echo ""
    else
        echo ""
        echo "❌ Hotel population failed!"
        echo "Check hotel-population.log for errors"
        echo ""
        exit 1
    fi
else
    echo ""
    echo "❌ Restaurant population failed!"
    echo "Check restaurant-population.log for errors"
    echo ""
    exit 1
fi
