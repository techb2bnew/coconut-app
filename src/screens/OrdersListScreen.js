/**
 * Orders List Screen
 * Shows all orders with search and filter functionality
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Calendar } from 'react-native-calendars';
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
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'week', 'month'
  const [selectedDates, setSelectedDates] = useState([]); // Array of selected dates in YYYY-MM-DD format
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [markedDates, setMarkedDates] = useState({}); // For calendar marked dates
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['75%'], []);
  const [stats, setStats] = useState({
    active: 0,
    pending: 0,
    total: 0,
  });

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Helper function to get status color (light background colors)
  const getStatusColor = (status) => {
    if (!status) return '#E0E0E0';
    const statusLower = status.trim().toLowerCase();
    
    if (statusLower === 'completed') return '#C8E6C9'; // Light Green for Completed
    if (statusLower === 'processing') return '#FFF9C4'; // Light Yellow for Processing
    if (statusLower.includes('completed')) return '#C8E6C9'; // Light Green for completed
    if (statusLower.includes('processing')) return '#FFF9C4'; // Light Yellow for processing
    if (statusLower.includes('delivered')) return '#C8E6C9'; // Light Green for delivered
    if (statusLower.includes('delivery')) return '#BBDEFB'; // Light Blue for out for delivery
    if (statusLower.includes('in transit')) return '#BBDEFB'; // Light Blue for in transit
    if (statusLower.includes('driver assigned')) return '#fffbeb'; // Light Yellow for driver assigned
    if (statusLower.includes('progress')) return '#FFF9C4'; // Light Yellow for in progress
    if (statusLower.includes('pending')) return '#FFE0B2'; // Light Orange for pending
    return '#E0E0E0'; // Default light gray
  };

  // Helper function to get status text color (dark colors)
  const getStatusTextColor = (status) => {
    if (!status) return '#424242';
    const statusLower = status.trim().toLowerCase();
    
    if (statusLower === 'completed') return '#2E7D32'; // Dark Green for Completed
    if (statusLower === 'processing') return '#F57F17'; // Dark Yellow/Orange for Processing
    if (statusLower.includes('completed')) return '#2E7D32'; // Dark Green for completed
    if (statusLower.includes('processing')) return '#F57F17'; // Dark Yellow for processing
    if (statusLower.includes('delivered')) return '#2E7D32'; // Dark Green for delivered
    if (statusLower.includes('delivery')) return '#1565C0'; // Dark Blue for out for delivery
    if (statusLower.includes('in transit')) return '#1565C0'; // Dark Blue for in transit
    if (statusLower.includes('driver assigned')) return '#F57F17'; // Dark Yellow for driver assigned
    if (statusLower.includes('progress')) return '#F57F17'; // Dark Yellow/Orange for in progress
    if (statusLower.includes('pending')) return '#E65100'; // Dark Orange for pending
    return '#424242'; // Default dark gray
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
      
      // Check if delivery_address exists and is an array
      if (!customer?.delivery_address) return null;
      
      // If delivery_address is not an array, return null
      if (!Array.isArray(customer.delivery_address)) {
        console.warn('delivery_address is not an array:', customer.delivery_address);
        return null;
      }
      
      // Check if array has items
      if (customer.delivery_address.length === 0) return null;
  
      // Find selected address
      return customer.delivery_address.find(addr => addr && addr.isSelected);
    } catch (e) {
      console.error('Invalid customer_details JSON', e);
      return null;
    }
  };

  // Helper function to format date to YYYY-MM-DD
  const formatDateToString = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to normalize date to YYYY-MM-DD format for comparison
  const normalizeDateToString = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Apply filters based on search, time period, and selected dates
  const applyFilters = (ordersList, query, timePeriod, dates) => {
    let filtered = [...ordersList];

    // Apply search filter
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderName.toLowerCase().includes(queryLower) ||
          (order.poNumber && order.poNumber.toLowerCase().includes(queryLower))
      );
    }

    // Apply selected dates filter if dates are selected
    if (dates && dates.length > 0) {
      filtered = filtered.filter((order) => {
        const createdDate = order.createdAt || order.created_at || order.orderDateRaw;
        if (!createdDate) return false;
        
        // Normalize order date to YYYY-MM-DD format
        const orderDateNormalized = normalizeDateToString(createdDate);
        if (!orderDateNormalized) return false;
        
        // Check if order's normalized date matches any selected date (already in YYYY-MM-DD format)
        return dates.includes(orderDateNormalized);
      });
    } else {
      // Apply time period filter based on created_at date (only if no dates selected)
      if (timePeriod !== 'all') {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        
        filtered = filtered.filter((order) => {
          // Use created_at if available, otherwise fallback to order_date
          const createdDate = order.createdAt || order.created_at || order.orderDateRaw;
          if (!createdDate) return false;
          const orderCreatedDate = new Date(createdDate);
          
          // Validate date
          if (isNaN(orderCreatedDate.getTime())) return false;
          
          if (timePeriod === 'today') {
            // Check if order was created today
            return orderCreatedDate >= todayStart && orderCreatedDate <= todayEnd;
          } else if (timePeriod === 'week') {
            // Check if order was created in last 7 days (including today)
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 6); // 7 days including today = 6 days ago
            weekAgo.setHours(0, 0, 0, 0);
            return orderCreatedDate >= weekAgo && orderCreatedDate <= todayEnd;
          } else if (timePeriod === 'month') {
            // Check if order was created in current calendar month
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            return orderCreatedDate >= monthStart && orderCreatedDate <= todayEnd;
          }
          return true;
        });
      }
    }

    setFilteredOrders(filtered);
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
        .order('created_at', { ascending: false });

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
        const statusTextColor = getStatusTextColor(displayStatus);
        const selectedAddress = getSelectedDeliveryAddressFromOrder(order);
        
        // Get created_at date (check multiple possible field names)
        const createdAt = order.created_at || order.createdAt || order.created_date || order.order_date;

        // Safely construct delivery address string
        let delivery_address = 'No delivery address selected';
        if (selectedAddress && selectedAddress.street && selectedAddress.city) {
          const street = selectedAddress.street || '';
          const city = selectedAddress.city || '';
          const state = selectedAddress.state || '';
          const zipCode = selectedAddress.zipCode || selectedAddress.zip_code || '';
          delivery_address = `${street}, ${city}, ${state}${zipCode ? ' - ' + zipCode : ''}`.trim();
        } else if (order.delivery_address) {
          // Fallback to order.delivery_address if it's a string
          delivery_address = typeof order.delivery_address === 'string' 
            ? order.delivery_address 
            : 'No delivery address selected';
        }
        return {
          id: order.id,
          customer_id: order.customer_id, // Include customer_id for OrderDetailScreen
          orderName: order.order_name || `ORD-${order.id}`,
          cases: order.total_cases || order.cases || order.quantity || 0,
          deliveryDate: formatDate(order.delivery_date),
          orderDate: formatDate(order.order_date),
          status: status,
          statusColor: statusColor,
          statusTextColor: statusTextColor,
          poNumber: order.po_number || '',
          orderDateRaw: order.order_date,
          deliveryDateRaw: order.delivery_date,
          delivery_day_date: order.delivery_day_date || null, // Text value: "Same Day", "1 day", "2 days", or null
          createdAt: createdAt,
          created_at: createdAt,
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

      // Calculate stats
      const activeCount = processedOrders.filter(o => {
        const status = (o.deliveryStatus || o.status || '').toLowerCase();
        return !status.includes('completed') && !status.includes('delivered')  ;
      }).length;
      
      const pendingCount = processedOrders.filter(o => {
        const status = (o.deliveryStatus || o.status || '').toLowerCase();
        return status.includes('pending')  ;
      }).length;

      setStats({
        active: activeCount,
        pending: pendingCount,
        total: processedOrders.length,
      });

      setOrders(processedOrders);
      applyFilters(processedOrders, searchQuery, timeFilter, selectedDates);
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
    applyFilters(orders, searchQuery, timeFilter, selectedDates);
  }, [searchQuery, orders, timeFilter, selectedDates]);

  // Update marked dates when selectedDates changes
  useEffect(() => {
    updateMarkedDates(selectedDates);
  }, [selectedDates]);

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

  // Handle time filter change
  const handleTimeFilterChange = (filter) => {
    setTimeFilter(filter);
    // Clear selected dates when changing time filter
    if (filter !== 'all') {
      setSelectedDates([]);
    }
  };

  // Handle date picker open
  const handleOpenDatePicker = () => {
    setShowDatePickerModal(true);
    bottomSheetRef.current?.expand();
    // Update marked dates when opening
    updateMarkedDates(selectedDates);
  };

  // Update marked dates for calendar display
  const updateMarkedDates = (dates) => {
    const marked = {};
    dates.forEach((date) => {
      marked[date] = {
        selected: true,
        selectedColor: Colors.primaryBlue,
        selectedTextColor: Colors.cardBackground,
      };
    });
    setMarkedDates(marked);
  };

  // Handle date selection from calendar
  const handleDayPress = (day) => {
    const dateStr = day.dateString; // Already in YYYY-MM-DD format
    let newSelectedDates;
    
    if (selectedDates.includes(dateStr)) {
      // Remove date if already selected
      newSelectedDates = selectedDates.filter((d) => d !== dateStr);
    } else {
      // Add date if not selected
      newSelectedDates = [...selectedDates, dateStr];
    }
    
    setSelectedDates(newSelectedDates);
    updateMarkedDates(newSelectedDates);
  };

  // Remove date from selected dates
  const handleRemoveDate = (dateToRemove) => {
    setSelectedDates(selectedDates.filter(date => date !== dateToRemove));
  };

  // Clear all selected dates
  const handleClearDates = () => {
    setSelectedDates([]);
  };

  // Apply selected dates and close bottom sheet
  const handleApplyDates = () => {
    bottomSheetRef.current?.close();
    setShowDatePickerModal(false);
  };

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Skeleton loader component
  const OrderCardSkeleton = () => (
    <LinearGradient
      colors={['#eff6ff', '#ffffff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.orderCard}>
      <View style={styles.orderCardHeader}>
        <View style={styles.orderHeaderLeft}>
          <View style={[styles.skeletonBox, { width: 120, height: 16, marginBottom: 8 }]} />
          <View style={[styles.skeletonBox, { width: 150, height: 14 }]} />
        </View>
        <View style={[styles.skeletonBox, { width: 80, height: 28, borderRadius: 20 }]} />
      </View>
      
      <View style={[styles.deliveryDateRow, { marginBottom: 12 }]}>
        <View style={[styles.skeletonBox, { width: 18, height: 18, borderRadius: 9, marginRight: 8 }]} />
        <View style={[styles.skeletonBox, { width: 100, height: 14 }]} />
      </View>
      
      <View style={styles.productInfoRow}>
        <View style={styles.productInfoItem}>
          <View style={[styles.skeletonBox, { width: 80, height: 12, marginBottom: 6 }]} />
          <View style={[styles.skeletonBox, { width: 40, height: 16 }]} />
        </View>
        <View style={styles.productInfoDivider} />
        <View style={styles.productInfoItem}>
          <View style={[styles.skeletonBox, { width: 60, height: 12, marginBottom: 6 }]} />
          <View style={[styles.skeletonBox, { width: 30, height: 16 }]} />
        </View>
      </View>
      
      <View style={styles.actionButtonsContainer}>
        <View style={[styles.skeletonBox, { flex: 1, height: 40, borderRadius: 8 }]} />
        <View style={[styles.skeletonBox, { flex: 1, height: 40, borderRadius: 8, marginLeft: 12 }]} />
      </View>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.container} edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={Colors.cardBackground} />
            <Text style={styles.backText}>Dashboard</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Orders</Text>
          <Text style={styles.headerSubtitle}>Manage your coconut deliveries</Text>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Icon name="search" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by order or PO number..."
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                  activeOpacity={0.7}>
                  <Icon name="close-circle" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
  
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={[styles.iconContainer, { backgroundColor: Colors.primaryPink }]}>
              <Icon name="cube-outline" size={24} color="#ffffff" />
            </View>
            <Text style={styles.summaryNumber}>{stats.active}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#fd5b00' }]}>
              <Icon name="time-outline" size={24} color="#ffffff" />
            </View>
            <Text style={styles.summaryNumber}>{stats.pending}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}>
              <Icon name="trending-up-outline" size={24} color="#ffffff" />
            </View>
            <Text style={styles.summaryNumber}>{stats.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View> 

        {/* Create New Order Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.createButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('NewStack', { screen: 'CreateOrder' })}>
            <Icon name="cube-outline" size={24} color={Colors.cardBackground} />
            <Text style={styles.createButtonText}>Create New Order</Text>
          </TouchableOpacity>
        </View>

        {/* Time Period Filter */}
        <View style={styles.timeFilterContainer}>
          <View style={styles.timeFilterLabelRow}>
            <Text style={styles.timeFilterLabel}>Time Period</Text>
            <TouchableOpacity
              onPress={handleOpenDatePicker}
              style={styles.dateIconButton}
              activeOpacity={0.7}>
              <Icon name="filter-outline" size={16} color={'#ffffff'} />
            </TouchableOpacity>
          </View>
          {selectedDates.length > 0 && (
            <View style={styles.selectedDatesContainer}>
              <View style={styles.selectedDatesHeader}>
                <Text style={styles.selectedDatesLabel}>Selected Dates:</Text>
                <TouchableOpacity
                  onPress={handleClearDates}
                  style={styles.clearAllButton}>
                  <Icon name="close-circle" size={18} color={Colors.textSecondary} />
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedDatesScrollContent}>
                {selectedDates.map((date, index) => (
                  <View key={index} style={styles.selectedDateChip}>
                    <Icon name="calendar" size={14} color={Colors.primaryBlue} style={styles.dateChipIcon} />
                    <Text style={styles.selectedDateText}>{formatDateDisplay(date)}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveDate(date)}
                      style={styles.removeDateButton}
                      activeOpacity={0.7}> 
                      <Icon name="close" size={14} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={styles.timeFilterButtons}>
            {[
              { key: 'all', label: 'All Time' },
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.timeFilterButton,
                  timeFilter === filter.key && styles.timeFilterButtonActive,
                ]}
                onPress={() => handleTimeFilterChange(filter.key)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.timeFilterButtonText,
                    timeFilter === filter.key && styles.timeFilterButtonTextActive,
                  ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Orders List */}
        {loading ? (
          <View>
            {[1, 2, 3].map((index) => (
              <OrderCardSkeleton key={index} />
            ))}
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <View
              key={order.id}
              style={styles.orderCard}>
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
                <View style={[styles.statusBadge, { backgroundColor: order.statusColor || '#E0E0E0' }]}>
                  <Text style={[styles.statusText, { color: order.statusTextColor || '#424242' }]}>{order.deliveryStatus || order.status}</Text>
                </View>
              </View>
 
                  {order.delivery_day_date ? (
                <View style={styles.deliveryDateRow}>
                  <Icon name="calendar-outline" size={18} color={Colors.primaryBlue} /> 
                    <Text style={[styles.deliveryDateText, { color: Colors.success,   fontWeight: '600' }]}>
                      Delivery: {order.delivery_day_date}
                    </Text>
                    </View>
                  ) : (
                <View style={styles.deliveryDateRow}>
                  <Icon name="calendar-outline" size={18} color={Colors.primaryBlue} /> 
                    <Text style={[styles.deliveryDateText, { color: Colors.textSecondary,   }]}>
                      Delivery updates will be sent to your email soon.
                    </Text>
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

        {/* Date Picker Bottom Sheet */}
        <Modal
          visible={showDatePickerModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            bottomSheetRef.current?.close();
            setShowDatePickerModal(false);
          }}>
          <View style={styles.modalOverlay}>
            <BottomSheet
              ref={bottomSheetRef}
              index={0}
              snapPoints={snapPoints}
              enablePanDownToClose={true}
              onClose={() => setShowDatePickerModal(false)}
              backgroundStyle={styles.bottomSheetBackground}
              handleIndicatorStyle={styles.bottomSheetIndicator}>
              <BottomSheetScrollView
                contentContainerStyle={styles.bottomSheetContent}
                showsVerticalScrollIndicator={false}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>Select Dates</Text>
                  <TouchableOpacity
                    onPress={() => {
                      bottomSheetRef.current?.close();
                      setShowDatePickerModal(false);
                    }}
                    style={styles.closeButton}>
                    <Icon name="close" size={24} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerLabel}>Select Multiple Dates</Text>
                  <Text style={styles.datePickerSubLabel}>
                    Tap dates to select/deselect
                  </Text>
                  <Calendar
                    onDayPress={handleDayPress}
                    markedDates={markedDates}
                    markingType="simple"
                    theme={{
                      backgroundColor: Colors.cardBackground,
                      calendarBackground: Colors.cardBackground,
                      textSectionTitleColor: Colors.textPrimary,
                      selectedDayBackgroundColor: Colors.primaryBlue,
                      selectedDayTextColor: Colors.cardBackground,
                      todayTextColor: Colors.primaryBlue,
                      dayTextColor: Colors.textPrimary,
                      textDisabledColor: Colors.textSecondary,
                      dotColor: Colors.primaryBlue,
                      selectedDotColor: Colors.cardBackground,
                      arrowColor: Colors.primaryBlue,
                      monthTextColor: Colors.textPrimary,
                      textDayFontFamily: fontFamilyBody,
                      textMonthFontFamily: fontFamilyHeading,
                      textDayHeaderFontFamily: fontFamilyBody,
                      textDayFontSize: 14,
                      textMonthFontSize: 16,
                      textDayHeaderFontSize: 12,
                    }}
                    style={styles.calendar}
                  />
                </View>

                {selectedDates.length > 0 && (
                  <View style={styles.selectedDatesListContainer}>
                    <Text style={styles.selectedDatesListTitle}>Selected Dates:</Text>
                    <View style={styles.selectedDatesList}>
                      {selectedDates.map((date, index) => (
                        <View key={index} style={styles.selectedDateItem}>
                          <Text style={styles.selectedDateItemText}>{formatDateDisplay(date)}</Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveDate(date)}
                            style={styles.removeDateItemButton}>
                            <Icon name="close" size={18} color={Colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity
                      onPress={handleClearDates}
                      style={styles.clearAllDatesButton}>
                      <Text style={styles.clearAllDatesText}>Clear All Dates</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleApplyDates}
                  style={styles.applyDatesButton}
                  activeOpacity={0.8}>
                  <Text style={styles.applyDatesButtonText}>Apply Filter</Text>
                </TouchableOpacity>
              </BottomSheetScrollView>
            </BottomSheet>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
  },
  header: {
    width: '100%',
    backgroundColor: Colors.primaryBlue,
    paddingTop: Platform.OS === 'ios' ? 55 : 10,
    paddingBottom: Platform.OS === 'ios' ? 70 : 70,
    paddingHorizontal: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  backText: {
    color: Colors.cardBackground,
    fontSize: 14,
    fontFamily: fontFamilyBody,
    marginLeft: 8,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.cardBackground,
    marginTop: Platform.OS === 'ios' ? 4 : 0,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    opacity: 0.9,
    marginTop: Platform.OS === 'ios' ? 6 : 4,
    marginBottom: 0,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? -60 : -60,
    paddingBottom: 16,
    zIndex: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 2 : 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.1,
    shadowRadius: Platform.OS === 'ios' ? 4 : 4,
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryNumber: {
    fontSize: 20,
    fontFamily: fontFamilyHeading,
    fontWeight: '700',
    color: Colors.textPrimary, 
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  searchContainer: { 
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 14 : 10,
    marginTop: Platform.OS === 'ios' ? 6 : 0,
  },
  searchBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    minHeight: Platform.OS === 'ios' ? 44 : 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 2 : 1 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.08,
    shadowRadius: Platform.OS === 'ios' ? 4 : 3,
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
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
    paddingBottom: 20,
  },
  timeFilterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  timeFilterLabel: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  timeFilterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeFilterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  timeFilterButtonActive: {
    backgroundColor: Colors.primaryPink,
    borderColor: Colors.primaryPink,
  },
  timeFilterButtonText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  timeFilterButtonTextActive: {
    color: Colors.cardBackground,
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
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 2 : 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.15 : 0.15,
    shadowRadius: Platform.OS === 'ios' ? 6 : 6,
    elevation: Platform.OS === 'android' ? 4 : 0,
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
    fontFamily: fontFamilyBody,
    fontWeight: '700',
    color: '#000000', 
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
    color: '#000000',
    opacity: 0.9,
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
    textTransform: 'capitalize',
  },
  deliveryDateRow: {
    flexDirection: 'row',
    alignItems: 'center', 
    paddingVertical: 1,
    paddingHorizontal: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
  },
  deliveryDateText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 5,
  },
  productInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    color: '#000000',
    opacity: 0.9,
  },
  productInfoValue: {
    fontSize: 16,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: '#000000',
  },
  timeFilterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateIconButton: {
    padding: 6,
    backgroundColor: Colors.primaryBlue,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDatesContainer: {
    marginBottom: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedDatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedDatesLabel: {
    fontSize: 13,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  selectedDatesScrollContent: {
    paddingRight: 8,
  },
  selectedDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4fa3e330',
  },
  dateChipIcon: {
    marginRight: 6,
  },
  selectedDateText: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginRight: 8,
  },
  removeDateButton: {
    padding: 2,
    marginLeft: -4,
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
    color: '#000000',
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
  skeletonBox: {
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    opacity: 0.5,
  },
  // Modal and Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetBackground: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetIndicator: {
    backgroundColor: Colors.borderLight,
    width: 40,
  },
  bottomSheetContent: {
    padding: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  datePickerTitle: {
    fontSize: 20,
    fontFamily: fontFamilyHeading,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  datePickerContainer: {
    marginBottom: 24,
  },
  datePickerLabel: {
    fontSize: 16,
    fontFamily: fontFamilyHeading,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  datePickerSubLabel: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  calendar: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
    paddingBottom: 10,
  },
  selectedDatesListContainer: {
    marginBottom: 24,
  },
  selectedDatesListTitle: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  selectedDatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  selectedDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectedDateItemText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    marginRight: 8,
  },
  removeDateItemButton: {
    padding: 2,
  },
  clearAllDatesButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.backgroundGray,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  clearAllDatesText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  applyDatesButton: {
    backgroundColor: Colors.primaryBlue,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyDatesButtonText: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.cardBackground,
  },
});

export default OrdersListScreen;

