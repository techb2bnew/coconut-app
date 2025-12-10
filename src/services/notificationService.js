/**
 * Notification Service
 * Handles fetching and real-time updates for customer notifications
 */

import supabase from '../config/supabase';

/**
 * Fetch customer ID from logged in user
 */
export const getCustomerId = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return null;
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (error) {
      console.error('Error fetching customer:', error);
      return null;
    }

    return customer?.id || null;
  } catch (error) {
    console.error('Error in getCustomerId:', error);
    return null;
  }
};

/**
 * Format date to readable string
 */
export const formatNotificationDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

    // Format full date
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return dateString;
  }
};

/**
 * Get notification icon and color based on type
 */
export const getNotificationIcon = (notificationType) => {
  const icons = {
    delivery: { name: 'car-outline', color: '#E91E63' },
    progress: { name: 'cube-outline', color: '#BA68C8' },
    confirmed: { name: 'checkmark-circle', color: '#81C784' },
    payment: { name: 'card-outline', color: '#FFB74D' },
    general: { name: 'notifications-outline', color: '#64B5F6' },
    order: { name: 'cube-outline', color: '#E91E63' },
    default: { name: 'notifications-outline', color: '#9E9E9E' },
  };

  // Try to match type from title or notification type
  const typeLower = (notificationType || '').toLowerCase();
  if (typeLower.includes('delivery')) return icons.delivery;
  if (typeLower.includes('progress') || typeLower.includes('processing')) return icons.progress;
  if (typeLower.includes('confirm')) return icons.confirmed;
  if (typeLower.includes('payment') || typeLower.includes('invoice')) return icons.payment;
  if (typeLower.includes('order')) return icons.order;
  
  return icons.general;
};

/**
 * Fetch notifications for current customer
 * Handles both notification_recipients table and notifications with recipient_ids JSONB
 */
