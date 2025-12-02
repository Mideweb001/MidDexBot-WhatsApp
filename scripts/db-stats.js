#!/usr/bin/env node

/**
 * Database Statistics Script
 * Shows current counts and status
 */

require('dotenv').config();
const db = require('../src/models');

async function getStats() {
  try {
    console.log('🔍 Connecting to database...\n');
    
    // Test connection
    await db.sequelize.authenticate();
    console.log('✅ Database connected successfully!\n');
    
    // Get counts
    console.log('📊 Database Statistics:');
    console.log('═'.repeat(50));
    
    const restaurantCount = await db.Restaurant.count();
    console.log(`🍽️  Restaurants: ${restaurantCount.toLocaleString()}`);
    
    const hotelCount = await db.Hotel.count();
    console.log(`🏨 Hotels: ${hotelCount.toLocaleString()}`);
    
    const userCount = await db.User.count();
    console.log(`👥 Users: ${userCount.toLocaleString()}`);
    
    const businessCount = await db.Business.count();
    console.log(`🛍️  Businesses: ${businessCount.toLocaleString()}`);
    
    const conversationCount = await db.Conversation.count();
    console.log(`💬 Conversations: ${conversationCount.toLocaleString()}`);
    
    console.log('═'.repeat(50));
    console.log('');
    
    // Get sample data
    if (restaurantCount > 0) {
      console.log('📍 Sample Restaurants:');
      const sampleRestaurants = await db.Restaurant.findAll({
        limit: 5,
        attributes: ['name', 'address', 'rating'],
        order: [['rating', 'DESC']]
      });
      sampleRestaurants.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.name} (${r.rating || 'N/A'}★)`);
        console.log(`      ${r.address}`);
      });
      console.log('');
    }
    
    if (hotelCount > 0) {
      console.log('🏨 Sample Hotels:');
      const sampleHotels = await db.Hotel.findAll({
        limit: 5,
        attributes: ['name', 'location', 'rating'],
        order: [['rating', 'DESC']]
      });
      sampleHotels.forEach((h, i) => {
        console.log(`   ${i + 1}. ${h.name} (${h.rating || 'N/A'}★)`);
        console.log(`      ${h.location}`);
      });
      console.log('');
    }
    
    // Database info
    console.log('ℹ️  Database Info:');
    console.log(`   Engine: ${db.sequelize.getDialect()}`);
    console.log(`   Host: ${db.sequelize.config.host || 'localhost'}`);
    console.log(`   Database: ${db.sequelize.config.database || 'database.sqlite'}`);
    console.log('');
    
    await db.sequelize.close();
    console.log('✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   - Check DATABASE_URL is set');
    console.error('   - Verify database is accessible');
    console.error('   - Run: railway variables | grep DATABASE_URL');
    process.exit(1);
  }
}

// Run
getStats();
