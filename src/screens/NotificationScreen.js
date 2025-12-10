/**
 * Notification Screen
 * Display notifications for the logged-in user
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import { fontFamily } from '../theme/fonts';
import BottomTabNavigation from '../components/BottomTabNavigation';

const NotificationScreen = ({ navigation }) => {
  // Mock notification data - later will fetch from Supabase
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'delivery',
      title: 'Order Out for Delivery',
      description: 'Your order ORD-2025-001 is out for delivery and will arrive today.',
      timestamp: '2025-10-16 08:00 AM',
      isRead: false,
      iconColor: Colors.primaryPink,
      iconName: 'car-outline',
    },
    {
      id: 2,
      type: 'progress',
      title: 'Order In Progress',
      description: 'Your order ORD-2025-001 is now being prepared with custom branding.',
      timestamp: '2025-10-15 02:00 PM',
      isRead: false,
      iconColor: '#BA68C8',
      iconName: 'cube-outline',
    },
    {
      id: 3,
      type: 'confirmed',
      title: 'Order Confirmed',
      description: 'Your order ORD-2025-001 has been confirmed and received.',
      timestamp: '2025-10-15 09:45 AM',
      isRead: true,
      iconColor: '#81C784',
      iconName: 'checkmark-circle',
    },
    {
      id: 4,
      type: 'payment',
      title: 'Payment Reminder',
      description: 'Friendly reminder: Invoice INV-2025-045 is due on October 20, 2025.',
      timestamp: '2025-10-14 10:00 AM',
      isRead: true,
      iconColor: '#FFB74D',
      iconName: 'warning',
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount} new</Text>
            </View>
          )}
        </View>
      </View>

      {/* Mark All as Read Button */}
      {unreadCount > 0 && (
        <View style={styles.markAllContainer}>
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Mark All as Read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubText}>You'll see notifications here when you have updates.</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <View key={notification.id} style={styles.notificationCard}>
              <View style={[styles.iconContainer, { backgroundColor: notification.iconColor + '20' }]}>
                <Icon name={notification.iconName} size={24} color={notification.iconColor} />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationDescription}>{notification.description}</Text>
                <Text style={styles.notificationTime}>{notification.timestamp}</Text>
              </View>
              {!notification.isRead && <View style={styles.unreadDot} />}
            </View>
          ))
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomTabNavigation navigation={navigation} activeTab="Notifications" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
  },
  header: {
    backgroundColor: Colors.primaryPink,
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
    fontFamily: fontFamily,
    color: Colors.cardBackground,
    fontWeight: '700',
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
    fontFamily: fontFamily,
    color: Colors.primaryPink,
  },
  markAllContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
  },
  markAllButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  markAllText: {
    fontSize: 14,
    fontFamily: fontFamily,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
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
    marginBottom: 8,
  },
  emptySubText: {
    ...TextStyles.bodyText,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
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
    fontWeight: '700',
    fontFamily: fontFamily,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    fontFamily: fontFamily,
    color: Colors.textPrimary,
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: fontFamily,
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
});

export default NotificationScreen;
