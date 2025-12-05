#!/bin/bash

echo "🚀 Starting WhatsApp Bot for Testing..."
echo ""
echo "✅ Fixes Applied:"
echo "  - Service exports fixed (classes not instances)"
echo "  - Database sync uses safe authenticate mode"
echo "  - Contact lookup errors are non-critical"
echo ""
echo "📱 HOW TO TEST:"
echo "  1. Scan the QR code below with WhatsApp"
echo "  2. Send a message to your own WhatsApp: !ping"
echo "  3. Try: !state Lagos"
echo "  4. Try: !hotelstate Abuja"
echo "  5. Try: !stats"
echo ""
echo "⏹️  Press Ctrl+C to stop the bot"
echo ""
echo "════════════════════════════════════════════════════"
echo ""

node src/bot.js
