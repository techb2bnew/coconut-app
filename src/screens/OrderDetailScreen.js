/**
 * Order Detail Screen
 * Simple design: Map at top (fixed), Order details and timeline in scrollable card below
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';
import DriverLocationMap from '../components/DriverLocationMap';
import supabase from '../config/supabase';

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.41; // Fixed map height (half screen)

const OrderDetailScreen = ({ navigation, route }) => {
  const { order } = route.params || {};
  console.log('order', order);
  
  // State
  const [restaurantName, setRestaurantName] = useState('Restaurant Name');
  const [companyLogo, setCompanyLogo] = useState(null);
  const [orderLogo, setOrderLogo] = useState(null);

  // Fetch restaurant name and logo from customer data
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!order?.customer_id) return;
      
      try {
        const { data: customer, error } = await supabase
          .from('customers')
          .select('company_name, companyLogo')
          .eq('id', order.customer_id)
          .single();
        
        if (!error && customer) {
          if (customer.company_name) {
            setRestaurantName(customer.company_name);
          }
          if (customer.companyLogo) {
            setCompanyLogo(customer.companyLogo);
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

  // Check if driver is assigned
  const hasDriver = order && (
    order.deliveryStatus?.toLowerCase().includes('driver assigned') || 
    order.deliveryStatus?.toLowerCase().includes('in transit') ||
    order.deliveryStatus?.toLowerCase().includes('out for delivery')
  );

  // Get logo to display (order logo first, then company logo)
  const displayLogo = orderLogo || companyLogo;

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

      {/* Map Section - Fixed at top */}
      <View style={[styles.mapContainer, { height: MAP_HEIGHT }]}>
        {hasDriver ? (
          <DriverLocationMap
            orderId={order.id || order.order_id}
            deliveryAddress={order.delivery_address || order.deliveryAddress}
            driverId={order.driver_id || order.driverId}
            containerStyle={{ height: '100%', borderRadius: 0 }}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>Map will appear when driver is assigned</Text>
          </View>
        )}
      </View>

      {/* Order Details Card - Scrollable */}
      <View style={styles.bottomCard}>
        {/* Scrollable Content */}
        <ScrollView
          style={styles.cardScrollView}
          contentContainerStyle={styles.cardScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Order Info */}
          <View style={styles.restaurantSection}> 
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{getOrderId()}</Text>
              <Text style={styles.orderDate}>{formatDateOnly(order.deliveryDateRaw || order.delivery_date || order.orderDateRaw || order.order_date)}</Text>
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
                    {item.time && (
                      <Text style={styles.timelineTime}>{item.time}</Text>
                    )}
                    {item.description && (
                      <Text style={styles.timelineDescription}>{item.description}</Text>
                    )}
                  </View>
                </View>
              ))}
          </View>
 
        </ScrollView>
      </View>
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
  bottomCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10, 
  },
  cardScrollView: {
    flex: 1,
  },
  cardScrollContent: {
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
    minHeight: 40,
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
});

export default OrderDetailScreen;
