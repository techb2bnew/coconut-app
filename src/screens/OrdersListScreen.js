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
import { useFocusEffect } from '@react-navigation/native';
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
    
    if (statusLower === 'completed') return '#4CAF50'; // Green for Completed
    if (statusLower === 'processing') return '#FFE082'; // Yellow/Orange for Processing
    if (statusLower.includes('completed')) return '#4CAF50'; // Green for completed
    if (statusLower.includes('processing')) return '#FFE082'; // Yellow for processing
    if (statusLower.includes('delivered')) return '#4CAF50'; // Green for delivered
    if (statusLower.includes('delivery')) return '#81D4FA'; // Blue for out for delivery
    if (statusLower.includes('in transit')) return '#81D4FA'; // Blue for in transit
    if (statusLower.includes('driver assigned')) return '#FFE082'; // Yellow for driver assigned
    if (statusLower.includes('progress')) return '#FFE082'; // Yellow for in progress
    if (statusLower.includes('pending')) return '#FFCC80'; // Orange for pending
    return '#f2f2f2'; // Default gray
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
  const getSelectedDeliveryAddressFromOrder = (order) => {
    if (!order?.customer_details) return null;
  
    try {
      const customer = JSON.parse(order.customer_details);
      if (!customer?.delivery_address?.length) return null;
  
      return customer.delivery_address.find(addr => addr.isSelected);
    } catch (e) {
      console.error('Invalid customer_details JSON', e);
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
      console.log('📥 Fetching orders for customer:', customerId);
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('order_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching orders:', error);
        setLoading(false);
        return;
      }

      console.log('✅ Fetched orders count:', ordersData || 0);

      const processedOrders = (ordersData || []).map((order) => {
        const status = (order.status || 'Pending').trim();
        // Use deliveryStatus if available, otherwise fallback to status
        const deliveryStatusValue = order.delivery_status || order.deliveryStatus || status;
        const displayStatus = deliveryStatusValue.trim();
        const statusColor = getStatusColor(displayStatus);
        const selectedAddress = getSelectedDeliveryAddressFromOrder(order);

        const delivery_address = selectedAddress
        ? `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.zipCode}`
        : order.delivery_address || 'No delivery address selected';
          console.log('delivery_address', delivery_address);
        return {
          id: order.id,
          orderName: order.order_name || `ORD-${order.id}`,
          cases: order.total_cases || order.cases || order.quantity || 0,
          deliveryDate: formatDate(order.delivery_date),
          orderDate: formatDate(order.order_date),
          status: status,
          statusColor: statusColor,
          poNumber: order.po_number || '',
          orderDateRaw: order.order_date,
          deliveryDateRaw: order.delivery_date,
          deliveryStatus: deliveryStatusValue,
          delivery_address,
          driverId: order.driver_id || order.driverId || null,
          driverName: order.driver_name || order.driverName || null,
          driverPhone: order.driver_phone || order.driver_number || null,
          driverEmail: order.driver_email || order.driverEmail || null,
          driverddress: order.driver_address || order.driverAddress || null,
          driverCity: order.driver_city || order.driverCity || null,
          driverState: order.driver_state || order.driverState || null,
          driverZip: order.driver_zip || order.driverZip || null,
          // Additional fields for reorder
          order_notes: order.order_notes || order.notes || '',
          special_event: order.special_event || false,
          opener_kit: order.opener_kit || false,
          special_event_logo: order.special_event_logo || null,
          customer_details: order.customer_details || null,
        };
      });

      setOrders(processedOrders);
      setFilteredOrders(processedOrders);
    } catch (error) {
      console.error('❌ Error in fetchOrders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load customer and initial data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const id = await fetchCustomerId();
      if (id) {
        console.log('👤 Loaded customer ID on mount:', id);
        setCustomerId(id);
        await fetchOrders(id);
      } else {
        console.log('⚠️ No customer ID found on mount');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Re-fetch orders whenever screen comes into focus (after create, back navigation, etc.)
  useFocusEffect(
    React.useCallback(() => {
      if (!customerId) {
        return;
      }

      console.log('🔄 Screen focused, refreshing orders for customer:', customerId);
      setRefreshing(true);
      fetchOrders(customerId);
    }, [customerId])
  );

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

  // Check if order is completed
  const isOrderCompleted = (order) => {
    const status = (order.deliveryStatus || order.status || '').toLowerCase();
    return status.includes('completed') || status.includes('delivered');
  };

  // Handle reorder - use existing order data and navigate to CreateOrder
  const handleReorder = (order) => {
    if (!order) return;

    // Navigate to CreateOrder with pre-filled data from the order
    navigation.navigate('NewStack', {
      screen: 'CreateOrder',
      params: {
        reorderData: {
          quantity: order.cases || '',
          poNumber: order.poNumber || '',
          orderNotes: order.order_notes || '',
          specialEvent: order.special_event || false,
          openerKit: order.opener_kit || false,
          specialEventLogo: order.special_event_logo || null,
          deliveryAddress: order.customer_details || null,
        },
      },
    });
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
                {/* Header with Order ID and Status */}
                <View style={styles.orderCardHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <Text style={styles.orderId}>{order.orderName}</Text>
                    {order.poNumber ? (
                      <View style={styles.poNumberContainer}>
                        <Text style={styles.poNumberLabel}>PO Number - </Text>
                        <Text style={styles.poNumber}>{order.poNumber}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: order.statusColor }]}>
                    <Text style={styles.statusText}>{order.deliveryStatus || order.status}</Text>
                  </View>
                </View>

                {/* Delivery Date with Icon */}
                {order.deliveryDate && (
                  <View style={styles.deliveryDateRow}>
                    <Icon name="calendar-outline" size={18} color={Colors.primaryPink} />
                    <Text style={styles.deliveryDateText}>{order.deliveryDate}</Text>
                  </View>
                )}

                {/* Product Type and Quantity Together */}
                <View style={styles.productInfoRow}>
                  <View style={styles.productInfoItem}>
                    <Text style={styles.productInfoLabel}>Product Type</Text>
                    <Text style={styles.productInfoValue}>Case</Text>
                  </View>
                  <View style={styles.productInfoDivider} />
                  <View style={styles.productInfoItem}>
                    <Text style={styles.productInfoLabel}>Quantity</Text>
                    <Text style={styles.productInfoValue}>
                      {order.cases > 0 ? `${order.cases}` : 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => handleViewDetails(order)}
                    activeOpacity={0.8}>
                    <Icon name="eye-outline" size={20} color={Colors.cardBackground} />
                    <Text style={styles.viewDetailsText}>View Details</Text>
                  </TouchableOpacity>
                  
                  {isOrderCompleted(order) && (
                    <TouchableOpacity
                      style={styles.reorderButton}
                      onPress={() => handleReorder(order)}
                      activeOpacity={0.8}>
                      <Icon name="refresh" size={20} color={Colors.cardBackground} />
                      <Text style={styles.reorderText}>Reorder</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderId: {
    fontSize: 14,
    fontFamily: fontFamilyHeading,
    fontWeight: '700',
    color: Colors.textPrimary, 
  },
  poNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poNumberLabel: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    fontWeight: '600', 
    marginRight: 4,
  },
  poNumber: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: '#000000',
    textTransform: 'capitalize',
  },
  deliveryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
  },
  deliveryDateText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginLeft: 5,
  },
  productInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
  },
  productInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  productInfoDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  productInfoLabel: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary, 
  },
  productInfoValue: {
    fontSize: 16,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  deliveryStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  deliveryStatusText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    fontWeight: '500',
    color: Colors.cardBackground,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12, 
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: Colors.primaryPink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewDetailsText: {
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  reorderButton: {
    flex: 1,
    backgroundColor: '#424242',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  reorderText: {
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default OrdersListScreen;

