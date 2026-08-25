/**
 * Cloud Functions Entry Point
 * 
 * Imports and exports all function groups to keep the entry point clean.
 */

const { initializeApp } = require('firebase-admin/app');

// Initialize Admin SDK once
initializeApp();

// Export function groups (stubs for now)
// exports.stock = require('./src/stock');
// exports.billing = require('./src/billing');
exports.notifications = require('./src/notifications');
exports.transfers = require('./src/transferNotifications');
