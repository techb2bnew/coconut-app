/**
 * Home Screen
 * Dashboard with summary cards, recent orders, and activity
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';
import Logo from '../components/Logo';
import supabase from '../config/supabase';

const { width } = Dimensions.get('window');

// Coconut images
const coconut1 = require('../assest/coconut1.png');
const coconut2 = require('../assest/coconut2.png');
const coconut3 = require('../assest/coconut3.png');

const HomeScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [franchiseLogo, setFranchiseLogo] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'week', 'month'
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideInterval = useRef(null);
  const carouselRef = useRef(null);
  
  const [stats, setStats] = useState({
    activeOrders: 0,
    pending: 0,
    thisMonth: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);

  // Coconut images array
  const coconutImages = [coconut1, coconut2, coconut3];
  
  // Animation values for filter tabs
  const filterAnimations = useRef({
    all: new Animated.Value(1),
    today: new Animated.Value(1),
    week: new Animated.Value(1),
    month: new Animated.Value(1),
  }).current;

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
    if (statusLower.includes('in transit')) return '#81D4FA'; // Blue for in transit
    if (statusLower.includes('driver assigned')) return '#FFE082'; // Yellow for driver assigned
    if (statusLower.includes('progress')) return '#FFE082'; // Yellow for in progress
    if (statusLower.includes('pending')) return '#FFCC80'; // Orange for pending
    return '#f2f2f2'; // Default gray
  };

  // Fetch customer ID and franchise logo from logged in user email
  const fetchCustomerId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        console.log('No user logged in');
        return null;
      }

      // Get customer ID and franchise_id from customers table using email
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, franchise_id')
        .eq('email', user.email)
        .single();

      if (error) {
        console.error('Error fetching customer:', error);
        return null;
      }

      console.log('Customer data:', customer);
      console.log('Customer franchise_id:', customer?.franchise_id);

      // Fetch franchise logo if customer has franchise_id
      if (customer?.franchise_id) {
        console.log('Customer has franchise_id, fetching logo...');
        await fetchFranchiseLogo(customer.franchise_id);
      } else {
        console.log('Customer has no franchise_id, using default logo');
        setFranchiseLogo(null); // No franchise, use default logo
      }

      return customer?.id || null;
    } catch (error) {
      console.error('Error in fetchCustomerId:', error);
      return null;
    }
  };

  // Fetch franchise logo from franchises table
  const fetchFranchiseLogo = async (franchiseId) => {
    try {
      console.log('Fetching franchise logo for franchise_id:', franchiseId);
      const { data: franchise, error } = await supabase
        .from('franchises')
        .select('logo')
        .eq('id', franchiseId)
        .single();

      if (error) {
        console.error('Error fetching franchise logo:', error);
        setFranchiseLogo(null);
        return;
      }

      console.log('Franchise data:', franchise);
      console.log('Franchise logo URL:', franchise?.logo);

      if (franchise?.logo && franchise.logo.trim() !== '' && franchise.logo !== 'NULL') {
        const logoUrl = franchise.logo.trim();
        console.log('Setting franchise logo:', logoUrl);
        setFranchiseLogo(logoUrl);
      } else {
        console.log('No franchise logo found or logo is empty');
        setFranchiseLogo(null);
      }
    } catch (error) {
      console.error('Error in fetchFranchiseLogo:', error);
      setFranchiseLogo(null);
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
        .order('order_date', { ascending: false }); // Get all orders
        
      if (error) {
        console.error('Error fetching orders:', error);
        setLoading(false);
        return;
      }
     
      // Process orders data
      const processedOrders = (orders || []).map((order) => {
        console.log('order', order);
        // Use status from database directly (trim to remove any extra spaces)
        const status = (order.status || 'Pending').trim();
        const statusColor = getStatusColor(status);
        const selectedAddress = getSelectedDeliveryAddressFromOrder(order);

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
          order_name: order.order_name || `ORD-${order.id}`, // Include both field names
          cases: order.total_cases || order.cases || order.quantity || 0,
          quantity: order.quantity || order.total_cases || order.cases || 0, // Include quantity field
          deliveryDate: formatDate(order.delivery_date),
          status: status,
          statusColor: statusColor,
          orderDate: order.order_date,
          orderDateRaw: order.order_date,
          deliveryDateRaw: order.delivery_date,
          delivery_day_date: order.delivery_day_date || null, // Text value: "Same Day", "1 day", "2 days", or null
          poNumber: order.po_number || '',
          po_number: order.po_number || '', // Include both field names
          deliveryStatus: order.delivery_status || order.deliveryStatus || null,
          driverId: order.driver_id || order.driverId || null,
          delivery_address,
          driverName: order.driver_name || order.driverName || null,
          driverPhone: order.driver_phone || order.driver_number || null,
          driverEmail: order.driver_email || order.driverEmail || null,
          driverAddress: order.driver_address || order.driverAddress || null,
          driverCity: order.driver_city || order.driverCity || null,
          driverState: order.driver_state || order.driverState || null,
          driverZip: order.driver_zip || order.driverZip || null,
          // Additional fields for OrderDetailScreen
          product_type: order.product_type || null,
          opener_kit: order.opener_kit || order.openerKit || false,
          openerKit: order.opener_kit || order.openerKit || false, // Include both field names
          special_event_logo: order.special_event_logo || null,
          specialEventLogo: order.special_event_logo || null, // Include both field names
          special_instructions: order.special_instructions || null,
          orderNotes: order.special_instructions || order.order_notes || null,
          order_notes: order.order_notes || order.special_instructions || null,
        };
      });

      // Set recent orders
      setRecentOrders(processedOrders);
      
      // Apply initial filter
      applyTimeFilter(processedOrders, timeFilter);

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
          // Use deliveryStatus if available, otherwise fallback to status
          const deliveryStatusValue = order.deliveryStatus || order.status || '';
          const statusLower = deliveryStatusValue.trim().toLowerCase();
          
          // Count orders that are NOT completed or delivered
          const isCompleted = statusLower.includes('completed') || statusLower.includes('delivered');
          return !isCompleted;
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
    } catch (error) {
      console.error('Error in fetchOrders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-slide carousel
  useEffect(() => {
    slideInterval.current = setInterval(() => {
      const nextIndex = (currentSlideIndex + 1) % coconutImages.length;
      setCurrentSlideIndex(nextIndex);
      if (carouselRef.current) {
        carouselRef.current.scrollToIndex({ index: nextIndex, animated: true });
      }
    }, 3000);

    return () => {
      if (slideInterval.current) {
        clearInterval(slideInterval.current);
      }
    };
  }, [currentSlideIndex]);

  // Apply time filter
  const applyTimeFilter = (ordersList, filter) => {
    if (filter === 'all') {
      setFilteredOrders(ordersList); // Show all orders
      return;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const filtered = ordersList.filter((order) => {
      const orderDate = order.orderDateRaw || order.orderDate;
      if (!orderDate) return false;
      const orderCreatedDate = new Date(orderDate);
      if (isNaN(orderCreatedDate.getTime())) return false;

      if (filter === 'today') {
        return orderCreatedDate >= todayStart && orderCreatedDate <= todayEnd;
      } else if (filter === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 6);
        weekAgo.setHours(0, 0, 0, 0);
        return orderCreatedDate >= weekAgo && orderCreatedDate <= todayEnd;
      } else if (filter === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return orderCreatedDate >= monthStart && orderCreatedDate <= todayEnd;
      }
      return true;
    });

    setFilteredOrders(filtered); // Show all filtered orders
  };

  // Handle time filter change with animation
  const handleTimeFilterChange = (filter) => {
    // Animate scale for all buttons
    Object.keys(filterAnimations).forEach((key) => {
      Animated.sequence([
        Animated.timing(filterAnimations[key], {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(filterAnimations[key], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    });

    setTimeFilter(filter);
    applyTimeFilter(recentOrders, filter);
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

  // Update filtered orders when recentOrders changes
  useEffect(() => {
    if (recentOrders.length > 0) {
      applyTimeFilter(recentOrders, timeFilter);
    }
  }, [recentOrders]);

  // Skeleton loader component
  const OrderCardSkeleton = () => (
    <View style={styles.orderCard}>
      <View style={styles.orderCardContent}>
        <View style={styles.orderLeft}>
          <View style={[styles.skeletonBox, { width: 120, height: 16, marginBottom: 8 }]} />
          <View style={[styles.skeletonBox, { width: 80, height: 14 }]} />
        </View>
        <View style={[styles.skeletonBox, { width: 90, height: 24, borderRadius: 12 }]} />
      </View>
      <View style={[styles.skeletonBox, { width: 150, height: 14, marginTop: 8 }]} />
    </View>
  );

  // Render carousel item
  const renderCarouselItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
    });

    return (
      <Animated.View
        style={[
          styles.carouselItem,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}>
        <Image source={item} style={styles.carouselImage} resizeMode="cover" />
        <View style={styles.carouselOverlay} /> 
        <View style={styles.carouselContent}>
          <Text style={styles.carouselSubtitle}>Premium Quality</Text>
          <Text style={styles.carouselTitle}>Fresh Coconuts Delivered</Text>
          <Text style={styles.carouselDescription}>
            Wholesale pricing for your business
          </Text>
        </View>
      </Animated.View>
    );
  };

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    const id = await fetchCustomerId(); // This will also refresh franchise logo
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
          <ActivityIndicator size="large" color={Colors.primaryBlue} />
        </View>
      ) : (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryBlue} />
        }>
        {/* Header Section with Logo and Text */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            {franchiseLogo ? (
              <Image 
                source={{ uri: franchiseLogo }} 
                style={[styles.logo, { width: 70, height: 70, borderRadius: 10 }]}
                resizeMode="contain"
                onError={(error) => {
                  console.error('Error loading franchise logo:', error);
                  console.error('Logo URL:', franchiseLogo);
                  setFranchiseLogo(null); // Fallback to default logo on error
                }}
                onLoad={() => {
                  console.log('Franchise logo loaded successfully:', franchiseLogo);
                }}
              />
            ) : (
              <Logo style={styles.logo} size={70} variant="black" />
            )}
            <View style={styles.headerTextContainer}> 
              <Text style={styles.headerMainText}>Order Fresh and</Text>
              <Text style={styles.headerMainText}>Stay Stocked</Text>
            </View>
          </View>
          <Text style={styles.headerTreeIcon}>🌴</Text>
        </View>

        {/* Image Carousel Banner */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={carouselRef}
            data={coconutImages}
            renderItem={renderCarouselItem}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(event) => {
              const itemWidth = width - 32;
              const index = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
              setCurrentSlideIndex(index);
            }}
            getItemLayout={(data, index) => {
              const itemWidth = width - 32;
              return {
                length: itemWidth,
                offset: itemWidth * index,
                index,
              };
            }}
          />
          {/* Carousel Indicators */}
          <View style={styles.carouselIndicators}>
            {coconutImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentSlideIndex === index && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Product Offering Card */}
        <View style={styles.productCard}>
          <View style={styles.productCardContent}>
            <View style={styles.productCardLeft}>
              <Text style={styles.productCardLabel}>FRESH & WHOLESALE</Text> 
              <Text style={styles.productCardDescription}>
                High-quality coconuts sourced fresh for your business needs
              </Text>
            </View>
            <Text style={styles.productCardIcon}>🥥</Text>
          </View>
          <TouchableOpacity
            style={styles.orderNowButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('NewStack', { screen: 'CreateOrder' })}>
            <Icon name="cart-outline" size={20} color={Colors.cardBackground} />
            <Text style={styles.orderNowText}>Order Now</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Orders Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrdersList')}>
              <View style={styles.viewAllContainer}>
                <Text style={styles.viewAllText}>View All</Text>
                <Icon name="chevron-forward" size={16} color={Colors.primaryBlue} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Time Period Filters */}
          <View style={styles.timeFilterContainer}>
            {[
              { key: 'all', label: 'All Time' },
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
            ].map((filter) => (
              <Animated.View
                key={filter.key}
                style={{ transform: [{ scale: filterAnimations[filter.key] }] }}>
                <TouchableOpacity
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
              </Animated.View>
            ))}
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
            filteredOrders.map((order, index) => (
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
                    <View style={[styles.statusBadge, { backgroundColor: order.deliveryStatus ? getStatusColor(order.deliveryStatus) : order.statusColor }]}>
                      <Text style={styles.statusText}>{order.deliveryStatus || order.status}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.deliveryDateRow}>
                  <Text style={styles.deliveryDate}>Delivery: {order.deliveryDate}</Text>
                  <Icon name="chevron-forward" size={20} color={Colors.primaryBlue} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Need Coconuts Fast Card - Only show when customer has no orders */}
        {recentOrders.length === 0 && !loading && (
          <View style={styles.needCoconutsCard}>
            <View style={styles.needCoconutsIconContainer}>
              <Icon name="sparkles" size={32} color={Colors.cardBackground} />
            </View>
            <Text style={styles.needCoconutsTitle}>Need Coconuts Fast?</Text>
            <Text style={styles.needCoconutsSubtitle}>
              Quick ordering with next-day delivery available
            </Text>
            <TouchableOpacity
              style={styles.startNewOrderButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('NewStack', { screen: 'CreateOrder' })}>
              <Text style={styles.startNewOrderText}>Start New Order</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom spacing for navigation */}
        <View style={styles.bottomSpacing} />
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
  logo: {
    alignSelf: 'flex-start', 
    marginBottom: 8,
  },
  // Top Header Styles
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16, 
  },
  
  headerTextContainer: {
    flex: 1, 
    justifyContent: 'flex-start',
  },
  brandText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.primaryBlue,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerMainText: {
    fontSize: 28,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  headerTreeIcon: {
    fontSize: 32,
    marginTop: 8,
  },
  // Carousel Styles
  carouselContainer: {
    height: 200,
    marginHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
  },
  carouselItem: {
    width: width - 32,
    height: 200,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  carouselOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 16,
  },
  promotionLabel: {
    position: 'absolute',
    top: 16,
    left: 20,
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400',
  },
  carouselContent: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
  },
  carouselSubtitle: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    opacity: 0.95,
    marginBottom: 6,
    fontWeight: '400',
  },
  carouselTitle: {
    fontSize: 26,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.cardBackground,
    marginBottom: 8,
    lineHeight: 32,
  },
  carouselDescription: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    opacity: 0.95,
    fontWeight: '400',
  },
  carouselIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: Colors.cardBackground,
  },
  // Product Card Styles
  productCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  productCardLeft: {
    flex: 1,
  },
  productCardLabel: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.primaryBlue,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  productCardTitle: {
    fontSize: 20,
    fontFamily: fontFamilyHeading,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  productCardDescription: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  productCardIcon: {
    fontSize: 40,
    marginLeft: 12,
    opacity: 0.6,
  },
  orderNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryBlue,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  orderNowText: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.cardBackground,
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
    fontFamily: fontFamilyHeading,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  viewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.primaryBlue,
    fontWeight: '500',
  },
  // Time Filter Styles
  timeFilterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  timeFilterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  timeFilterButtonActive: {
    backgroundColor: Colors.primaryBlue,
    borderColor: Colors.primaryBlue,
  },
  timeFilterButtonText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  timeFilterButtonTextActive: {
    color: Colors.cardBackground,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  skeletonBox: {
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    opacity: 0.5,
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
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  orderCases: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
    fontWeight: '500',
    color: '#000000',
    textTransform: 'capitalize',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  deliveryDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  deliveryDate: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  deliveryStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryStatusText: {
    fontSize: 11,
    fontFamily: fontFamilyBody,
    fontWeight: '500',
    color: Colors.cardBackground,
  },
  // Need Coconuts Fast Card Styles
  needCoconutsCard: {
    backgroundColor: Colors.primaryBlue,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  needCoconutsIconContainer: {
    marginBottom: 12,
  },
  needCoconutsTitle: {
    fontSize: 22,
    fontFamily: fontFamilyHeading,
    fontWeight: '700',
    color: Colors.cardBackground,
    marginBottom: 8,
    textAlign: 'center',
  },
  needCoconutsSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    opacity: 0.95,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  startNewOrderButton: {
    backgroundColor: Colors.cardBackground,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startNewOrderText: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.primaryBlue,
  },
  bottomSpacing: {
    height: 50, // Space for bottom navigation
  },
});

export default HomeScreen;
