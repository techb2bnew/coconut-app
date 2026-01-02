/**
 * Notification Screen
 * Display notifications for the logged-in user with real-time updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';
import {
  getCustomerId,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToNotifications,
  unsubscribeFromNotifications,
} from '../services/notificationService';
import { NOTIFICATION_RECEIVED_EVENT } from '../services/firebaseMessaging';
import supabase from '../config/supabase';

const NotificationScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [subscription, setSubscription] = useState(null); 
  // Fetch notifications
  const loadNotifications = useCallback(async (customerId, showLoading = true) => {
    if (!customerId) return;

    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      console.log('📥 Fetching notifications for customer:', customerId);
      const fetchedNotifications = await fetchNotifications(customerId);
      console.log('✅ Fetched notifications:', fetchedNotifications.length);
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initialize: Get customer ID and load notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      const id = await getCustomerId();
      if (id) {
        setCustomerId(id);
        await loadNotifications(id, true);
      } else {
        setLoading(false);
      }
    };

    initializeNotifications();
  }, [loadNotifications]);

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (customerId) {
        console.log('🔄 Screen focused, refreshing notifications...');
        loadNotifications(customerId, false);
      }
    }, [customerId, loadNotifications])
  );

  // Listen for Firebase notification events to refresh
  useEffect(() => {
    if (!customerId) return;

    const handleNotificationReceived = () => {
      console.log('🔄 Firebase notification received, refreshing notifications...');
      loadNotifications(customerId, false);
    };

    // Listen for notification events
    const subscription = DeviceEventEmitter.addListener(NOTIFICATION_RECEIVED_EVENT, handleNotificationReceived);

    // Cleanup listener
    return () => {
      subscription.remove();
    };
  }, [customerId, loadNotifications]);

  // Set up real-time subscription
  useEffect(() => {
    if (!customerId) {
      console.log('⚠️ No customer ID, skipping subscription setup');
      return;
    }

    let currentSubscription = null;
    let isSubscribed = true;

    // Subscribe to real-time notifications
    const setupSubscription = async () => {
      try {
        console.log('🔧 Setting up real-time subscription for customer:', customerId);
        const sub = await subscribeToNotifications(customerId, async (payload) => {
          console.log('🔔 Real-time notification update received:', payload);
          console.log('🔔 Payload event:', payload.eventType);
          console.log('🔔 Payload new:', payload.new);
          if (isSubscribed) {
            // Reload notifications when change detected
            console.log('🔄 Reloading notifications due to real-time update...');
            await loadNotifications(customerId, false);
          }
        });

        if (isSubscribed && sub) {
          currentSubscription = sub;
          setSubscription(sub);
          console.log('✅ Subscription set up successfully for customer:', customerId);
          
          // Verify subscription after a delay
          setTimeout(() => {
            const channels = supabase.getChannels();
            console.log('📡 Active Supabase channels:', channels.length);
            channels.forEach((ch) => {
              console.log('📡 Channel:', ch.topic, 'State:', ch.state);
            });
          }, 2000);
        } else {
          console.error('❌ Failed to create subscription');
        }
      } catch (error) {
        console.error('❌ Error setting up subscription:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
    };

    setupSubscription();

    // Cleanup subscription on unmount or when customerId changes
    return () => {
      console.log('🧹 Cleaning up subscription for customer:', customerId);
      isSubscribed = false;
      if (currentSubscription) {
        unsubscribeFromNotifications(currentSubscription);
        currentSubscription = null;
        setSubscription(null);
      }
    };
  }, [customerId, loadNotifications]);

  // Handle pull to refresh
  const onRefresh = useCallback(async () => {
    if (customerId) {
      await loadNotifications(customerId, false);
    }
  }, [customerId, loadNotifications]);

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    if (!customerId) return;

    const success = await markAllNotificationsAsRead(customerId);
    if (success) {
      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  // Handle mark single notification as read
  const handleNotificationPress = async (notification) => {
    if (notification.isRead || !notification.id) return;

    const success = await markNotificationAsRead(notification.id);
    if (success) {
      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Helper function to format date only (no time)
  const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid date
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch (error) {
      return dateString; // Return original if error
    }
  };

  // Debug: Log subscription status
  useEffect(() => {
    if (subscription) {
      console.log('📡 Current subscription:', subscription.topic);
      console.log('📡 Subscription state:', subscription.state);
    }
  }, [subscription]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
                {/* Mark All as Read Button */}
      {unreadCount > 0 && (
        <View style={styles.markAllContainer}>
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Mark All as Read</Text>
          </TouchableOpacity>
        </View>
      )}
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount} new</Text>
            </View>
          )} 
         
        </View>
    
      </LinearGradient>

    

      {/* Notifications List */}
      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryPink} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryPink} />
          }>
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="notifications-outline" size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubText}>
                You'll see notifications here when you have updates.
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id || notification.notification_id}
                style={[
                  styles.notificationCard,
                  !notification.isRead && styles.notificationCardUnread,
                ]}
                activeOpacity={0.7}
                onPress={() => handleNotificationPress(notification)}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: notification.iconColor + '20' },
                  ]}>
                  <Icon name={notification.iconName} size={24} color={notification.iconColor} />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={[styles.notificationTitle, { textTransform: 'capitalize' }]}>{notification.title}</Text>
                  <Text style={styles.notificationDescription}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>{formatDateOnly(notification.rawTimestamp)}</Text>
                </View>
                {!notification.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}

      {/* Bottom Navigation Bar */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16, 
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fontFamilyHeading,
    color: Colors.cardBackground,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fontFamilyBody,
    color: Colors.primaryPink,
  },
  markAllContainer: {
    alignItems: 'center', 
  },
  markAllButton: {
    paddingHorizontal: 14,
    paddingVertical: 5, 
    borderWidth: 2, 
    borderColor: '#ffffff',
    borderStyle: 'solid',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderRadius: 15,
  },
  markAllText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color:'#ffffff',
    fontWeight: '500',
  },
  scrollView: {
    backgroundColor: Colors.lightPink,
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...TextStyles.headingMedium,
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    ...TextStyles.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,  
    position: 'relative',
  },
  notificationCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryPink,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamilyHeading,
    color: Colors.textPrimary, 
  },
  notificationDescription: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary, 
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  unreadDot: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryPink,
  },
  bottomSpacing: {
    height: 20,
  },
  debugButton: {
    padding: 8,
    marginLeft: 8,
  },
  debugButtonText: {
    fontSize: 18,
    color: Colors.cardBackground,
  },
});

export default NotificationScreen;
