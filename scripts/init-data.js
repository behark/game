#!/usr/bin/env node

/**
 * Initialize Speed Rivals with default products and tournaments
 * Run this script after setting up the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { initializeProducts } = require('../data/defaultProducts');
const { initializeTournaments } = require('../data/defaultTournaments');

async function initializeData() {
  try {
    console.log('🚀 Initializing Speed Rivals monetization data...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/speed-rivals', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });

    console.log('📦 Connected to MongoDB');

    // Initialize products
    console.log('🛍️ Initializing products...');
    await initializeProducts();

    // Initialize tournaments
    console.log('🏆 Initializing tournaments...');
    await initializeTournaments();

    console.log('✅ Data initialization completed successfully!');
    console.log('');
    console.log('🎮 Your Speed Rivals monetization system is ready!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Configure your Stripe keys in .env');
    console.log('2. Start the server: npm start');
    console.log('3. Visit http://localhost:3000/monetization for the dashboard');
    console.log('4. Visit http://localhost:3000/hub for the game');
    console.log('');

  } catch (error) {
    console.error('❌ Error initializing data:', error.message);
    console.log('');
    console.log('💡 Make sure MongoDB is running:');
    console.log('   - Local: mongod');
    console.log('   - Or use MongoDB Atlas and update MONGODB_URI in .env');
    console.log('');
    console.log('⚠️  The game will work without MongoDB (core features only)');
    console.log('💡 Monetization features require MongoDB connection');
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
    process.exit(0);
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeData();
}

module.exports = { initializeData };