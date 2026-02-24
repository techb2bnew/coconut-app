/**
 * @format
 */

// IMPORTANT: Import Reanimated FIRST before any other imports
// This is required for react-native-reanimated to work properly
import 'react-native-reanimated';

// IMPORTANT: Import URL polyfill before any other imports
// This is required for Supabase to work properly with React Native
import 'react-native-url-polyfill/auto';

// IMPORTANT: Set up background message handler BEFORE any other imports
// This must be registered outside of React component lifecycle
// Wrapped in try-catch so TestFlight/production build does not crash if Firebase init fails
try {
  const { setupBackgroundMessageHandler } = require('./src/services/firebaseMessaging');
  setupBackgroundMessageHandler();
} catch (e) {
  if (__DEV__) {
    console.warn('Firebase background message handler setup failed:', e?.message || e);
  }
}

import 'react-native-screens';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
