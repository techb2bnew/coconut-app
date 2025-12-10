/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useEffect } from 'react';
import { StatusBar, useColorScheme, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation/AppNavigator';
import { fontFamily } from './src/theme/fonts';
import {
  initializeFCM,
  setupForegroundMessageHandler,
  setupNotificationOpenedHandler,
  setupTokenRefreshHandler,
  getInitialNotification,
} from './src/services/firebaseMessaging';

// Set default font family for all Text components globally
// Create a default style that includes the font family
const defaultTextStyle = StyleSheet.create({
  default: {
    fontFamily: fontFamily,
  },
});

// Set defaultProps to apply font to all Text components
// Using type assertion for TypeScript compatibility
const TextComponent = Text as any;
if (!TextComponent.defaultProps) {
  TextComponent.defaultProps = {};
}
// Merge font family into default style
TextComponent.defaultProps.style = defaultTextStyle.default;

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // Initialize Firebase Cloud Messaging
    const initFCM = async () => {
      try {
        console.log('🚀 Initializing Firebase Cloud Messaging...');
        
        // Check if app was opened from notification (quit state)
        const initialNotification = await getInitialNotification();
        if (initialNotification) {
          console.log('📨 App opened from notification:', initialNotification);
          // Handle navigation or other actions here
        }

        // Initialize FCM and get token
        console.log('🔧 Requesting notification permissions...');
        const token = await initializeFCM();
        
        if (token) {
          console.log('✅ FCM initialized successfully');
          console.log('📱 FCM Token (first 20 chars):', token.substring(0, 20) + '...');
        } else {
          console.warn('⚠️ FCM token not generated. Check permissions and Firebase setup.');
        }

        // Set up foreground message handler
        console.log('🔧 Setting up foreground message handler...');
        const unsubscribeForeground = setupForegroundMessageHandler();
        console.log('✅ Foreground handler set up');

        // Set up notification opened handler (background state)
        console.log('🔧 Setting up notification opened handler...');
        const unsubscribeOpened = setupNotificationOpenedHandler((remoteMessage: any) => {
          console.log('📨 Notification opened app:', remoteMessage);
          // Handle navigation or other actions here
        });
        console.log('✅ Notification opened handler set up');

        // Set up token refresh handler
        console.log('🔧 Setting up token refresh handler...');
        const unsubscribeTokenRefresh = setupTokenRefreshHandler();
        console.log('✅ Token refresh handler set up');

        console.log('✅ FCM initialization complete!');

        // Cleanup on unmount
        return () => {
          console.log('🧹 Cleaning up FCM handlers...');
          unsubscribeForeground();
          unsubscribeOpened();
          unsubscribeTokenRefresh();
        };
      } catch (error) {
        console.error('❌ Error initializing FCM:', error);
        // console.error('Error stack:', error.stack);
      }
    };

    initFCM();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppNavigator />
      <Toast />
    </SafeAreaProvider>
  );
}

export default App;
