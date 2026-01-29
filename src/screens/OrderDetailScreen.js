/**
 * Order Detail Screen
 * Simple design: Map at top (fixed), Order details and timeline in scrollable card below
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';
import DriverLocationMap from '../components/DriverLocationMap';
import supabase from '../config/supabase';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 60;
const MIN_MAP_HEIGHT = height * 0.25; // Minimum map height
const MAX_MAP_HEIGHT = height * 0.85; // Maximum map height (85%)

const OrderDetailScreen = ({ navigation, route }) => {
  const { order } = route.params || {};
  console.log('order', order);
  console.log('openerKit check:', {
    opener_kit: order?.opener_kit,
    openerKit: order?.openerKit,
    opener_kit_type: typeof order?.opener_kit,
    openerKit_type: typeof order?.openerKit,
  });
  
  // Bottom sheet ref
  const bottomSheetRef = useRef(null);
  
  // Snap points for bottom sheet
  const snapPoints = useMemo(() => ['26%', '85%'], []);
  
  // State
  const [restaurantName, setRestaurantName] = useState('Restaurant Name');
  const [companyLogo, setCompanyLogo] = useState(null);
  const [orderLogo, setOrderLogo] = useState(null);
  
  // Handle sheet position changes - Map is now fixed, no height changes
  const handleSheetChange = useCallback((index) => {
    // Map height is fixed at 85%, no changes needed
    // This callback is kept for potential future use
  }, []);

  // Fetch restaurant name and logo from customer data
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!order?.customer_id) return;
      
      try {
        // First, fetch customer data including company_id
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('company_name, company_id')
          .eq('id', order.customer_id)
          .single();
        
        if (customerError) {
          console.error('Error fetching customer data:', customerError);
          return;
        }
        
        if (customer) {
          // Set company name from customer table
          if (customer.company_name) {
            setRestaurantName(customer.company_name);
          }
          
          // If company_id exists, fetch logo from company table
          if (customer.company_id) {
            try {
              const { data: company, error: companyError } = await supabase
                .from('company')
                .select('companyLogo')
                .eq('id', customer.company_id)
                .single();
              
              if (!companyError && company && company.companyLogo) {
                setCompanyLogo(company.companyLogo);
                console.log('Company logo fetched from company table:', company.companyLogo);
              } else if (companyError) {
                console.error('Error fetching company logo:', companyError);
              }
            } catch (err) {
              console.error('Error fetching company data:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching customer data:', err);
      }
    };
    
    fetchCustomerData();
    
    // Get order logo if available
    if (order?.special_event_logo) {
      setOrderLogo(order.special_event_logo);
    }
  }, [order]);


  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Helper function to format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    const hour12 = date.getHours() % 12 || 12;
    return `${year}-${month}-${day} ${hour12}:${minutes} ${ampm}`;
  };

  // Helper function to format estimated delivery date
  const formatEstDelivery = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `Est. Delivery ${day} ${month}, ${hour12}:${minutes}${ampm}`;
  };

  // Helper function to format date only (without time)
  const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `Est. Delivery ${day} ${month}, ${year}`;
  };

  // Helper function to get status color (original colors)
  const getStatusColor = (status) => {
    if (!status) return '#9E9E9E';
    const statusLower = status.trim().toLowerCase();
    
    if (statusLower === 'completed') return '#4CAF50';
    if (statusLower === 'processing') return '#FFE082';
    if (statusLower.includes('completed')) return '#4CAF50';
    if (statusLower.includes('processing')) return '#FFE082';
    if (statusLower.includes('delivered')) return '#4CAF50';
    if (statusLower.includes('delivery')) return '#81D4FA';
    if (statusLower.includes('in transit')) return '#81D4FA';
    if (statusLower.includes('driver assigned')) return '#FFE082';
    if (statusLower.includes('progress')) return '#FFE082';
    if (statusLower.includes('pending')) return '#FFCC80';
    return '#f2f2f2';
  };

  // Generate timeline based on deliveryStatus and dates (original colors)
  const generateTimeline = () => {
    if (!order) return [];

    const timeline = [];
    const deliveryStatusValue = order.deliveryStatus || order.status || '';
    const statusLower = deliveryStatusValue.trim().toLowerCase();
    const orderDate = order.orderDateRaw || order.order_date;
    const deliveryDate = order.deliveryDateRaw || order.delivery_date;

    // Determine current status stage
    let currentStage = 'new';
    if (statusLower.includes('completed') || statusLower.includes('delivered')) {
      currentStage = 'delivered';
    } else if (statusLower.includes('delivery') || statusLower.includes('out for delivery')) {
      currentStage = 'out_for_delivery';
    } else if (statusLower.includes('processing') || statusLower.includes('in progress')) {
      currentStage = 'in_progress';
    } else if (statusLower.includes('pending') || statusLower.includes('received')) {
      currentStage = 'pending';
    } else if (orderDate) {
      currentStage = 'pending';
    }

    // Helper function to get stage colors (original colors)
    const getStageColors = (stageId, isCurrent) => {
      const isBeforeCurrent = 
        (currentStage === 'in_progress' && stageId <= 2) ||
        (currentStage === 'out_for_delivery' && stageId <= 3) ||
        (currentStage === 'delivered' && stageId <= 4);

      if (isBeforeCurrent) {
        // Completed stages - green
        return {
          iconBgColor: '#E1F5E1',
          iconColor: '#4CAF50',
          titleColor: Colors.textPrimary,
        };
      } else if (isCurrent) {
        // Current stage - pink for In Progress and Delivered
        if (stageId === 3 || stageId === 5) {
          return {
            iconBgColor: Colors.primaryPink,
            iconColor: Colors.primaryPink,
            titleColor: Colors.primaryPink,
          };
        }
        // Other current stages - green
        return {
          iconBgColor: '#E1F5E1',
          iconColor: '#4CAF50',
          titleColor: Colors.textPrimary,
        };
      } else {
        // Future stages - gray
        return {
          iconBgColor: '#E0E0E0',
          iconColor: '#9E9E9E',
          titleColor: Colors.textSecondary,
        };
      }
    };

    // New Order
    const newOrderColors = getStageColors(1, currentStage === 'new');
    timeline.push({
      id: '1',
      title: 'New Order',
      icon: 'cube-outline',
      iconBgColor: newOrderColors.iconBgColor,
      iconColor: newOrderColors.iconColor,
      titleColor: newOrderColors.titleColor,
      time: formatDateTime(orderDate || new Date()),
      description: 'Order placed successfully',
      isCompleted: currentStage !== 'new',
      isCurrent: currentStage === 'new',
    });

    // Pending / Received
    if (orderDate) {
      const receivedDate = new Date(orderDate);
      receivedDate.setMinutes(receivedDate.getMinutes() + 15);
      const receivedColors = getStageColors(2, currentStage === 'pending');
      timeline.push({
        id: '2',
        title: 'Pending / Received',
        icon: 'checkmark-circle-outline',
        iconBgColor: receivedColors.iconBgColor,
        iconColor: receivedColors.iconColor,
        titleColor: receivedColors.titleColor,
        time: formatDateTime(receivedDate),
        description: 'Order confirmed and received',
        isCompleted: currentStage !== 'new' && currentStage !== 'pending',
        isCurrent: currentStage === 'pending',
      });
    }

    // In Progress
    if (orderDate) {
      const progressDate = new Date(orderDate);
      progressDate.setHours(14, 0, 0);
      const preparingColors = getStageColors(3, currentStage === 'in_progress');
      timeline.push({
        id: '3',
        title: 'In Progress',
        icon: 'time-outline',
        iconBgColor: preparingColors.iconBgColor,
        iconColor: preparingColors.iconColor,
        titleColor: preparingColors.titleColor,
        time: formatDateTime(progressDate),
        description: 'Branding and preparation',
        isCompleted: currentStage === 'delivered' || currentStage === 'out_for_delivery',
        isCurrent: currentStage === 'in_progress',
      });
    }

    // Out for Delivery
    if (deliveryDate) {
      const deliveryDateObj = new Date(deliveryDate);
      deliveryDateObj.setHours(8, 0, 0);
      const pickedUpColors = getStageColors(4, currentStage === 'out_for_delivery');
      timeline.push({
        id: '4',
        title: 'Out for Delivery',
        icon: 'car-outline',
        iconBgColor: pickedUpColors.iconBgColor,
        iconColor: pickedUpColors.iconColor,
        titleColor: pickedUpColors.titleColor,
        time: formatDateTime(deliveryDateObj),
        description: 'On the way to your location',
        isCompleted: currentStage === 'delivered',
        isCurrent: currentStage === 'out_for_delivery',
      });
    }

    // Delivered / Completed
    if (statusLower.includes('completed') || statusLower.includes('delivered')) {
      const deliveredTime = deliveryDate
        ? new Date(deliveryDate)
        : orderDate
        ? new Date(orderDate)
        : new Date();
      deliveredTime.setHours(10, 30, 0);
      const arrivingColors = getStageColors(5, currentStage === 'delivered');
      timeline.push({
        id: '5',
        title: 'Delivered',
        icon: 'checkmark-circle',
        iconBgColor: arrivingColors.iconBgColor,
        iconColor: arrivingColors.iconColor,
        titleColor: arrivingColors.titleColor,
        time: formatDateTime(deliveredTime),
        description: 'Order delivered successfully',
        isCompleted: true,
        isCurrent: currentStage === 'delivered',
      });
    }

    return timeline;
  };

  const timeline = generateTimeline();
  const statusColor = getStatusColor(order?.deliveryStatus || order?.status);

  // Get driver name (first letter for avatar)
  const getDriverName = () => {
    // Try multiple possible fields for driver name
    const driverName = order?.driver_name || 
                      order?.driverName || 
                      order?.driver?.name ||
                      order?.driver?.first_name ||
                      'Driver';
    return driverName;
  };

  // Get order ID for display
  const getOrderId = () => {
    return order?.orderName || order?.order_name || `ORD-${order?.id || order?.order_id || ''}`;
  };

  // Get first letter of order name for logo placeholder
  const getOrderInitial = () => {
    const orderId = getOrderId();
    return orderId.charAt(0).toUpperCase();
  };

  const getDriverInitial = () => {
    const name = getDriverName();
    return name.charAt(0).toUpperCase();
  };

  const handleCallDriver = () => {
    const phoneNumber = order?.driver_phone || order?.driverPhone;
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const handleEmailDriver = () => {
    const email = order?.driver_email || order?.driverEmail;
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  // Get driver first letter for avatar
  const getDriverFirstLetter = () => {
    const driverName = getDriverName();
    return driverName.charAt(0).toUpperCase();
  };

  const handleBack = () => {
    if (navigation) {
      navigation.goBack();
    }
  };


  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <View style={styles.backIconContainer}>
              <Icon name="arrow-back" size={20} color={Colors.cardBackground} />
            </View>
            <Text style={styles.backText}>Track Order</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Check if order is completed - strict check
  const isCompleted = order && (() => {
    const deliveryStatus = order.deliveryStatus?.toLowerCase().trim() || '';
    const status = order.status?.toLowerCase().trim() || '';
    
    // Check for exact matches or statuses that start with completed/delivered
    const completedStatuses = ['completed', 'delivered'];
    const isDeliveryStatusCompleted = completedStatuses.some(s => 
      deliveryStatus === s || deliveryStatus.startsWith(s + ' ')
    );
    const isStatusCompleted = completedStatuses.some(s => 
      status === s || status.startsWith(s + ' ')
    );
    
    return isDeliveryStatusCompleted || isStatusCompleted;
  })();
  
  // Debug log
  if (order) {
    console.log('Order Status Check:', {
      deliveryStatus: order.deliveryStatus,
      status: order.status,
      isCompleted: isCompleted,
    });
  }

  // Check if driver is assigned
  const hasDriver = order && !isCompleted && (
    order.deliveryStatus?.toLowerCase().includes('driver assigned') || 
    order.deliveryStatus?.toLowerCase().includes('in transit') ||
    order.deliveryStatus?.toLowerCase().includes('out for delivery')
  );

  // Get logo to display (order logo first, then company logo)
  const displayLogo = orderLogo || companyLogo;

  // Confetti animation values
  const confettiAnimations = useRef(
    Array.from({ length: 50 }, () => ({
      translateY: new Animated.Value(-100),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  // Start celebration animation when order is completed
  useEffect(() => {
    if (isCompleted) {
      // Animate confetti
      confettiAnimations.forEach((anim, index) => {
        const delay = index * 20;
        const randomX = (Math.random() - 0.5) * width * 2;
        const randomRotate = Math.random() * 720;
        
        Animated.parallel([
          Animated.timing(anim.translateY, {
            toValue: height + 100,
            duration: 3000 + Math.random() * 2000,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateX, {
            toValue: randomX,
            duration: 3000 + Math.random() * 2000,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: randomRotate,
            duration: 3000 + Math.random() * 2000,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 500,
              delay: 2000,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    }
  }, [isCompleted]);

  // If order is completed, show celebration screen
  if (isCompleted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <View style={styles.backIconContainer}>
              <Icon name="arrow-back" size={20} color={Colors.cardBackground} />
            </View>
            <Text style={styles.backText}>Track Order</Text>
          </TouchableOpacity>
        </View>

        {/* Confetti Animation */}
        <View style={styles.confettiContainer} pointerEvents="none">
          {confettiAnimations.map((anim, index) => {
            const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
            const color = colors[index % colors.length];
            const size = 8 + Math.random() * 12;
            const startX = (index % 10) * (width / 10) + Math.random() * 20;
            
            return (
              <Animated.View
                key={index}
                style={[
                  styles.confetti,
                  {
                    backgroundColor: color,
                    width: size,
                    height: size,
                    left: startX,
                    transform: [
                      { translateY: anim.translateY },
                      { translateX: anim.translateX },
                      { rotate: anim.rotate.interpolate({
                          inputRange: [0, 360],
                          outputRange: ['0deg', '360deg'],
                        })},
                    ],
                    opacity: anim.opacity,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Celebration Content */}
        <View style={styles.celebrationContainer}>
          <LinearGradient
            colors={['#E8F5E9', '#FFFFFF', '#E3F2FD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.celebrationGradient}>
            <Animated.View style={styles.celebrationContent}>
              {/* Success Icon with Animated Ring */}
              <View style={styles.celebrationIconWrapper}>
                <View style={styles.celebrationIconRing} />
                <View style={styles.celebrationIconContainer}>
                  <Icon name="checkmark-circle" size={50} color="#4CAF50" />
                </View>
                <View style={styles.celebrationIconRingOuter} />
              </View>
              
              {/* Title Section */}
              <View style={styles.celebrationTitleContainer}>
                <Text style={styles.celebrationEmoji}>🎉</Text>
                <View style={{ marginHorizontal: 12 }}>
                  <Text style={styles.celebrationTitle}>Congratulations!</Text>
                </View>
                <Text style={styles.celebrationEmoji}>🎉</Text>
              </View>
              
              {/* Message Section */}
              <View style={styles.celebrationMessageContainer}>
                <Text style={styles.celebrationMessage}>
                  Your order has been completed successfully!
                </Text>
                <View style={styles.celebrationDivider} />
                <Text style={styles.celebrationSubMessage}>
                  Thank you for choosing us. We appreciate your business!
                </Text>
              </View>
              
              {/* Decorative Elements */}
              <View style={styles.celebrationDecorations}>
                <View style={[styles.decorationDot, { left: '10%', top: '20%' }]} />
                <View style={[styles.decorationDot, { right: '10%', top: '30%' }]} />
                <View style={[styles.decorationDot, { left: '15%', bottom: '25%' }]} />
                <View style={[styles.decorationDot, { right: '15%', bottom: '20%' }]} />
              </View>
            </Animated.View>
          </LinearGradient>

          {/* Order Details Card */}
          <View style={styles.completedOrderCard}>
            <ScrollView
              contentContainerStyle={styles.bottomSheetContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Order Info */}
              <View style={styles.restaurantSection}> 
                <View style={styles.restaurantInfo}>
                  <Text style={styles.restaurantName}>{getOrderId()}</Text>
                  <Text style={styles.orderDate}>{formatDateOnly(order.deliveryDateRaw || order.delivery_date || order.orderDateRaw || order.order_date)}</Text>
                  {order.delivery_day_date ? (
                    <Text style={[styles.orderDate, { color: Colors.success, marginTop: 4, fontWeight: '600' }]}>
                      Delivery: {order.delivery_day_date}
                    </Text>
                  ) : (
                    <Text style={[styles.orderDate, { color: Colors.textSecondary, marginTop: 4 }]}>
                      Delivery updates will be sent to your email soon.
                    </Text>
                  )}
                  <Text style={styles.orderItems}>{order.cases || 0} Cases</Text>
                </View>
                {/* Order Status Badge */}
                <View style={styles.statusSection}>
                  <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                    <Text style={styles.statusText}>Completed</Text>
                  </View>
                </View> 
              </View>

              {/* Timeline */}
              <View style={styles.timelineSection}>
                {timeline.map((item, index) => (
                  <View key={item.id} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineIcon,
                          {
                            backgroundColor: item.iconBgColor || '#E0E0E0',
                          },
                        ]}>
                        <Icon
                          name={item.icon}
                          size={18}
                          color={item.iconColor || '#9E9E9E'}
                        />
                      </View>
                      {index < timeline.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            {
                              backgroundColor: timeline[index + 1]?.isCompleted || timeline[index + 1]?.isCurrent ? '#4CAF50' : '#E0E0E0',
                            },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text
                        style={[
                          styles.timelineTitle,
                          {
                            color: item.titleColor || Colors.textSecondary,
                          },
                        ]}>
                        {item.title}
                      </Text>
                      
                      {item.description && (
                        <Text style={styles.timelineDescription}>{item.description}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Order Details Section */}
              <View style={styles.orderDetailsSection}>
                {/* Order Details Card */}
                <View style={styles.detailsCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderIcon}>
                      <Icon name="receipt-outline" size={24} color={Colors.primaryPink} />
                    </View>
                    <Text style={styles.sectionTitle}>Order Details</Text>
                  </View>
                  
                  {/* Product Type */}
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrapper}>
                      <Icon name="cube-outline" size={20} color={Colors.primaryPink} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Product Type</Text>
                      <Text style={styles.detailValue}>
                        {order.product_type || 'Case (9 pieces or 9 units)'}
                      </Text>
                    </View>
                  </View>

                  {/* Quantity */}
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrapper}>
                      <Icon name="layers-outline" size={20} color={Colors.primaryPink} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Quantity</Text>
                      <Text style={styles.detailValue}>
                        {order.quantity || order.cases || 0} Cases
                      </Text>
                    </View>
                  </View>

                  {/* Opener Kit */}
                  {((order.opener_kit === true || order.openerKit === true || order.opener_kit === 1 || order.openerKit === 1 || 
                     order.opener_kit === 'true' || order.openerKit === 'true' || 
                     String(order.opener_kit).toLowerCase() === 'true' || String(order.openerKit).toLowerCase() === 'true')) && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconWrapper}>
                        <Icon name="gift-outline" size={20} color={Colors.primaryPink} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Coconut Opener Kit</Text>
                        <View style={styles.badgeContainer}>
                          <Text style={styles.badgeText}>Yes (+$15.00)</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Special Event Logo */}
                  {(order.special_event_logo || order.specialEventLogo) && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconWrapper}>
                        <Icon name="image-outline" size={20} color={Colors.primaryPink} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Special Event Logo</Text>
                        <View style={styles.badgeContainer}>
                          <Text style={styles.badgeText}>Yes (+$150.00)</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Special Event Logo Preview */}
                  {(order.special_event_logo || order.specialEventLogo) && (
                    <View style={styles.logoPreviewCard}>
                      <Image
                        source={{ uri: order.special_event_logo || order.specialEventLogo }}
                        style={styles.logoPreview}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  {/* PO Number */}
                  {(order.po_number || order.poNumber) && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconWrapper}>
                        <Icon name="document-text-outline" size={20} color={Colors.primaryPink} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>PO Number</Text>
                        <Text style={styles.detailValue}>
                          {order.po_number || order.poNumber}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Order Notes */}
                  {(order.special_instructions || order.orderNotes || order.order_notes) && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconWrapper}>
                        <Icon name="chatbubble-outline" size={20} color={Colors.primaryPink} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Order Notes</Text>
                        <View style={styles.notesContainer}>
                          <Text style={styles.notesText}>
                            {order.special_instructions || order.orderNotes || order.order_notes}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Delivery Address */}
                  {order.delivery_address && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconWrapper}>
                        <Icon name="location-outline" size={20} color={Colors.primaryPink} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Delivery Address</Text>
                        <View style={styles.addressContainer}>
                          <Text style={styles.addressText}>
                            {order.delivery_address}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* Company Details Card */}
                <View style={styles.detailsCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderIcon}>
                      <Icon name="business-outline" size={24} color={Colors.primaryPink} />
                    </View>
                    <Text style={styles.sectionTitle}>Company Details</Text>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrapper}>
                      <Icon name="business-outline" size={20} color={Colors.primaryPink} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Company Name</Text>
                      <Text style={styles.detailValue}>
                        {restaurantName || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* Company Logo */}
                  {companyLogo && (
                    <View style={styles.logoPreviewCard}>
                      <Text style={styles.logoLabel}>Company Logo</Text>
                      <Image
                        source={{ uri: companyLogo }}
                        style={styles.logoPreview}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  {/* Order Date */}
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrapper}>
                      <Icon name="calendar-outline" size={20} color={Colors.primaryPink} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Order Date</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(order.orderDateRaw || order.order_date)}
                      </Text>
                    </View>
                  </View>

                  

                  {/* Delivery Day Date */}
                  {order.delivery_day_date && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconWrapper}>
                        <Icon name="flash-outline" size={20} color={Colors.success} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Delivery Timeline</Text>
                        <View style={[styles.badgeContainer, styles.successBadge]}>
                          <Text style={[styles.badgeText, styles.successBadgeText]}>
                            {order.delivery_day_date}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Sticky Driver Footer for Completed Orders */}
        {hasDriver && (order?.driver_name || order?.driverName) && (
          <View style={styles.driverFooter}>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>{getDriverFirstLetter()}</Text>
              </View>
              <Text style={styles.driverName}>{getDriverName()}</Text>
            </View>
            <View style={styles.driverActions}>
              {(order?.driver_phone || order?.driverPhone) && (
                <TouchableOpacity
                  style={styles.driverActionButton}
                  onPress={handleCallDriver}
                  activeOpacity={0.7}>
                  <Icon name="call" size={22} color={Colors.primaryPink} />
                </TouchableOpacity>
              )}
              {(order?.driver_email || order?.driverEmail) && (
                <TouchableOpacity
                  style={styles.driverActionButton}
                  onPress={handleEmailDriver}
                  activeOpacity={0.7}>
                  <Icon name="mail" size={22} color={Colors.primaryPink} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <View style={styles.backIconContainer}>
            <Icon name="arrow-back" size={20} color={Colors.cardBackground} />
          </View>
          <Text style={styles.backText}>Track Order</Text>
        </TouchableOpacity>
      </View>

      {/* Map Section - Fixed height (85%) */}
      <View style={[styles.mapContainer, { height: MAX_MAP_HEIGHT }]}>
        {!isCompleted ? (
          <DriverLocationMap
            orderId={order.id || order.order_id}
            deliveryAddress={order.delivery_address || order.deliveryAddress}
            driverId={order.driver_id || order.driverId}
            containerStyle={{ width: '100%', height: '100%', borderRadius: 0 }}
          />
        ) : null}
      </View>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChange}
        enablePanDownToClose={false}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        animateOnMount={true}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.bottomSheetContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Info */}
          <View style={styles.restaurantSection}> 
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{getOrderId()}</Text> 
              {order.delivery_day_date ? (
                <Text style={[styles.orderDate, { color: Colors.success, marginTop: 4, fontWeight: '600' }]}>
                  Delivery: {order.delivery_day_date}
                </Text>
              ) : (
                <Text style={[styles.orderDate, { color: Colors.textSecondary, marginTop: 4 }]}>
                  Delivery updates will be sent to your email soon.
                </Text>
              )}
              <Text style={styles.orderItems}>{order.cases || 0} Cases</Text>
            </View>
            {/* Order Status Badge */}
            <View style={styles.statusSection}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{order.deliveryStatus || order.status || 'Pending'}</Text>
              </View>
            </View> 
          </View>

          {/* Timeline */}
          <View style={styles.timelineSection}>
            {timeline.map((item, index) => (
              <View key={item.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineIcon,
                      {
                        backgroundColor: item.iconBgColor || '#E0E0E0',
                      },
                    ]}>
                    <Icon
                      name={item.icon}
                      size={18}
                      color={item.iconColor || '#9E9E9E'}
                    />
                  </View>
                  {index < timeline.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        {
                          backgroundColor: timeline[index + 1]?.isCompleted || timeline[index + 1]?.isCurrent ? '#4CAF50' : '#E0E0E0',
                        },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text
                    style={[
                      styles.timelineTitle,
                      {
                        color: item.titleColor || Colors.textSecondary,
                      },
                    ]}>
                    {item.title}
                  </Text>
                 
                  {item.description && (
                    <Text style={styles.timelineDescription}>{item.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Order Details Section */}
          <View style={styles.orderDetailsSection}>
            {/* Order Details Card */}
            <View style={styles.detailsCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Icon name="receipt-outline" size={24} color={Colors.primaryPink} />
                </View>
                <Text style={styles.sectionTitle}>Order Details</Text>
              </View>
              
              {/* Product Type */}
              <View style={styles.detailItem}>
                <View style={styles.detailIconWrapper}>
                  <Icon name="cube-outline" size={20} color={Colors.primaryPink} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Product Type</Text>
                  <Text style={styles.detailValue}>
                    {order.product_type || 'Case (9 pieces or 9 units)'}
                  </Text>
                </View>
              </View>

              {/* Quantity */}
              <View style={styles.detailItem}>
                <View style={styles.detailIconWrapper}>
                  <Icon name="layers-outline" size={20} color={Colors.primaryPink} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <Text style={styles.detailValue}>
                    {order.quantity || order.cases || 0} Cases
                  </Text>
                </View>
              </View>

              {/* Opener Kit */}
              {((order.opener_kit === true || order.openerKit === true || order.opener_kit === 1 || order.openerKit === 1 || 
                 order.opener_kit === 'true' || order.openerKit === 'true' || 
                 String(order.opener_kit).toLowerCase() === 'true' || String(order.openerKit).toLowerCase() === 'true')) && (
                <View style={styles.detailItem}>
                  <View style={styles.detailIconWrapper}>
                    <Icon name="gift-outline" size={20} color={Colors.primaryPink} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Coconut Opener Kit</Text>
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>Yes (+$15.00)</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Special Event Logo */}
              {(order.special_event_logo || order.specialEventLogo) && (
                <View style={styles.detailItem}>
                  <View style={styles.detailIconWrapper}>
                    <Icon name="image-outline" size={20} color={Colors.primaryPink} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Special Event Logo</Text>
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>Yes (+$150.00)</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Special Event Logo Preview */}
              {(order.special_event_logo || order.specialEventLogo) && (
                <View style={styles.logoPreviewCard}>
                  <Image
                    source={{ uri: order.special_event_logo || order.specialEventLogo }}
                    style={styles.logoPreview}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* PO Number */}
              {(order.po_number || order.poNumber) && (
                <View style={styles.detailItem}>
                  <View style={styles.detailIconWrapper}>
                    <Icon name="document-text-outline" size={20} color={Colors.primaryPink} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>PO Number</Text>
                    <Text style={styles.detailValue}>
                      {order.po_number || order.poNumber}
                    </Text>
                  </View>
                </View>
              )}

              {/* Order Notes */}
              {(order.special_instructions || order.orderNotes || order.order_notes) && (
                <View style={styles.detailItem}>
                  <View style={styles.detailIconWrapper}>
                    <Icon name="chatbubble-outline" size={20} color={Colors.primaryPink} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Order Notes</Text>
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesText}>
                        {order.special_instructions || order.orderNotes || order.order_notes}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Delivery Address */}
              {order.delivery_address && (
                <View style={styles.detailItem}>
                  <View style={styles.detailIconWrapper}>
                    <Icon name="location-outline" size={20} color={Colors.primaryPink} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Delivery Address</Text>
                    <View style={styles.addressContainer}>
                      <Text style={styles.addressText}>
                        {order.delivery_address}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Company Details Card */}
            <View style={styles.detailsCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Icon name="business-outline" size={24} color={Colors.primaryPink} />
                </View>
                <Text style={styles.sectionTitle}>Company Details</Text>
              </View>
              
              <View style={styles.detailItem}>
                <View style={styles.detailIconWrapper}>
                  <Icon name="business-outline" size={20} color={Colors.primaryPink} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Company Name</Text>
                  <Text style={styles.detailValue}>
                    {restaurantName || 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Company Logo */}
              {companyLogo && (
                <View style={styles.logoPreviewCard}>
                  <Text style={styles.logoLabel}>Company Logo</Text>
                  <Image
                    source={{ uri: companyLogo }}
                    style={styles.logoPreview}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* Order Date */}
              <View style={styles.detailItem}>
                <View style={styles.detailIconWrapper}>
                  <Icon name="calendar-outline" size={20} color={Colors.primaryPink} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Order Date</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(order.orderDateRaw || order.order_date)}
                  </Text>
                </View>
              </View> 

              {/* Delivery Day Date */}
              {order.delivery_day_date && (
                <View style={styles.detailItem}>
                  <View style={styles.detailIconWrapper}>
                    <Icon name="flash-outline" size={20} color={Colors.success} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Delivery Timeline</Text>
                    <View style={[styles.badgeContainer, styles.successBadge]}>
                      <Text style={[styles.badgeText, styles.successBadgeText]}>
                        {order.delivery_day_date}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Sticky Driver Footer */}
      {hasDriver && (order?.driver_name || order?.driverName) && (
        <View style={styles.driverFooter}>
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>{getDriverFirstLetter()}</Text>
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverLabel}>Driver</Text> 
              <Text style={styles.driverName}>{getDriverName()}</Text>
            </View>
          </View>
          <View style={styles.driverActions}>
            {(order?.driver_phone || order?.driverPhone) && (
              <TouchableOpacity
                style={styles.driverActionButton}
                onPress={handleCallDriver}
                activeOpacity={0.7}>
                <Icon name="call" size={22} color={Colors.primaryPink} />
              </TouchableOpacity>
            )}
            {(order?.driver_email || order?.driverEmail) && (
              <TouchableOpacity
                style={styles.driverActionButton}
                onPress={handleEmailDriver}
                activeOpacity={0.7}>
                <Icon name="mail" size={22} color={Colors.primaryPink} />
              </TouchableOpacity>
            )}
          </View>
        </View>
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
    backgroundColor: Colors.backgroundGray,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  backText: {
    color: Colors.primaryPink,
    fontSize: 18,
    fontFamily: fontFamilyBody,
    fontWeight: 'bold',
  },
  mapContainer: {
    width: '100%',
    backgroundColor: Colors.backgroundGray,
    overflow: 'hidden',
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundGray,
  },
  mapPlaceholderText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  bottomSheetBackground: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  handleIndicator: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.3,
    width: 40,
    height: 4,
  },
  bottomSheetContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  restaurantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  restaurantImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
  },
  restaurantImageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  restaurantInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  orderItems: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
  },
  statusSection: {
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    fontWeight: '500',
    color: '#000000',
    textTransform: 'capitalize',
  },
  orderNameSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderNameLabel: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  orderNameValue: {
    fontSize: 16,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  timelineSection: {
    marginBottom: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 30,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  driverSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primaryPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverInitial: {
    fontSize: 20,
    fontFamily: fontFamilyHeading,
    fontWeight: 'bold',
    color: Colors.cardBackground,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  driverLabel: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  driverActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  confetti: {
    position: 'absolute',
    borderRadius: 4,
  },
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  celebrationContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
    position: 'relative',
  },
  celebrationIconWrapper: {
    position: 'relative',
    marginBottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationIconRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 90,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  celebrationIconRingOuter: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 100,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.1)',
  },
  celebrationIconContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 80,
    padding: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 10,
  },
  celebrationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  celebrationEmoji: {
    fontSize: 22,
  },
  celebrationTitle: {
    fontSize: 32,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  celebrationMessageContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  celebrationMessage: {
    fontSize: 22,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 32,
  },
  celebrationDivider: {
    width: 60,
    height: 3,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    marginVertical: 10,
    opacity: 0.6,
  },
  celebrationSubMessage: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  celebrationDecorations: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    pointerEvents: 'none',
  },
  decorationDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    opacity: 0.3,
  },
  completedOrderCard: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  driverFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    flex: 1,
  },
  driverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderDetailsSection: {
    marginTop: 1,
    paddingBottom: 20,
  },
  detailsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryPink + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilyHeading,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  detailIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryPink + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    fontWeight: '600',
    lineHeight: 22,
  },
  badgeContainer: {
    backgroundColor: Colors.primaryPink + '15',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    fontWeight: '700',
    color: Colors.primaryPink,
  },
  successBadge: {
    backgroundColor: Colors.success + '15',
  },
  successBadgeText: {
    color: Colors.success,
  },
  logoPreviewCard: {
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: Colors.backgroundGray,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  logoLabel: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoPreview: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
  },
  notesContainer: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  notesText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  addressContainer: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  addressText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderSummaryLabel: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  orderSummaryValue: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});

export default OrderDetailScreen;
