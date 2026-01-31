/**
 * Realtime Orders Service
 * Subscribes to orders table changes so lists and detail update without refresh.
 */

import supabase from '../config/supabase';

/**
 * Subscribe to all orders for a customer. On INSERT/UPDATE/DELETE calls onOrdersChange.
 * Returns unsubscribe function.
 */
export const subscribeToOrdersRealtime = (customerId, onOrdersChange) => {
  if (!customerId) return () => {};

  const customerIdStr = String(customerId);
  const channelName = `orders:${customerIdStr}:${Date.now()}`;
  const channel = supabase.channel(channelName);

  const handleChange = () => {
    if (onOrdersChange) onOrdersChange();
  };

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'orders',
      filter: `customer_id=eq.${customerIdStr}`,
    },
    handleChange
  );

  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Subscribe to a single order by id. On UPDATE calls onOrderChange(payload.new).
 * Returns unsubscribe function.
 */
export const subscribeToOrderRealtime = (orderId, onOrderChange) => {
  if (!orderId) return () => {};

  const orderIdStr = String(orderId);
  const channelName = `order:${orderIdStr}:${Date.now()}`;
  const channel = supabase.channel(channelName);

  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `id=eq.${orderIdStr}`,
    },
    (payload) => {
      if (onOrderChange && payload?.new) onOrderChange(payload.new);
    }
  );

  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};
