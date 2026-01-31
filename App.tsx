import { useEffect } from 'react';
import { StatusBar, useColorScheme, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation/AppNavigator';
import { fontFamilyBody } from './src/theme/fonts';
import Colors from './src/theme/colors';
import {
  initializeFCM,
  setupForegroundMessageHandler,
  setupNotificationOpenedHandler,
  setupTokenRefreshHandler,
  getInitialNotification,
  extractOrderId,
  handleOrderNavigation,
  getLastBackgroundNotification,
  clearLastBackgroundNotification,
} from './src/services/firebaseMessaging';
import { checkCustomerAndLogoutIfNeeded, subscribeToCustomerRealtime, performLogoutAndNavigateToLogin } from './src/services/customerAuthCheck';
// @ts-ignore - JS module, no types
const supabase = require('./src/config/supabase').default;

// Set default font family for all Text components globally (Quicksand for body text)
// Create a default style that includes the font family
const defaultTextStyle = StyleSheet.create({
  default: {
    fontFamily: fontFamilyBody,
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

  // When admin deletes or deactivates customer: realtime + periodic check for auto logout
  useEffect(() => {
    let customerUnsubscribe: (() => void) | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    const POLL_INTERVAL_MS = 2500; // Check every 25 seconds (works even if Realtime is off)

    const startCustomerRealtime = async (email: string) => {
      try {
        const { data } = await supabase.from('customers').select('id').eq('email', email).maybeSingle();
        if (data?.id) {
          customerUnsubscribe?.();
          customerUnsubscribe = subscribeToCustomerRealtime(data.id, performLogoutAndNavigateToLogin);
        }
      } catch (_) {}
    };

    const startPeriodicCheck = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      pollInterval = setInterval(async () => {
        const didLogout = await checkCustomerAndLogoutIfNeeded();
        if (didLogout && pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }, POLL_INTERVAL_MS);
    };

    const stopPeriodicCheck = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (session?.user?.email) {
        startCustomerRealtime(session.user.email);
        startPeriodicCheck();
      } else {
        customerUnsubscribe?.();
        customerUnsubscribe = null;
        stopPeriodicCheck();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user?.email) {
        startCustomerRealtime(session.user.email);
        startPeriodicCheck();
      }
    });

    return () => {
      customerUnsubscribe?.();
      stopPeriodicCheck();
      subscription?.unsubscribe();
    };
  }, []);

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
        const unsubscribeForeground = setupForegroundMessageHandler(); 

        // Set up notification opened handler (background state) 
        const unsubscribeOpened = setupNotificationOpenedHandler((remoteMessage: any) => {
          console.log('📨 Notification opened app:', remoteMessage);
          // Handle navigation or other actions here
        });
        
        const unsubscribeTokenRefresh = setupTokenRefreshHandler(); 

        // Check for pending notification immediately on app start (in case app was opened from notification)
        // Also check periodically in case notification click didn't trigger AppState change
        let checkCount = 0;
        const maxChecks = 10; // Check 10 times over 20 seconds (more checks for reliability)
        let intervalId: ReturnType<typeof setInterval> | null = null;
        
        const checkForPendingNotification = async () => {
          checkCount++;
          console.log(`🔍 ========== [Check ${checkCount}/${maxChecks}] PENDING NOTIFICATION CHECK ==========`);
          console.log(`🔍 Check timestamp: ${new Date().toISOString()}`);
          try {
            const lastNotification = await getLastBackgroundNotification();
            if (lastNotification) {
               
              const timeDiff = Date.now() - lastNotification.timestamp;
              
              
              // Only handle if notification is recent (within last 2 minutes)
              const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
              if (lastNotification.timestamp > twoMinutesAgo) {
                const orderIdOrName = extractOrderId(lastNotification?.data, lastNotification?.notification);
                console.log('📦 Extracted order ID/Name:', orderIdOrName);
                
                if (orderIdOrName) {
                  console.log('📦 ✅ Handling order navigation from pending notification check...');
                  // Clear notification immediately to prevent other handlers from processing
                  await clearLastBackgroundNotification();
                  // Stop periodic checks
                  if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                  }
                  // Wait a bit longer to ensure app is fully loaded and other handlers have finished
                  setTimeout(() => {
                    handleOrderNavigation(orderIdOrName);
                  }, 2500); // Longer delay to ensure other handlers don't interfere
                  return true; // Found and handled
                }
              } else {
                console.log('📨 Notification is too old, clearing...');
                await clearLastBackgroundNotification();
              }
            } else {
              console.log('📨 No pending notification found');
            }
          } catch (error: any) {
            console.error('❌ Error checking for pending notification:', error);
          }
          return false; // Not found
        };
        
        // Check immediately on app start
        console.log('⏰ Scheduling first notification check in 1 second...');
        setTimeout(async () => {
          console.log('⏰ First notification check starting now...');
          const handled = await checkForPendingNotification();
          console.log(`⏰ First check result: ${handled ? 'Handled' : 'Not handled'}, checkCount: ${checkCount}, maxChecks: ${maxChecks}`);
          
          if (!handled && checkCount < maxChecks) {
            console.log('⏰ Setting up periodic checks every 2 seconds...');
            // If not handled, check again every 2 seconds
            intervalId = setInterval(async () => {
              const handled = await checkForPendingNotification();
              console.log(`⏰ Periodic check result: ${handled ? 'Handled' : 'Not handled'}, checkCount: ${checkCount}, maxChecks: ${maxChecks}`);
              
              if (handled || checkCount >= maxChecks) {
                if (intervalId) {
                  clearInterval(intervalId);
                  intervalId = null;
                }
                console.log('🛑 Stopped checking for pending notifications');
              }
            }, 2000);
            console.log('✅ Periodic checks started');
          } else {
            console.log('⏰ No periodic checks needed (handled or max checks reached)');
          }
        }, 1000);

        // Also check for notification when app comes to foreground
        let previousAppState: AppStateStatus = AppState.currentState;
        console.log('📱 Initial app state:', previousAppState);
        
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
          
          
          if (nextAppState === 'active' && previousAppState !== 'active') { 
            
            // Small delay to ensure everything is ready
            setTimeout(async () => {
              try {
                // Check if customer was deleted or set inactive by admin → auto logout
                await checkCustomerAndLogoutIfNeeded();
                
                await clearLastBackgroundNotification();
                 
                // Method 1: Check getInitialNotification (for quit state)
                const initialNotification = await getInitialNotification(); 
                
                if (initialNotification) { 
                  // Extract and handle order navigation
                  const orderIdOrName = extractOrderId(initialNotification?.data, initialNotification?.notification);
                   
                  if (orderIdOrName) {
                    console.log('📦 ✅ Handling order navigation from initial notification...');
                    setTimeout(() => {
                      handleOrderNavigation(orderIdOrName);
                    }, 2000); // Longer delay to ensure app is fully loaded
                    return;
                  }
                }
                
                
                // Method 2: Check last background notification (workaround for onNotificationOpenedApp not firing)
                // Note: We already cleared it above, so this should return null
                const lastNotification = await getLastBackgroundNotification();
                
                
                if (lastNotification) {
                  
                  // Extract and handle order navigation
                  const orderIdOrName = extractOrderId(lastNotification?.data, lastNotification?.notification);
                  
                  
                  if (orderIdOrName) {
                    console.log('📦 ✅ Handling order navigation from last background notification...');
                    // Clear again to be safe
                    await clearLastBackgroundNotification();
                    console.log('🧹 Cleared stored notification');
                    setTimeout(() => {
                      handleOrderNavigation(orderIdOrName);
                    }, 2000); // Longer delay to ensure app is fully loaded
                    return;
                  }
                }
                
                
              } catch (error: any) {
                console.error('❌ Error checking for pending notification:', error);
                console.error('❌ Error stack:', error?.stack);
              }
            }, 500);
          } else {
            console.log('📱 App state change (not coming to foreground)');
          }
          
          previousAppState = nextAppState;
        };

        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        // Cleanup on unmount
        return () => {
          console.log('🧹 Cleaning up FCM handlers...');
          unsubscribeForeground();
          unsubscribeOpened();
          unsubscribeTokenRefresh();
          appStateSubscription?.remove();
        };
      } catch (error) {
        console.error('❌ Error initializing FCM:', error);
        // console.error('Error stack:', error.stack);
      }
    };

    initFCM();
  }, []);

  // Splash gradient start – same as SplashScreen so no white flash before first screen
  const splashBg = '#4fa3e3';
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: splashBg }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: splashBg }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={splashBg}
          translucent={false}
        />
        <AppNavigator />
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
