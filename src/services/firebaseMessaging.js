/**
 * Firebase Cloud Messaging Service
 * Handles push notifications via FCM
 */

import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid, Alert, DeviceEventEmitter } from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../config/supabase';
import { getCustomerId } from './notificationService';
import { navigationRef } from '../navigation/AppNavigator';

// Event name for notification refresh
export const NOTIFICATION_RECEIVED_EVENT = 'notificationReceived';
// Event name for order navigation
export const ORDER_NAVIGATION_EVENT = 'orderNavigation';

// AsyncStorage key for last background notification
const LAST_BACKGROUND_NOTIFICATION_KEY = '@last_background_notification';

// Flag to prevent multiple simultaneous navigations
let isNavigating = false;
let lastNavigatedOrderId = null;
let navigationTimeout = null;

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
      if (Platform.OS === 'ios') {
        console.error('For iOS: Make sure APNS token is set and entitlements are configured');
      }
    } else { 
      console.log('📱 Full FCM Token:', token); 
    }
    
    return token;
  } catch (error) {
    
    // On iOS simulator, FCM token may not be available - this is expected
    if (Platform.OS === 'ios') {
      if (error.message?.includes('aps-environment')) {
         
      } else {
        console.warn('⚠️  iOS FCM token error. Make sure:');
        
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
  
  
  try {
    // Verify handler is being set up
    const messagingInstance = messaging();
    console.log('🔍 Messaging instance:', messagingInstance ? 'exists' : 'null');
    
    // IMPORTANT: Check if handler is already set up
    // React Native Firebase might have issues with multiple handlers
    const unsubscribe = messagingInstance.onMessage(async (remoteMessage) => { 
       
      
      // Handle both notification and data-only messages
      const notification = remoteMessage.notification;
      const data = remoteMessage.data;
      
      if (notification) { 
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
              console.log('🔔 ========== TOAST NOTIFICATION PRESSED ==========');
              console.log('🔔 Notification data:', data);
              console.log('🔔 Notification object:', notification);
              Toast.hide();
              
              // Extract order ID from notification
              const orderIdOrName = extractOrderId(data, notification);
              if (orderIdOrName) {
                console.log('📦 Order notification clicked, order ID/Name:', orderIdOrName);
                console.log('📦 Calling handleOrderNavigation...');
                handleOrderNavigation(orderIdOrName);
              } else {
                console.warn('⚠️ Could not extract order ID/Name from notification');
                console.warn('⚠️ Data keys:', Object.keys(data || {}));
              }
              console.log('🔔 ========== END TOAST PRESS ==========');
            },
          });
          
          console.log('✅ Toast notification shown successfully');
        } catch (toastError) {
          console.error('❌ Error showing toast:', toastError);
          console.error('Toast error details:', toastError.message);
        }
      } else if (data) {
        // Handle data-only messages (no notification object) 
        
          // Show toast for data-only messages too
        try {
          Toast.show({
            type: 'info',
            text1: data.title || 'New Notification',
            text2: data.body || data.message || 'You have a new notification',
            visibilityTime: 4000,
            topOffset: 60,
            onPress: () => {
              console.log('🔔 ========== TOAST NOTIFICATION PRESSED (DATA-ONLY) ==========');
              console.log('🔔 Notification data:', data);
              Toast.hide();
              
              // Extract order ID from notification
              const orderIdOrName = extractOrderId(data, null);
              if (orderIdOrName) {
                console.log('📦 Order notification clicked, order ID/Name:', orderIdOrName); 
                handleOrderNavigation(orderIdOrName);
              } else {
                console.warn('⚠️ Could not extract order ID/Name from notification');
                console.warn('⚠️ Data keys:', Object.keys(data || {}));
              }
              console.log('🔔 ========== END TOAST PRESS (DATA-ONLY) ==========');
            },
          });
          
          console.log('✅ Toast notification shown for data-only message');
        } catch (toastError) {
          console.error('❌ Error showing toast:', toastError); 
        }
      } else { 
        
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
        
        // If it's an admin notification, trigger refresh event
        if (data.type === 'admin_notification' || data.notification_type) {
          console.log('🔄 Admin notification received, triggering refresh event...');
          // Emit event to refresh notifications
          DeviceEventEmitter.emit(NOTIFICATION_RECEIVED_EVENT, data);
        }
      }
      
      console.log('📨 ========== END FOREGROUND NOTIFICATION ==========');
    });
     
    return unsubscribe;
  } catch (error) { 
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
      
      
      // Store the notification in AsyncStorage for click handling (accessible from React Native context)
      // This is important because background handler runs in native context, but we need to access it from React Native
      try {
        const notificationData = {
          messageId: remoteMessage?.messageId,
          notification: remoteMessage?.notification,
          data: remoteMessage?.data,
          sentTime: remoteMessage?.sentTime,
          timestamp: Date.now(), // Add timestamp to track when notification was received
        };
        await AsyncStorage.setItem(LAST_BACKGROUND_NOTIFICATION_KEY, JSON.stringify(notificationData));
        
      } catch (storageError) {
        console.error('❌ Error storing notification in AsyncStorage:', storageError);
      }
       
      // Background messages are automatically displayed by FCM
      // No need to show toast here
    }); 
  } catch (error) { 
    console.error('Error details:', error.message);
  }
};

