#!/bin/bash

# WhatsApp Bot Testing Startup Script
# This script starts the bot locally for testing

echo "🚀 Starting MidDexBot WhatsApp for Testing..."
echo "================================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Run this command first:"
    echo ""
    echo "cat > .env << 'EOF'"
    echo "DATABASE_URL=postgresql://postgres:mcPZnsApvMWsoKYhZxMDZKKLCjZBlYpR@shuttle.proxy.rlwy.net:37672/railway"
    echo "GOOGLE_MAPS_API_KEY=AIzaSyBVX84gYl4Unw4qMhygFHxbSg6Y80MAB4o"
    echo "NODE_ENV=development"
    echo "PORT=3000"
    echo "EOF"
    echo ""
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Display instructions
echo "📱 TESTING INSTRUCTIONS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Wait for QR code to appear below"
echo "2. Open WhatsApp on your phone"
echo "3. Go to: Settings > Linked Devices"
echo "4. Tap: Link a Device"
echo "5. Scan the QR code"
echo "6. Wait for: ✅ WhatsApp authenticated successfully!"
echo ""
echo "Then test these commands:"
echo "  • !ping          - Test bot response"
echo "  • !start         - Show main menu"
echo "  • !state Lagos   - Search Lagos restaurants"
echo "  • !hotelstate Abuja - Search Abuja hotels"
echo "  • !stats         - Show database statistics"
echo "  • !help          - Show all commands"
echo ""
echo "Press Ctrl+C to stop the bot"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the bot
node src/bot.js
