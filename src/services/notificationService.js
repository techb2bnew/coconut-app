/**
 * Notification Service - FIXED VERSION
 * Handles fetching and real-time updates for customer notifications
 * FIX: Only fetch sent notifications (exclude scheduled)
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
 * Fetch customer ID and account creation date from logged in user
 */
export const getCustomerIdAndCreatedAt = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return { customerId: null, createdAt: null };
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, created_at')
      .eq('email', user.email)
      .single();

    if (error) {
      console.error('Error fetching customer:', error);
      return { customerId: null, createdAt: null };
    }

    return {
      customerId: customer?.id || null,
      createdAt: customer?.created_at || null,
    };
  } catch (error) {
    console.error('Error in getCustomerIdAndCreatedAt:', error);
    return { customerId: null, createdAt: null };
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
    delivery: { name: 'car-outline', color: '#4fa3e3' },
    progress: { name: 'cube-outline', color: '#BA68C8' },
    confirmed: { name: 'checkmark-circle', color: '#81C784' },
    payment: { name: 'card-outline', color: '#FFB74D' },
    general: { name: 'notifications-outline', color: '#64B5F6' },
    order: { name: 'cube-outline', color: '#4fa3e3' },
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
 * FIX: Only fetch sent notifications (status = 'sent' AND sent_at IS NOT NULL)
 * FIX: Only show notifications created after user's account creation
 * This prevents scheduled notifications from showing immediately
 * This prevents old notifications from showing to new users
 */
export const fetchNotifications = async (customerId) => {
  if (!customerId) {
    return [];
  }

  try {
    // Get customer's account creation date to filter out old notifications
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('created_at')
      .eq('id', customerId)
      .single();

    if (customerError) {
      console.error('Error fetching customer created_at:', customerError);
      // If we can't get the date, don't filter (fallback behavior)
    }

    const customerCreatedAt = customer?.created_at || null;
    console.log('📅 Customer account created at:', customerCreatedAt);

    // If customer has a creation date, only show notifications sent after that date
    // If no creation date, show all (fallback for existing users)
    // ✅ FIX: Use mobile_app_notifications view (if created) OR filter by status = 'sent'
    // Option 1: Use view (recommended - after running SQL script)
    let notificationsFromView = [];
    try {
      let viewQuery = supabase
        .from('mobile_app_notifications')  // ✅ View use karein
        .select('*')
        .or(`recipient_type.eq.all_customers,recipient_ids.cs.{${customerId}}`)
        .order('sent_at', { ascending: false })
        .limit(50);

      // ✅ FIX: Filter by customer creation date if available
      if (customerCreatedAt) {
        // Only show notifications sent after customer account creation
        viewQuery = viewQuery.gte('sent_at', customerCreatedAt);
      }

      const { data: viewData, error: viewError } = await viewQuery;

      if (!viewError && viewData) {
        // Additional client-side filter for safety (in case view doesn't filter properly)
        const filteredViewData = customerCreatedAt
          ? viewData.filter((notification) => {
              const notificationDate = notification.sent_at || notification.created_at;
              if (!notificationDate) return false;
              return new Date(notificationDate) >= new Date(customerCreatedAt);
            })
          : viewData;

        notificationsFromView = filteredViewData.map((notification) => {
          const iconData = getNotificationIcon(notification.title);
              return {
                id: notification.id,
                notification_id: notification.notification_id,
                title: notification.title,
                message: notification.message || notification.title,
                timestamp: formatNotificationDate(notification.sent_at || notification.created_at),
                rawTimestamp: notification.sent_at || notification.created_at,
                isRead: notification.read || false, // Use read field from notifications table
                recipientId: notification.id, // Use notification id for marking as read
                iconColor: iconData.color,
                iconName: iconData.name,
                type: notification.recipient_type || 'general',
              };
        });
      }
    } catch (viewErr) {
      console.log('View might not exist, using direct query with filters');
    }

    // Option 2: Direct query with status filter (fallback if view doesn't exist)
    if (notificationsFromView.length === 0) {
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

          // ✅ FIX: Fetch only sent notifications
          let notificationsQuery = supabase
            .from('notifications')
            .select('*')
            .in('notification_id', notificationIds)
            .eq('status', 'sent')  // ✅ CRITICAL: Only sent notifications
            .not('sent_at', 'is', null)  // ✅ CRITICAL: Must have sent_at
            .order('sent_at', { ascending: false });

          // ✅ FIX: Filter by customer creation date if available
          if (customerCreatedAt) {
            notificationsQuery = notificationsQuery.gte('sent_at', customerCreatedAt);
          }

          const { data: notifications, error: notificationsError } = await notificationsQuery;

          if (!notificationsError && notifications) {
            // Additional client-side filter for safety
            const filteredNotifications = customerCreatedAt
              ? notifications.filter((notification) => {
                  const notificationDate = notification.sent_at || notification.created_at;
                  if (!notificationDate) return false;
                  return new Date(notificationDate) >= new Date(customerCreatedAt);
                })
              : notifications;

            notificationsFromRecipients = filteredNotifications.map((notification) => {
              const recipient = recipients.find((r) => r.notification_id === notification.notification_id);
              const iconData = getNotificationIcon(notification.title);

              return {
                id: notification.id,
                notification_id: notification.notification_id,
                title: notification.title,
                message: notification.message || notification.title,
                timestamp: formatNotificationDate(notification.sent_at || notification.created_at),
                rawTimestamp: notification.sent_at || notification.created_at,
                isRead: notification.read || recipient?.is_read || false, // Prioritize read from notifications table
                recipientId: notification.id, // Use notification id for marking as read
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
        // ✅ FIX: Only fetch sent notifications
        let allNotificationsQuery = supabase
          .from('notifications')
          .select('*')
          .eq('status', 'sent')  // ✅ CRITICAL: Only sent notifications
          .not('sent_at', 'is', null)  // ✅ CRITICAL: Must have sent_at
          .order('sent_at', { ascending: false })
          .limit(100); // Limit to recent notifications

        // ✅ FIX: Filter by customer creation date if available
        if (customerCreatedAt) {
          allNotificationsQuery = allNotificationsQuery.gte('sent_at', customerCreatedAt);
        }

        const { data: allNotifications, error: allError } = await allNotificationsQuery;

        if (!allError && allNotifications) {
          notificationsFromIds = allNotifications
            .filter((notification) => {
              // ✅ FIX: Additional filter for customer creation date (client-side safety check)
              if (customerCreatedAt) {
                const notificationDate = notification.sent_at || notification.created_at;
                if (!notificationDate) return false;
                if (new Date(notificationDate) < new Date(customerCreatedAt)) {
                  return false; // Skip notifications sent before user account creation
                }
              }

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
                timestamp: formatNotificationDate(notification.sent_at || notification.created_at),
                rawTimestamp: notification.sent_at || notification.created_at,
                isRead: notification.read || false, // Use read field from notifications table
                recipientId: notification.id, // Use notification id for marking as read
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
      notificationsFromView = Array.from(combinedMap.values()).sort((a, b) => {
        const dateA = new Date(a.rawTimestamp || 0);
        const dateB = new Date(b.rawTimestamp || 0);
        return dateB - dateA; // Descending order
      });
    }

    return notificationsFromView;

  } catch (error) {
    console.error('Error in fetchNotifications:', error);
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  if (!notificationId) return false;

  try {
    // Update read field in notifications table
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

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
    // Get all notifications for this customer that are unread
    // Fetch all sent notifications and filter in JavaScript (more reliable for JSONB queries)
    const { data: allNotifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id, recipient_type, recipient_ids')
      .eq('status', 'sent')
      .not('sent_at', 'is', null)
      .or('read.is.null,read.eq.false');

    if (fetchError) {
      console.error('Error fetching notifications to mark as read:', fetchError);
      return false;
    }

    if (!allNotifications || allNotifications.length === 0) {
      return true; // No unread notifications
    }

    // Filter notifications that are for this customer
    const customerIdStr = String(customerId);
    const customerIdNum = Number(customerId);
    const notifications = allNotifications.filter((notification) => {
      // Check if notification is for all customers
      if (notification.recipient_type === 'all_customers') {
        return true;
      }

      // Check if customer_id is in recipient_ids JSONB array
      if (notification.recipient_ids && Array.isArray(notification.recipient_ids)) {
        return notification.recipient_ids.includes(customerId) ||
               notification.recipient_ids.includes(customerIdStr) ||
               notification.recipient_ids.includes(customerIdNum);
      }

      return false;
    });

    if (!notifications || notifications.length === 0) {
      return true; // No unread notifications
    }

    const notificationIds = notifications.map(n => n.id);

    // Update all notifications to read = true
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', notificationIds);

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
 * FIX: Only subscribe to sent notifications (status = 'sent')
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

    // ✅ Subscribe to notifications table for INSERT events (new notifications)
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        console.log('🔔 New notification created:', payload);
        // Check if this notification is for this customer and is sent
        const notification = payload.new;
        const customerIdStr = String(customerId);
        const customerIdNum = Number(customerId);
        
        // Only process if status is 'sent' and sent_at is not null
        const isSent = notification.status === 'sent' && notification.sent_at;
        
        const isForThisCustomer =
          notification.recipient_type === 'all_customers' ||
          (notification.recipient_ids &&
            Array.isArray(notification.recipient_ids) &&
            (notification.recipient_ids.includes(customerId) ||
              notification.recipient_ids.includes(customerIdStr) ||
              notification.recipient_ids.includes(customerIdNum)));

        if (isSent && isForThisCustomer) {
          console.log('🔔 New sent notification is for this customer, triggering callback');
          if (callback) {
            callback(payload);
          }
        } else {
          console.log('🔕 Notification not for this customer or not sent yet, ignoring');
        }
      }
    );

    // ✅ Subscribe to notifications table for UPDATE events (when status changes to 'sent')
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        console.log('🔔 Notification updated:', payload);
        // Check if status changed to 'sent' and if this notification is for this customer
        const notification = payload.new;
        const oldNotification = payload.old;
        const customerIdStr = String(customerId);
        const customerIdNum = Number(customerId);
        
        // Check if status changed to 'sent' or sent_at was just set
        const becameSent = 
          (notification.status === 'sent' && oldNotification?.status !== 'sent') ||
          (notification.sent_at && !oldNotification?.sent_at);
        
        const isForThisCustomer =
          notification.recipient_type === 'all_customers' ||
          (notification.recipient_ids &&
            Array.isArray(notification.recipient_ids) &&
            (notification.recipient_ids.includes(customerId) ||
              notification.recipient_ids.includes(customerIdStr) ||
              notification.recipient_ids.includes(customerIdNum)));

        if (becameSent && isForThisCustomer) {
          console.log('🔔 Notification status changed to sent for this customer, triggering callback');
          if (callback) {
            callback(payload);
          }
        }
      }
    );

    // Subscribe to the channel
    const subscribeResult = await channel.subscribe((status) => {
      console.log('📡 Subscription status:', status);
      if (status === 'SUBSCRIBED') { 
        console.log('📡 Channel name:', channelName);
        console.log('📡 Customer ID:', customerId);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Channel subscription error'); 
      } else if (status === 'TIMED_OUT') {
        console.error('⏱️ Subscription timed out'); 
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