/**
 * Get last background notification from AsyncStorage (for click handling workaround)
 */
export const getLastBackgroundNotification = async () => {
  try {
    const stored = await AsyncStorage.getItem(LAST_BACKGROUND_NOTIFICATION_KEY);
    if (stored) {
      const notificationData = JSON.parse(stored);
      // Check if notification is recent (within last 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (notificationData.timestamp && notificationData.timestamp > fiveMinutesAgo) {
        console.log('📨 Retrieved last background notification from AsyncStorage');
        return notificationData;
      } else {
        console.log('📨 Last background notification is too old, clearing...');
        await clearLastBackgroundNotification();
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting last background notification from AsyncStorage:', error);
    return null;
  }
};

/**
 * Clear last background notification from AsyncStorage (after handling)
 */
export const clearLastBackgroundNotification = async () => {
  try {
    await AsyncStorage.removeItem(LAST_BACKGROUND_NOTIFICATION_KEY);
    console.log('🧹 Cleared last background notification from AsyncStorage');
  } catch (error) {
    console.error('❌ Error clearing last background notification from AsyncStorage:', error);
  }
};

/**
 * Get initial notification when app opened from quit state
 */
export const getInitialNotification = async () => {
  try {
    console.log('📨 ========== GET INITIAL NOTIFICATION (QUIT STATE) ==========');
    const remoteMessage = await messaging().getInitialNotification(); 
    
    if (remoteMessage) { 
      
      // Extract order ID from notification
      const orderIdOrName = extractOrderId(remoteMessage?.data, remoteMessage?.notification); 
      
      if (orderIdOrName) { 
        // Delay to ensure app is fully loaded and navigation is ready
        setTimeout(() => {
          console.log('📦 Calling handleOrderNavigation after delay...');
          handleOrderNavigation(orderIdOrName);
        }, 1500);
      } else { 
        console.warn('⚠️ Data keys:', Object.keys(remoteMessage?.data || {}));
      }
      
      console.log('📨 ========== END INITIAL NOTIFICATION ==========');
      return remoteMessage;
    } 
    return null;
  } catch (error) { 
    console.error('❌ Error stack:', error.stack);
    return null;
  }
};

/**
 * Set up notification opened handler (when app is in background)
 */
export const setupNotificationOpenedHandler = (callback) => { 
  
  const unsubscribe = messaging().onNotificationOpenedApp(async (remoteMessage) => {
     
    
    // Also store in AsyncStorage for redundancy
    try {
      const notificationData = {
        messageId: remoteMessage?.messageId,
        notification: remoteMessage?.notification,
        data: remoteMessage?.data,
        sentTime: remoteMessage?.sentTime,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(LAST_BACKGROUND_NOTIFICATION_KEY, JSON.stringify(notificationData));
      console.log('💾 Also stored notification in AsyncStorage from onNotificationOpenedApp');
    } catch (storageError) {
      console.error('❌ Error storing notification in AsyncStorage:', storageError);
    }
    
    // Extract order ID from notification
    const orderIdOrName = extractOrderId(remoteMessage?.data, remoteMessage?.notification);
    
    
    if (orderIdOrName) {
       
      // Longer delay to ensure app is fully loaded and navigation is ready
      setTimeout(() => {
        console.log('📦 Calling handleOrderNavigation after delay...');
        handleOrderNavigation(orderIdOrName);
      }, 1000);
    } else {
      console.warn('⚠️ Could not extract order ID/Name from background notification');
      console.warn('⚠️ Data keys:', Object.keys(remoteMessage?.data || {}));
    }
    
    if (callback) {
      callback(remoteMessage);
    }
    console.log('📨 ========== END BACKGROUND NOTIFICATION ==========');
  });
  
  
  return unsubscribe;
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
 * Process order data for OrderDetailScreen
 * Formats order data similar to OrdersListScreen
 */
const processOrderData = (order) => {
  if (!order) return null;

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Get status and colors
  const status = (order.status || 'Pending').trim();
  const statusLower = status.toLowerCase();
  
  let statusColor = '#9E9E9E';
  if (statusLower === 'completed' || statusLower.includes('completed') || statusLower.includes('delivered')) {
    statusColor = '#4CAF50';
  } else if (statusLower.includes('processing') || statusLower.includes('progress')) {
    statusColor = '#FFE082';
  } else if (statusLower.includes('pending')) {
    statusColor = '#FFCC80';
  }

  const deliveryStatusValue = order.delivery_status || order.deliveryStatus || status;
  
  // Format delivery address
  let delivery_address = 'No delivery address selected';
  if (order.delivery_address) {
    if (typeof order.delivery_address === 'string') {
      delivery_address = order.delivery_address;
    } else if (Array.isArray(order.delivery_address) && order.delivery_address.length > 0) {
      const selected = order.delivery_address.find(a => a.isSelected) || order.delivery_address[0];
      if (selected && selected.street) {
        const parts = [
          selected.street,
          selected.city,
          selected.state,
          selected.zipCode,
        ].filter(Boolean);
        delivery_address = parts.join(', ');
      }
    }
  }

  return {
    id: order.id,
    customer_id: order.customer_id,
    orderName: order.order_name || `ORD-${order.id}`,
    cases: order.total_cases || order.cases || order.quantity || 0,
    deliveryDate: formatDate(order.delivery_date),
    orderDate: formatDate(order.order_date),
    status: status,
    statusColor: statusColor,
    orderDateRaw: order.order_date,
    deliveryDateRaw: order.delivery_date,
    delivery_day_date: order.delivery_day_date || null,
    deliveryStatus: deliveryStatusValue,
    delivery_address: delivery_address,
    driverId: order.driver_id || order.driverId || null,
    driverName: order.driver_name || order.driverName || null,
    driverPhone: order.driver_phone || order.driver_number || null,
    driverEmail: order.driver_email || order.driverEmail || null,
    po_number: order.po_number || null,
    order_notes: order.order_notes || order.special_instructions || null,
    special_event: order.special_event || false,
    opener_kit: order.opener_kit || false,
    special_event_logo: order.special_event_logo || null,
    product_type: order.product_type || 'Case (9 pieces or 9 units)',
    quantity: order.quantity || order.cases || 0,
  };
};

/**
 * Extract order ID from notification data
 * Tries multiple methods: order_id field, order name parsing, message parsing
 */
export const extractOrderId = (data, notification) => {
  
  // Method 1: Direct order_id in data
  if (data?.order_id) {
    console.log('✅ Found order_id in data:', data.order_id);
    return data.order_id;
  }
  
  // Method 2: Try to extract from order name in title/body/message
  const textToSearch = notification?.title || notification?.body || data?.title || data?.message || '';
  console.log('🔍 Searching for order ID in text:', textToSearch);
  
  // Pattern: ORD-1768820725647-338890 or similar
  const orderNameMatch = textToSearch.match(/ORD-[\d-]+/);
  if (orderNameMatch) {
    const orderName = orderNameMatch[0];
    console.log('✅ Found order name in text:', orderName);
    // Extract the last part (the random number) which might be used as ID
    // Or we can search by order_name in database
    return orderName;
  }
  
  // Method 3: Try to find order ID in message/body
  const idMatch = textToSearch.match(/order[_\s]*id[:\s]*([a-f0-9-]+|\d+)/i);
  if (idMatch) {
    console.log('✅ Found order ID in text:', idMatch[1]);
    return idMatch[1];
  }
  
  console.warn('⚠️ Could not extract order ID from notification');
  return null;
};

/**
 * Handle order navigation - fetch order and navigate
 */
export const handleOrderNavigation = async (orderIdOrName) => {
  try {
    
    if (!orderIdOrName) {
      console.warn('⚠️ No order_id or order_name in notification data');
      return;
    }

    // Prevent multiple simultaneous navigations for the same order
    if (isNavigating) { 
      console.log('⏸️ Last navigated order:', lastNavigatedOrderId);
      return;
    }

    // Check if we're navigating to the same order (within last 10 seconds)
    if (lastNavigatedOrderId === orderIdOrName) { 
      console.log('⏸️ Order ID/Name:', orderIdOrName);
      return;
    }

    // Check if we're already on OrderDetail screen for this order
    try {
      const currentRoute = navigationRef.getCurrentRoute();
      if (currentRoute?.name === 'OrderDetail') {
        const currentOrder = currentRoute?.params?.order;
        if (currentOrder && (currentOrder.id?.toString() === orderIdOrName || currentOrder.orderName === orderIdOrName)) {
          console.log('⏸️ Already on OrderDetail screen for this order, skipping navigation');
          return;
        }
      }
    } catch (e) {
      console.log('⚠️ Could not check current route:', e);
    }

    // Set flag to prevent duplicate navigations
    isNavigating = true;
    lastNavigatedOrderId = orderIdOrName;
    
    // Clear any existing timeout
    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
    }
    
    // Reset flag after 10 seconds to allow navigation to same order again if needed
    navigationTimeout = setTimeout(() => {
      isNavigating = false;
      lastNavigatedOrderId = null;
      console.log('✅ Navigation lock released');
    }, 10000);

    // Check navigation ref 

    // Wait for navigation to be ready
    if (!navigationRef.isReady()) {
      console.log('⏳ Navigation not ready, waiting 500ms...');
      // Reset flag before retry
      isNavigating = false;
      // Wait a bit and try again
      setTimeout(() => {
        console.log('🔄 Retrying navigation after delay...');
        handleOrderNavigation(orderIdOrName);
      }, 500);
      return;
    }
    
    // Try to fetch by ID first, then by order_name
    let order = null;
    let error = null;
    
    // Check if it's a UUID (order ID) or order name (ORD-xxx)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdOrName);
    
    if (isUUID) {
      // It's a UUID, fetch by ID 
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderIdOrName)
        .single();
      order = result.data;
      error = result.error;
    } else {
      // It's an order name, fetch by order_name 
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('order_name', orderIdOrName)
        .single();
      order = result.data;
      error = result.error;
      
      // If not found, try with partial match
      if (error || !order) { 
        const partialResult = await supabase
          .from('orders')
          .select('*')
          .ilike('order_name', `%${orderIdOrName}%`)
          .limit(1)
          .maybeSingle();
        order = partialResult.data;
        error = partialResult.error;
      }
    }
 

    if (error) { 
      return;
    }

    if (!order) {
      console.warn('⚠️ Order not found for orderId/Name:', orderIdOrName);
      return;
    }

    

    // Process order data
    const processedOrder = processOrderData(order);
     
    
    if (processedOrder) {
      console.log('🚀 Starting navigation to OrderDetailScreen...');
      // Navigate to OrderDetail - try HomeStack first, then OrdersStack as fallback
      try {
        // Get current route and check navigation state
        const currentRoute = navigationRef.getCurrentRoute();
        const navigationState = navigationRef.getRootState();
        
        
        
        // Check if we're already in MainTabs structure by checking route names
        // MainTabs contains HomeStack, OrdersStack, etc.
        const routeNames = ['MainTabs', 'HomeStack', 'OrdersStack', 'NewStack', 'NotificationsStack', 'ProfileStack'];
        const currentRouteName = currentRoute?.name || '';
        const isInMainTabs = routeNames.includes(currentRouteName) || 
                             currentRouteName === 'Home' || 
                             currentRouteName === 'OrdersList' || 
                             currentRouteName === 'OrderDetail' ||
                             (navigationState?.routes && navigationState.routes.some(r => r.name === 'MainTabs'));
        
         
        
        if (!isInMainTabs) {
          console.log('📍 Not in MainTabs, navigating to MainTabs first');
          // Use reset to avoid stack buildup
          navigationRef.reset({
            index: 0,
            routes: [
              { name: 'MainTabs' },
            ],
          });
          // Wait a bit for navigation to complete
          setTimeout(() => {
            console.log('📍 Navigating to HomeStack > OrderDetail after MainTabs');
            navigationRef.navigate('HomeStack', {
              screen: 'OrderDetail',
              params: { order: processedOrder },
            });
            console.log('✅ Navigation command sent to HomeStack > OrderDetail');
          }, 1000);
        } else {
          // Already in MainTabs structure, navigate directly using replace to avoid stack buildup
          console.log('📍 Already in MainTabs structure, navigating directly to HomeStack > OrderDetail');
          // Check if already on OrderDetail - if yes, just update params
          if (currentRouteName === 'OrderDetail') {
            console.log('📍 Already on OrderDetail, updating params');
            navigationRef.setParams({ order: processedOrder });
          } else {
            // Navigate to OrderDetail
            navigationRef.navigate('HomeStack', {
              screen: 'OrderDetail',
              params: { order: processedOrder },
            });
          }
          console.log('✅ Navigation command sent to HomeStack > OrderDetail');
        }
      } catch (navError) {
        
        // Fallback: try OrdersStack
        try {
          console.log('🔄 Trying fallback navigation to OrdersStack > OrderDetail');
          navigationRef.navigate('OrdersStack', {
            screen: 'OrderDetail',
            params: { order: processedOrder },
          });
          console.log('✅ Fallback navigation command sent');
        } catch (fallbackError) {
          console.error('❌ Fallback navigation also failed:', fallbackError); 
        }
      }
    } else {
      console.warn('⚠️ Processed order is null or undefined');
    }
     
    
    // Reset navigation flag after successful navigation
    setTimeout(() => {
      isNavigating = false;
      console.log('✅ Navigation completed, flag reset');
    }, 2000);
  } catch (error) { 
    
    // Reset flag on error
    isNavigating = false;
  }
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