export const fetchNotifications = async (customerId) => {
  if (!customerId) {
    return [];
  }

  try {
    // Method 1: Get notifications from notification_recipients table (if exists)
    let notificationsFromRecipients = [];
    try {
      const { data: recipients, error: recipientsError } = await supabase
        .from('notification_recipients')
        .select('id, notification_id, is_read, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (!recipientsError && recipients && recipients.length > 0) {
        const notificationIds = recipients.map((r) => r.notification_id);

        // Fetch notification details
        const { data: notifications, error: notificationsError } = await supabase
          .from('notifications')
          .select('*')
          .in('notification_id', notificationIds)
          .order('created_at', { ascending: false });

        if (!notificationsError && notifications) {
          notificationsFromRecipients = notifications.map((notification) => {
            const recipient = recipients.find((r) => r.notification_id === notification.notification_id);
            const iconData = getNotificationIcon(notification.title);

            return {
              id: notification.id,
              notification_id: notification.notification_id,
              title: notification.title,
              message: notification.message || notification.title,
              timestamp: formatNotificationDate(notification.created_at || recipient?.created_at),
              rawTimestamp: notification.created_at || recipient?.created_at,
              isRead: recipient?.is_read || false,
              recipientId: recipient?.id,
              iconColor: iconData.color,
              iconName: iconData.name,
              type: notification.recipient_type || 'general',
            };
          });
        }
      }
    } catch (error) {
      console.log('notification_recipients table might not exist, trying alternative method');
    }

    // Method 2: Get notifications where recipient_ids contains customer_id or all_customers
    let notificationsFromIds = [];
    try {
      const { data: allNotifications, error: allError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit to recent notifications

      if (!allError && allNotifications) {
        notificationsFromIds = allNotifications
          .filter((notification) => {
            // Check if notification is for all customers
            if (notification.recipient_type === 'all_customers') {
              return true;
            }

            // Check if customer_id is in recipient_ids JSONB array
            if (notification.recipient_ids && Array.isArray(notification.recipient_ids)) {
              return notification.recipient_ids.includes(customerId);
            }

            return false;
          })
          .map((notification) => {
            const iconData = getNotificationIcon(notification.title);
            return {
              id: notification.id,
              notification_id: notification.notification_id,
              title: notification.title,
              message: notification.message || notification.title,
              timestamp: formatNotificationDate(notification.created_at),
              rawTimestamp: notification.created_at,
              isRead: false, // Default to unread if not in notification_recipients
              recipientId: null,
              iconColor: iconData.color,
              iconName: iconData.name,
              type: notification.recipient_type || 'general',
            };
          });
      }
    } catch (error) {
      console.log('Error fetching notifications by recipient_ids:', error);
    }

    // Combine both methods, prioritizing notification_recipients
    const combinedMap = new Map();

    // Add notifications from recipient_ids first
    notificationsFromIds.forEach((notif) => {
      combinedMap.set(notif.notification_id, notif);
    });

    // Override with notifications from notification_recipients (these have read status)
    notificationsFromRecipients.forEach((notif) => {
      combinedMap.set(notif.notification_id, notif);
    });

    // Convert map to array and sort by timestamp
    const finalNotifications = Array.from(combinedMap.values()).sort((a, b) => {
      const dateA = new Date(a.rawTimestamp || 0);
      const dateB = new Date(b.rawTimestamp || 0);
      return dateB - dateA; // Descending order
    });

    return finalNotifications;
  } catch (error) {
    console.error('Error in fetchNotifications:', error);
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (recipientId) => {
  if (!recipientId) return false;

  try {
    const { error } = await supabase
      .from('notification_recipients')
      .update({ is_read: true })
      .eq('id', recipientId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return false;
  }
};

/**
 * Mark all notifications as read for customer
 */
export const markAllNotificationsAsRead = async (customerId) => {
  if (!customerId) return false;

  try {
    const { error } = await supabase
      .from('notification_recipients')
      .update({ is_read: true })
      .eq('customer_id', customerId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return false;
  }
};

/**
 * Set up real-time subscription for notifications
 * Subscribes to both notification_recipients and notifications tables
 */
export const subscribeToNotifications = async (customerId, callback) => {
  if (!customerId) {
    return null;
  }

  try {
    // Remove any existing channel first
    const existingChannel = supabase.getChannels().find(
      (ch) => ch.topic === `realtime:notifications:${customerId}`
    );
    if (existingChannel) {
      await supabase.removeChannel(existingChannel);
    }

    // Create a unique channel name for this customer
    const channelName = `notifications:${customerId}:${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Subscribe to notification_recipients table changes
    // Convert customerId to string for filter
    const customerIdStr = String(customerId);
    channel.on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'notification_recipients',
        filter: `customer_id=eq.${customerIdStr}`,
      },
      (payload) => {
        console.log('🔔 Notification recipient change detected:', payload);
        if (callback) {
          callback(payload);
        }
      }
    );

    // Subscribe to notifications table for new notifications
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        console.log('🔔 New notification created:', payload);
        // Check if this notification is for this customer
        const notification = payload.new;
        const customerIdStr = String(customerId);
        const isForThisCustomer =
          notification.recipient_type === 'all_customers' ||
          (notification.recipient_ids &&
            Array.isArray(notification.recipient_ids) &&
            (notification.recipient_ids.includes(customerId) ||
              notification.recipient_ids.includes(customerIdStr) ||
              notification.recipient_ids.includes(Number(customerId))));

        if (isForThisCustomer) {
          console.log('🔔 Notification is for this customer, triggering callback');
          console.log('Notification details:', {
            recipient_type: notification.recipient_type,
            recipient_ids: notification.recipient_ids,
            customerId: customerId,
          });
          if (callback) {
            callback(payload);
          }
        } else {
          console.log('🔕 Notification not for this customer, ignoring');
        }
      }
    );

    // Subscribe to the channel
    const subscribeResult = await channel.subscribe((status) => {
      console.log('📡 Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to notifications');
        console.log('📡 Channel name:', channelName);
        console.log('📡 Customer ID:', customerId);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Channel subscription error');
        console.error('⚠️ IMPORTANT: Supabase Realtime is NOT enabled!');
        console.error('📝 Please enable Realtime via Publications:');
        console.error('   1. Supabase Dashboard → Database → Publications');
        console.error('   2. SQL Editor में run करें:');
        console.error('      ALTER PUBLICATION supabase_realtime ADD TABLE notifications;');
        console.error('      ALTER PUBLICATION supabase_realtime ADD TABLE notification_recipients;');
        console.error('   3. App restart करें');
        console.error('   📄 Detailed guide: ENABLE_REALTIME_PUBLICATIONS.md');
      } else if (status === 'TIMED_OUT') {
        console.error('⏱️ Subscription timed out');
        console.error('Check network connection and Supabase Realtime settings');
        console.error('⚠️ Make sure Realtime is enabled in Supabase Dashboard');
      } else if (status === 'CLOSED') {
        console.log('🔴 Channel closed');
      } else {
        console.log('📡 Subscription status changed:', status);
      }
    });

    // Wait a bit to ensure subscription is established
    await new Promise(resolve => setTimeout(resolve, 1000));

    return channel;
  } catch (error) {
    console.error('Error setting up notification subscription:', error);
    return null;
  }
};

/**
 * Unsubscribe from notifications
 */
export const unsubscribeFromNotifications = async (subscription) => {
  if (subscription) {
    try {
      await supabase.removeChannel(subscription);
      console.log('🔴 Unsubscribed from notifications');
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
    }
  }
};

