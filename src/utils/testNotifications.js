/**
 * Test Notification Utilities
 * Helper functions to test notifications
 */

import supabase from '../config/supabase';
import { getCustomerId } from '../services/notificationService';

/**
 * Test: Create a test notification in Supabase
 * This helps verify if notifications are being created properly
 */
export const createTestNotification = async () => {
  try {
    const customerId = await getCustomerId();
    if (!customerId) {
      console.log('❌ No customer ID found');
      return false;
    }

    console.log('🧪 Creating test notification for customer:', customerId);

    // Create test notification
    const testNotification = {
      notification_id: `NOTIF-TEST-${Date.now()}`,
      title: 'Test Notification',
      message: 'This is a test notification to verify real-time updates',
      recipient_type: 'selected_customers',
      recipient_count: 1,
      recipient_ids: [customerId],
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select();

    if (error) {
      console.error('❌ Error creating test notification:', error);
      return false;
    }

    console.log('✅ Test notification created:', data);
    return true;
  } catch (error) {
    console.error('❌ Error in createTestNotification:', error);
    return false;
  }
};

/**
 * Test: Check if Supabase Realtime is enabled
 */
export const checkRealtimeStatus = async () => {
  try {
    console.log('🔍 Checking Supabase Realtime status...');
    
    // Try to create a test channel
    const testChannel = supabase.channel('test-realtime-check');
    
    testChannel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        console.log('✅ Realtime is working! Test payload:', payload);
      })
      .subscribe((status) => {
        console.log('📡 Test channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Supabase Realtime is enabled and working!');
          // Clean up test channel
          setTimeout(() => {
            supabase.removeChannel(testChannel);
          }, 2000);
        } else {
          console.log('⚠️ Realtime status:', status);
        }
      });
  } catch (error) {
    console.error('❌ Error checking Realtime status:', error);
  }
};

