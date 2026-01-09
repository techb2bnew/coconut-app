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
      try {
        if (PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
          permissionAvailable = true;
          await PermissionsAndroid.check(
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
      // iOS - Use native iOS permission request (same as Android)
      try {
        // Request permission FIRST - this will show native iOS permission dialog
        // The dialog will automatically appear if permission is NOT_DETERMINED
        // If already authorized/denied, it won't show again (iOS behavior)
        console.log('🔔 Requesting iOS notification permission (native dialog will appear if not already determined)...');
        
        let authStatus;
        try {
          authStatus = await messaging().requestPermission({
            alert: true,
            badge: true,
            sound: true,
            provisional: false,
          });
        } catch (permissionError) {
          console.error('❌ requestPermission() threw an error:', permissionError);
          console.error('Error message:', permissionError.message);
          console.error('Error code:', permissionError.code);
          console.error('Error name:', permissionError.name);
          
          // Check if it's a specific error we can handle
          if (permissionError.message?.includes('already registered') || 
              permissionError.message?.includes('already requested')) {
            console.log('📱 Permission already requested, checking current status...');
            // Try to get current authorization status
            try {
              // Check if we can get token (indicates permission granted)
              const token = await messaging().getToken();
              if (token) {
                console.log('✅ Permission already granted (token available)');
                return true;
              }
            } catch (tokenError) {
              console.log('⚠️ Could not get token:', tokenError.message);
            }
          }
          
          // Re-throw to be caught by outer catch
          throw permissionError;
        }
        
        console.log('📱 iOS permission request result:', authStatus);
        console.log('📱 AuthorizationStatus values:', {
          NOT_DETERMINED: messaging.AuthorizationStatus.NOT_DETERMINED,
          DENIED: messaging.AuthorizationStatus.DENIED,
          AUTHORIZED: messaging.AuthorizationStatus.AUTHORIZED,
          PROVISIONAL: messaging.AuthorizationStatus.PROVISIONAL,
          'Current Status': authStatus,
        });
        
        // Check if permission is enabled
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        
        // AFTER permission is granted, register device for remote messages
        // This is required for iOS to receive APNS token
        if (enabled) {
          // Only register if permission is granted
          try {
            await messaging().registerDeviceForRemoteMessages();
            console.log('✅ iOS device registered for remote messages');
          } catch (registerError) {
            // This might fail if already registered - not critical
            console.log('⚠️ registerDeviceForRemoteMessages warning:', registerError.message);
            console.log('📱 This is usually not critical - device might already be registered');
          }
        }

        if (enabled) {
          console.log('✅ iOS notification permission granted, status:', authStatus);
          return true;
        } else {
          console.log('❌ iOS notification permission denied, status:', authStatus);
          
          // If permission was denied, show alert to guide user to Settings
          if (authStatus === messaging.AuthorizationStatus.DENIED) {
            Alert.alert(
              'Notification Permission Required',
              'This app needs notification permission to send you important updates and alerts. Please enable it in Settings.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Open Settings',
                  onPress: () => {
                    // Open iOS Settings app to app's settings page
                    const { Linking } = require('react-native');
                    Linking.openURL('app-settings:');
                  },
                },
              ]
            );
          }
          
          return false;
        }
      } catch (error) {
        console.error('❌ Error requesting iOS notification permission:', error);
        console.error('Error type:', typeof error);
        console.error('Error details:', error.message);
        console.error('Error code:', error.code);
        console.error('Error name:', error.name);
        console.error('Error stack:', error.stack);
        console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        // More specific error messages
        let errorMessage = 'Failed to request notification permission.';
        if (error.message?.includes('simulator')) {
          errorMessage = 'Push notifications are not supported on iOS Simulator. Please test on a real device.';
        } else if (error.message?.includes('entitlements') || error.message?.includes('aps-environment')) {
          errorMessage = 'Push notifications are not configured. Please enable Push Notifications capability in Xcode.';
        } else if (error.message) {
          errorMessage = `Failed to request notification permission: ${error.message}`;
        }
        
        Alert.alert(
          'Permission Error',
          errorMessage,
          [{ text: 'OK' }]
        );
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
    // Note: registerDeviceForRemoteMessages is now called in requestNotificationPermission
    // So we don't need to call it again here
    
    console.log('🔍 Getting FCM token...');
    const token = await messaging().getToken(); 
    
    if (!token) {
      console.error('❌ FCM token is null or undefined');
      console.error('Check Firebase configuration and GoogleService-Info.plist file');
      if (Platform.OS === 'ios') {
        console.error('For iOS: Make sure APNS token is set and entitlements are configured');
      }
    } else {
      console.log('✅ FCM token retrieved successfully');
      console.log('📱 Full FCM Token:', token);
      console.log('📱 FCM Token length:', token.length);
    }
    
    return token;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    // On iOS simulator, FCM token may not be available - this is expected
    if (Platform.OS === 'ios') {
      if (error.message?.includes('aps-environment')) {
        console.warn('⚠️  Push notifications not configured. FCM token requires proper entitlements.');
        console.warn('💡 To enable: Add Push Notifications capability in Xcode and configure entitlements.');
      } else {
        console.warn('⚠️  iOS FCM token error. Make sure:');
        console.warn('   1. App is running on a real device (not simulator)');
        console.warn('   2. Push Notifications capability is enabled in Xcode');
        console.warn('   3. APNS token is received (check AppDelegate logs)');
        console.warn('   4. Firebase is properly configured');
        console.warn('   5. Network connection is stable');
      }
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
  console.log('🔧 Setting up foreground message handler...');
  console.log('🔍 Platform:', Platform.OS);
  
  try {
    // Verify handler is being set up
    const messagingInstance = messaging();
    console.log('🔍 Messaging instance:', messagingInstance ? 'exists' : 'null');
    
    // IMPORTANT: Check if handler is already set up
    // React Native Firebase might have issues with multiple handlers
    const unsubscribe = messagingInstance.onMessage(async (remoteMessage) => { 
      console.log('📨 ========== FOREGROUND NOTIFICATION RECEIVED ==========');
      console.log('📨 Platform:', Platform.OS);
      console.log('📨 Full remoteMessage:', JSON.stringify(remoteMessage, null, 2));
      console.log('📨 Message ID:', remoteMessage?.messageId);
      console.log('📨 From:', remoteMessage?.from);
      console.log('📨 Sent Time:', remoteMessage?.sentTime);
      console.log('📨 RemoteMessage type:', typeof remoteMessage);
      console.log('📨 RemoteMessage keys:', Object.keys(remoteMessage || {}));
      
      // Handle both notification and data-only messages
      const notification = remoteMessage.notification;
      const data = remoteMessage.data;
      
      if (notification) {
        console.log('📨 Notification object exists');
        console.log('📨 Notification payload:', {
          title: notification.title,
          body: notification.body,
          android: notification.android,
          ios: notification.ios,
          data: remoteMessage.data
        });
        
        try {
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
          
          console.log('✅ Toast notification shown successfully');
        } catch (toastError) {
          console.error('❌ Error showing toast:', toastError);
          console.error('Toast error details:', toastError.message);
        }
      } else if (data) {
        // Handle data-only messages (no notification object)
        console.log('📨 Data-only message received (no notification object)');
        console.log('📨 Message data payload:', data);
        
        // Show toast for data-only messages too
        try {
          Toast.show({
            type: 'info',
            text1: data.title || 'New Notification',
            text2: data.body || data.message || 'You have a new notification',
            visibilityTime: 4000,
            topOffset: 60,
            onPress: () => {
              console.log('Toast notification pressed');
              Toast.hide();
            },
          });
          
          console.log('✅ Toast notification shown for data-only message');
        } catch (toastError) {
          console.error('❌ Error showing toast:', toastError);
          console.error('Toast error details:', toastError.message);
        }
      } else {
        console.warn('⚠️ Notification object is null or undefined');
        console.warn('⚠️ RemoteMessage structure:', Object.keys(remoteMessage));
        console.warn('⚠️ Full remoteMessage:', remoteMessage);
        
        // Even if no notification/data, try to show something
        try {
          Toast.show({
            type: 'info',
            text1: 'New Notification',
            text2: 'You have a new notification',
            visibilityTime: 4000,
            topOffset: 60,
          });
        } catch (e) {
          console.error('❌ Error showing fallback toast:', e);
        }
      }

      // Handle data payload
      if (data) {
        console.log('📨 Message data payload:', data);
        
        // If it's an admin notification, trigger refresh event
        if (data.type === 'admin_notification' || data.notification_type) {
          console.log('🔄 Admin notification received, triggering refresh event...');
          // Emit event to refresh notifications
          DeviceEventEmitter.emit(NOTIFICATION_RECEIVED_EVENT, data);
        }
      }
      
      console.log('📨 ========== END FOREGROUND NOTIFICATION ==========');
    });
    
    console.log('✅ Foreground message handler subscribed');
    console.log('🔍 Handler will trigger when notification received in foreground');
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up foreground message handler:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    // Return a no-op function to prevent crashes
    return () => {};
  }
};

/**
 * Set up background message handler
 * This handler must be registered outside of React component
 */
export const setupBackgroundMessageHandler = () => {
  console.log('🔧 Setting up background message handler...');
  try {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📨 ========== BACKGROUND MESSAGE RECEIVED ==========');
      console.log('📨 Platform:', Platform.OS);
      console.log('📨 Full remoteMessage:', JSON.stringify(remoteMessage, null, 2));
      console.log('📨 Message ID:', remoteMessage?.messageId);
      console.log('📨 From:', remoteMessage?.from);
      console.log('📨 Notification:', remoteMessage?.notification);
      console.log('📨 Data:', remoteMessage?.data);
      console.log('📨 ========== END BACKGROUND MESSAGE ==========');
      // Background messages are automatically displayed by FCM
      // No need to show toast here
    });
    console.log('✅ Background message handler registered');
  } catch (error) {
    console.error('❌ Error setting up background message handler:', error);
    console.error('Error details:', error.message);
  }
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

