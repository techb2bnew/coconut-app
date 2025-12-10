/**
 * @format
 */

// IMPORTANT: Import URL polyfill FIRST before any other imports
// This is required for Supabase to work properly with React Native
import 'react-native-url-polyfill/auto';

// IMPORTANT: Set up background message handler BEFORE any other imports
// This must be registered outside of React component lifecycle
import { setupBackgroundMessageHandler } from './src/services/firebaseMessaging';
setupBackgroundMessageHandler();

import 'react-native-screens';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
