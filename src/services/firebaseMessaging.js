/**
 * Firebase Cloud Messaging Service
 * Handles push notifications via FCM
 */

import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid, Alert, DeviceEventEmitter } from 'react-native';
import Toast from 'react-native-toast-message';
import supabase from '../config/supabase';
import { getCustomerId } from './notificationService';

// Event name for notification refresh
export const NOTIFICATION_RECEIVED_EVENT = 'notificationReceived';

/**
 * Request notification permissions for Android and iOS
 */
export const requestNotificationPermission = async () => {
  try {
    // Direct notification permission request for all Android versions
    if (Platform.OS === 'android') { 
      
      // Check current permission status first
      let permissionAvailable = false;
      let currentStatus = null;
      try {
        if (PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
          permissionAvailable = true;
          currentStatus = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          ); 
        } else {
          console.log('📱 POST_NOTIFICATIONS permission not available on this Android version (API < 33)');
        }
      } catch (err) {
        console.log('📱 POST_NOTIFICATIONS permission check failed:', err.message);
      }

      // Direct POST_NOTIFICATIONS permission request (works on Android 13+, gracefully fails on older versions)
      if (permissionAvailable) {
        console.log('🔔 Requesting POST_NOTIFICATIONS permission...');
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'This app needs notification permission to send you important updates and alerts.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'Allow',
            }
          );
 

          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('✅ Android POST_NOTIFICATIONS permission granted');
          } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
            console.log('❌ Android POST_NOTIFICATIONS permission denied');
           
          } else {
            console.log('⚠️ Android POST_NOTIFICATIONS permission: Ask Me Later');
           
          }
        } catch (err) {
          console.error('❌ Error requesting POST_NOTIFICATIONS permission:', err);
          console.error('Error details:', err.message);
          console.log('📱 Continuing with FCM permission...');
        }
      } else {
        console.log('📱 POST_NOTIFICATIONS permission not available, continuing with FCM permission only');
      } 
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Android notification permission granted');
        return true;
      } else {
        console.log('❌ Android notification permission denied');
        
        return false;
      }
    } else {
      // iOS - Use FCM permission request
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ iOS notification permission granted');
        return true;
      } else {
        console.log('❌ iOS notification permission denied'); 
        return false;
      }
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Get FCM token
 */
export const getFCMToken = async () => {
  try {
    // For iOS, register device first
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }

    const token = await messaging().getToken(); 
    
    if (!token) {
      console.error('❌ FCM token is null or undefined');
      console.error('Check Firebase configuration and google-services.json file');
    }
    
    return token;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    // On iOS simulator, FCM token may not be available - this is expected
    if (Platform.OS === 'ios' && error.message?.includes('aps-environment')) {
      console.warn('⚠️  Push notifications not configured. FCM token requires proper entitlements.');
      console.warn('💡 To enable: Add Push Notifications capability in Xcode and configure entitlements.');
    }
    return null;
  }
};

/**
 * Save FCM token to Supabase
 */
export const saveFCMTokenToSupabase = async (fcmToken) => {
  try {
    if (!fcmToken) {
      console.log('No FCM token to save');
      return false;
    }

    const customerId = await getCustomerId();
    if (!customerId) {
      console.log('⚠️ No customer ID found - User not logged in yet. Token will be saved after login.');
      // Store token temporarily - will be saved after login
      // You can use AsyncStorage or wait for login
      return false;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No authenticated user');
      return false;
    }

    // Update FCM token in customers table
    // Note: Make sure fcm_token and fcm_token_updated_at columns exist in customers table
    const { error } = await supabase
      .from('customers')
      .update({ 
        fcm_token: fcmToken, 
        fcm_token_updated_at: new Date().toISOString() 
      })
      .eq('id', customerId);

    if (error) {
      console.error('❌ Error saving FCM token:', error);
      if (error.code === 'PGRST204') {
        console.error('❌ fcm_token column does not exist in customers table!');
       
      }
      return false;
    }

    console.log('✅ FCM token saved to Supabase for customer:', customerId);
    return true;
  } catch (error) {
    console.error('Error in saveFCMTokenToSupabase:', error);
    return false;
  }
};

/**
 * Initialize FCM and get token
 */
export const initializeFCM = async () => {
  try {
    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return null;
    }

    // Get FCM token
    const token = await getFCMToken();
    if (token) {
      // Try to save token to Supabase (will fail if user not logged in, that's OK)
      const saved = await saveFCMTokenToSupabase(token);
      if (!saved) {
        console.log('ℹ️ FCM token generated but not saved yet (user not logged in). Will be saved after login.');
      }
    }

    return token;
  } catch (error) {
    console.error('Error initializing FCM:', error);
    return null;
  }
};

/**
 * Set up foreground message handler
 * Shows toast when app is in foreground
 */
export const setupForegroundMessageHandler = () => {
  return messaging().onMessage(async (remoteMessage) => { 
    
    const notification = remoteMessage.notification;
    if (notification) {
      // Show toast for foreground notifications
      Toast.show({
        type: 'info',
        text1: notification.title || 'New Notification',
        text2: notification.body || 'You have a new notification',
        visibilityTime: 4000,
        topOffset: 60,
        onPress: () => {
          console.log('Toast notification pressed');
          Toast.hide();
        },
      });
    }

    // Also handle data payload if present
    const data = remoteMessage.data;
    if (data) {
      console.log('📨 Message data:', data);
      
      // If it's an admin notification, trigger refresh event
      if (data.type === 'admin_notification') {
        console.log('🔄 Admin notification received, triggering refresh event...');
        // Emit event to refresh notifications
        DeviceEventEmitter.emit(NOTIFICATION_RECEIVED_EVENT, data);
      }
    }
  });
};

/**
 * Set up background message handler
 * This handler must be registered outside of React component
 */
export const setupBackgroundMessageHandler = () => {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('📨 Background message received:', remoteMessage);
    // Background messages are automatically displayed by FCM
    // No need to show toast here
  });
};

/**
 * Get initial notification when app opened from quit state
 */
export const getInitialNotification = async () => {
  try {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      console.log('📨 App opened from notification:', remoteMessage);
      return remoteMessage;
    }
    return null;
  } catch (error) {
    console.error('Error getting initial notification:', error);
    return null;
  }
};

/**
 * Set up notification opened handler (when app is in background)
 */
export const setupNotificationOpenedHandler = (callback) => {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('📨 Notification opened app:', remoteMessage);
    if (callback) {
      callback(remoteMessage);
    }
  });
};

/**
 * Handle token refresh
 */
export const setupTokenRefreshHandler = () => {
  return messaging().onTokenRefresh(async (token) => {
    console.log('🔄 FCM token refreshed:', token);
    await saveFCMTokenToSupabase(token);
  });
};

/**
 * Save FCM token after user login
 * Call this function after successful login
 */
export const saveFCMTokenAfterLogin = async () => {
  try {
    const token = await getFCMToken();
    if (token) {
      const saved = await saveFCMTokenToSupabase(token);
      if (saved) {
        console.log('✅ FCM token saved after login');
      } else {
        console.log('⚠️ Failed to save FCM token after login');
      }
      return saved;
    }
    return false;
  } catch (error) {
    console.error('Error saving FCM token after login:', error);
    return false;
  }
};

