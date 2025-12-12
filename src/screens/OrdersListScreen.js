/**
 * Orders List Screen
 * Shows all orders with search and filter functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';
import supabase from '../config/supabase';

const OrdersListScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerId, setCustomerId] = useState(null);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Helper function to get status color
  const getStatusColor = (status) => {
    if (!status) return '#9E9E9E';
    const statusLower = status.trim().toLowerCase();
    
    if (statusLower === 'completed') return '#4CAF50'; // Green
    if (statusLower === 'processing') return '#FFE082'; // Yellow
    if (statusLower.includes('completed')) return '#4CAF50';
    if (statusLower.includes('processing')) return '#FFE082';
    if (statusLower.includes('delivered')) return '#4CAF50';
    if (statusLower.includes('delivery')) return '#81D4FA'; // Light blue
    if (statusLower.includes('pending')) return '#FFCC80'; // Orange
    return '#9E9E9E';
  };

  // Fetch customer ID
  const fetchCustomerId = async () => {
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
      console.error('Error in fetchCustomerId:', error);
      return null;
    }
  };

  // Fetch orders
  const fetchOrders = async (customerId) => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('order_date', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        setLoading(false);
        return;
      }

      const processedOrders = (ordersData || []).map((order) => {
        const status = (order.status || 'Pending').trim();
        return {
          id: order.id,
          orderName: order.order_name || `ORD-${order.id}`,
          cases: order.total_cases || order.cases || order.quantity || 0,
          deliveryDate: formatDate(order.delivery_date),
          orderDate: formatDate(order.order_date),
          status: status,
          statusColor: getStatusColor(status),
          poNumber: order.po_number || '',
          orderDateRaw: order.order_date,
          deliveryDateRaw: order.delivery_date,
        };
      });

      setOrders(processedOrders);
      setFilteredOrders(processedOrders);
    } catch (error) {
      console.error('Error in fetchOrders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on mount
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

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredOrders(orders);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = orders.filter(
      (order) =>
        order.orderName.toLowerCase().includes(query) ||
        (order.poNumber && order.poNumber.toLowerCase().includes(query))
    );
    setFilteredOrders(filtered);
  }, [searchQuery, orders]);

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

  const handleBack = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  const handleViewDetails = (order) => {
    if (navigation) {
      navigation.navigate('OrderDetail', { order });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.cardBackground} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order number or PO..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Create New Order Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.createButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('NewStack', { screen: 'CreateOrder' })}>
          <Icon name="add" size={24} color={Colors.cardBackground} />
          <Text style={styles.createButtonText}>Create New Order</Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryPink} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primaryPink}
            />
          }>
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <Text style={styles.orderId}>{order.orderName}</Text>
                    <Text style={styles.orderDate}>{order.orderDate}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: order.statusColor }]}>
                    <Text style={styles.statusText}>{order.status}</Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Product Type</Text>
                    <Text style={styles.detailValue}>Case</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quantity</Text>
                    <Text style={styles.detailValue}>
                      {order.cases > 0 ? `${order.cases}` : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Delivery Date</Text>
                    <Text style={styles.detailValue}>
                      {order.deliveryDate || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>PO Number</Text>
                    <Text style={styles.detailValue}>
                      {order.poNumber || 'N/A'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => handleViewDetails(order)}
                  activeOpacity={0.8}>
                  <Icon name="eye-outline" size={20} color={Colors.cardBackground} />
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontFamily: fontFamilyBody,
    marginLeft: 8,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  createButton: {
    backgroundColor: Colors.primaryPink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
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
    fontSize: 16,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  orderCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderId: {
    fontSize: 18,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    fontWeight: '500',
    color: Colors.cardBackground,
  },
  orderDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  viewDetailsButton: {
    backgroundColor: Colors.primaryPink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  viewDetailsText: {
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default OrdersListScreen;

