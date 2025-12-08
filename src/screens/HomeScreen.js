/**
 * Home Screen
 * Dashboard with summary cards, recent orders, and activity
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import Logo from '../components/Logo';
import BottomTabNavigation from '../components/BottomTabNavigation';
import supabase from '../config/supabase';

const HomeScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [stats, setStats] = useState({
    activeOrders: 0,
    pending: 0,
    thisMonth: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Helper function to get time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
  };

  // Helper function to get status color
  const getStatusColor = (status) => {
    if (!status) return '#9E9E9E';
    const statusLower = status.trim().toLowerCase();
    
    // Handle exact status values from database
    if (statusLower === 'completed') return '#4CAF50'; // Green for Completed
    if (statusLower === 'processing') return '#FFE082'; // Yellow/Orange for Processing
    if (statusLower.includes('completed')) return '#4CAF50'; // Green for completed
    if (statusLower.includes('processing')) return '#FFE082'; // Yellow for processing
    if (statusLower.includes('delivered')) return '#4CAF50'; // Green for delivered
    if (statusLower.includes('delivery')) return '#81D4FA'; // Blue for out for delivery
    if (statusLower.includes('progress')) return '#FFE082'; // Yellow for in progress
    if (statusLower.includes('pending')) return '#FFCC80'; // Orange for pending
    return '#9E9E9E'; // Default gray
  };

  // Fetch customer ID from logged in user email
  const fetchCustomerId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        console.log('No user logged in');
        return null;
      }

      // Get customer ID from customers table using email
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
      console.error('Error in fetchCustomerId:', error);
      return null;
    }
  };

  // Fetch orders for customer
  const fetchOrders = async (customerId) => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch orders from orders table
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('order_date', { ascending: false })
        .limit(20); // Get recent 20 orders

      if (error) {
        console.error('Error fetching orders:', error);
        setLoading(false);
        return;
      }

      // Process orders data
      const processedOrders = (orders || []).map((order) => {
        // Use status from database directly (trim to remove any extra spaces)
        const status = (order.status || 'Pending').trim();
        const statusColor = getStatusColor(status);
        
        // Debug log to verify status and color mapping
        console.log(`Order ${order.id}: status="${status}", color="${statusColor}"`);

        return {
          id: order.id,
          orderName: order.order_name || `ORD-${order.id}`,
          cases: order.total_cases || order.cases || order.quantity || 0,
          deliveryDate: formatDate(order.delivery_date),
          status: status,
          statusColor: statusColor,
          orderDate: order.order_date,
          orderDateRaw: order.order_date,
          deliveryDateRaw: order.delivery_date,
          poNumber: order.po_number,
        };
      });

      // Set recent orders (latest 3)
      setRecentOrders(processedOrders.slice(0, 3));

      // Calculate stats
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const activeOrdersCount = processedOrders.filter(
        (order) => {
          const statusLower = (order.status || '').toLowerCase();
          return statusLower.includes('processing') || statusLower.includes('pending');
        }
      ).length;

      const pendingCount = processedOrders.filter(
        (order) => {
          const statusLower = (order.status || '').toLowerCase();
          return statusLower.includes('processing');
        }
      ).length;

      const thisMonthCount = processedOrders.filter((order) => {
        if (!order.orderDate) return false;
        const orderDate = new Date(order.orderDate);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      }).length;

      setStats({
        activeOrders: activeOrdersCount,
        pending: pendingCount,
        thisMonth: thisMonthCount,
      });

      // Create recent activity from orders
      const activity = processedOrders.slice(0, 3).map((order, index) => {
        let icon = 'cube-outline';
        let iconColor = Colors.primaryPink;
        let title = 'Order Confirmed';

        const statusLower = (order.status || '').toLowerCase();
        if (statusLower.includes('completed')) {
          icon = 'cube-outline';
          iconColor = '#4CAF50'; // Green
          title = 'Order Completed';
        } else if (statusLower.includes('processing')) {
          icon = 'time-outline';
          iconColor = '#FFE082'; // Yellow
          title = 'Order Processing';
        } else if (statusLower.includes('delivered')) {
          icon = 'cube-outline';
          iconColor = '#4CAF50';
          title = 'Order Delivered';
        } else if (statusLower.includes('delivery')) {
          icon = 'car-outline';
          iconColor = Colors.primaryPink;
          title = 'Out for Delivery';
        } else if (statusLower.includes('pending')) {
          icon = 'time-outline';
          iconColor = '#FFCC80'; // Orange
          title = 'Order Pending';
        }

        return {
          id: order.id.toString(),
          icon,
          iconColor,
          title,
          details: `${order.orderName}${order.cases > 0 ? ` • ${order.cases} cases` : ''}`,
          time: getTimeAgo(order.orderDate),
        };
      });

      setRecentActivity(activity);
    } catch (error) {
      console.error('Error in fetchOrders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const id = await fetchCustomerId();
      if (id) {
        setCustomerId(id);
        await fetchOrders(id);
      } else {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    const id = await fetchCustomerId();
    if (id) {
      await fetchOrders(id);
    } else {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {loading && recentOrders.length === 0 ? (
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
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoHeader}>
            <Logo size={150} />
          </View> 
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.taglineText}>
            Manage your orders and track deliveries
          </Text>
        </View>

        {/* Summary Cards - Overlapping pink background */}
        <View style={styles.summaryContainer}>
          {/* Active Orders Card */}
          <View style={styles.summaryCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#E1BEE7' }]}>
              <Icon name="cube-outline" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.summaryNumber}>{stats.activeOrders}</Text>
            <Text style={styles.summaryLabel}>Active Orders</Text>
          </View>

          {/* Pending Card */}
          <View style={styles.summaryCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFE0B2' }]}>
              <Icon name="time-outline" size={24} color="#FF9800" />
            </View>
            <Text style={styles.summaryNumber}>{stats.pending}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>

          {/* This Month Card */}
          <View style={styles.summaryCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#E1BEE7' }]}>
              <Icon name="trending-up-outline" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.summaryNumber}>{stats.thisMonth}</Text>
            <Text style={styles.summaryLabel}>This Month</Text>
          </View>
        </View>

        {/* Recent Orders Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrdersList')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.map((order, index) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('OrderDetail', { order })}>
              <View style={styles.orderCardContent}>
                <View style={styles.orderLeft}>
                  <Text style={styles.orderId}>{order.orderName || `ORD-${order.id}`}</Text>
                  {order.cases > 0 && (
                    <Text style={styles.orderCases}>{order.cases} cases</Text>
                  )}
                </View>
                <View style={styles.orderRight}>
                  <View style={[styles.statusBadge, { backgroundColor: order.statusColor }]}>
                    <Text style={styles.statusText}>{order.status}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.deliveryDate}>Delivery: {order.deliveryDate}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrdersList')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: activity.iconColor + '20' }]}>
                <Icon name={activity.icon} size={20} color={activity.iconColor} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDetails}>{activity.details}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom spacing for navigation */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      )}

      {/* Bottom Navigation Bar */}
      <BottomTabNavigation navigation={navigation} activeTab="Orders" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundGray,
  },
  header: {
    backgroundColor: Colors.primaryPink,
    paddingTop: 20,
    paddingBottom: 60, // Extra padding for overlapping cards
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoHeader: {
    marginBottom: 8,
  },
  brandText: {
    fontSize: 14,
    color: Colors.cardBackground,
    fontWeight: '500',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 20,
    color: Colors.cardBackground,
    fontWeight: '600',
    marginBottom: 8,
  },
  taglineText: {
    fontSize: 14,
    color: Colors.cardBackground,
    textAlign: 'center',
    opacity: 0.9,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -50, // Overlap pink background - cards sit on top
    paddingBottom: 16,
    zIndex: 10,
    position: 'relative',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primaryPink,
    fontWeight: '500',
  },
  orderCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderLeft: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  orderCases: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.cardBackground,
  },
  deliveryDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  activityDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bottomSpacing: {
    height: 80, // Space for bottom navigation
  },
});

export default HomeScreen;
