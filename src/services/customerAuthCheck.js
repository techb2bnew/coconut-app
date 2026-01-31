/**
 * Customer Auth Check Service
 * Ensures customer is still valid (not deleted, not inactive).
 * When admin deletes a customer or sets status to inactive, this triggers logout.
 */

import supabase from '../config/supabase';
import { navigationRef } from '../navigation/AppNavigator';
import Toast from 'react-native-toast-message';

/**
 * Check if current user's customer record exists and is active.
 * Returns true if user should be logged out (customer deleted or status inactive).
 * Does NOT sign out or navigate - caller should do that when true is returned.
 */
export const shouldLogoutCustomer = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return false; // No session, nothing to check
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, status')
      .eq('email', user.email)
      .maybeSingle();

    // Customer deleted (no row)
    if (error) {
      console.warn('Customer auth check error:', error?.message);
      return true; // On fetch error, logout to be safe (e.g. row removed)
    }
    if (!customer) {
      return true; // Customer deleted by admin
    }

    // Check status: inactive if status is 'inactive', 'disabled', or 'deactivated'
    const status = (customer.status || '').trim().toLowerCase();
    const isInactive = status === 'inactive' || status === 'disabled' || status === 'deactivated';

    if (isInactive) {
      return true; // Customer marked inactive by admin
    }

    return false;
  } catch (e) {
    console.warn('shouldLogoutCustomer error:', e);
    return false; // On unexpected error, don't force logout
  }
};

/**
 * Sign out and navigate to Login. Call this when shouldLogoutCustomer() returns true.
 */
export const performLogoutAndNavigateToLogin = async () => {
  try {
    await supabase.auth.signOut();
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
    Toast.show({
      type: 'info',
      text1: 'Session ended',
      text2: 'Your account has been deactivated or removed. Please contact support if you need access.',
      position: 'top',
      visibilityTime: 4000,
    });
  } catch (e) {
    console.warn('performLogoutAndNavigateToLogin error:', e);
  }
};

/**
 * Check customer validity and, if deleted/inactive, logout and navigate to Login.
 * Returns true if logout was performed, false otherwise.
 */
export const checkCustomerAndLogoutIfNeeded = async () => {
  const needLogout = await shouldLogoutCustomer();
  if (needLogout) {
    await performLogoutAndNavigateToLogin();
    return true;
  }
  return false;
};

/**
 * Subscribe to customer row in realtime. When admin deletes or sets status inactive, calls onDeletedOrInactive.
 * Returns unsubscribe function.
 */
export const subscribeToCustomerRealtime = (customerId, onDeletedOrInactive) => {
  if (!customerId) return () => {};

  const idStr = String(customerId);
  const channelName = `customer:${idStr}:${Date.now()}`;
  const channel = supabase.channel(channelName);

  channel.on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'customers',
      filter: `id=eq.${idStr}`,
    },
    () => {
      if (onDeletedOrInactive) onDeletedOrInactive();
    }
  );

  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'customers',
      filter: `id=eq.${idStr}`,
    },
    (payload) => {
      const status = (payload?.new?.status || '').trim().toLowerCase();
      if (status === 'inactive' || status === 'disabled' || status === 'deactivated') {
        if (onDeletedOrInactive) onDeletedOrInactive();
      }
    }
  );

  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};
