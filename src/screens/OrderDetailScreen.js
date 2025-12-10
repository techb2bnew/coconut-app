/**
 * Order Detail Screen
 * Shows detailed information about a specific order including timeline
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { fontFamily } from '../theme/fonts';

const OrderDetailScreen = ({ navigation, route }) => {
  const { order } = route.params || {};

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

  // Helper function to get status color
  const getStatusColor = (status) => {
    if (!status) return '#9E9E9E';
    const statusLower = status.trim().toLowerCase();
    
    if (statusLower === 'completed') return '#4CAF50';
    if (statusLower === 'processing') return '#FFE082';
    if (statusLower.includes('completed')) return '#4CAF50';
    if (statusLower.includes('processing')) return '#FFE082';
    if (statusLower.includes('delivered')) return '#4CAF50';
    if (statusLower.includes('delivery')) return '#81D4FA';
    if (statusLower.includes('pending')) return '#FFCC80';
    return '#9E9E9E';
  };

  // Generate timeline based on order status and dates
  const generateTimeline = () => {
    if (!order) return [];

    const timeline = [];
    const statusLower = (order.status || '').trim().toLowerCase();
    const orderDate = order.orderDateRaw || order.order_date;
    const deliveryDate = order.deliveryDateRaw || order.delivery_date;

    // Determine current status stage
    let currentStage = 'new';
    if (statusLower.includes('completed') || statusLower.includes('delivered')) {
      currentStage = 'delivered';
    } else if (statusLower.includes('delivery')) {
      currentStage = 'out_for_delivery';
    } else if (statusLower.includes('processing')) {
      currentStage = 'in_progress';
    } else if (orderDate) {
      currentStage = 'pending';
    }

    // Helper function to get stage color based on position
    const getStageColors = (stageId, isCurrent) => {
      const isBeforeCurrent = 
        (currentStage === 'in_progress' && stageId <= 2) ||
        (currentStage === 'out_for_delivery' && stageId <= 3) ||
        (currentStage === 'delivered' && stageId <= 4);

      if (isBeforeCurrent) {
        // Completed stages - green
        return {
          iconBgColor: '#E1F5E1', // Light green background
          iconColor: '#4CAF50', // Dark green icon
          titleColor: Colors.textPrimary,
        };
      } else if (isCurrent) {
        // Current stage - pink for In Progress and Delivered
        if (stageId === 3 || stageId === 5) {
          // In Progress or Delivered - pink
          return {
            iconBgColor: Colors.primaryPink, // Pink background
            iconColor: Colors.primaryPink, // Pink icon
            titleColor: Colors.primaryPink, // Pink title
          };
        }
        // Other current stages (Pending, Out for Delivery) - green
        return {
          iconBgColor: '#E1F5E1', // Light green background
          iconColor: '#4CAF50', // Dark green icon
          titleColor: Colors.textPrimary,
        };
      } else {
        // Future stages - gray
        return {
          iconBgColor: '#E0E0E0', // Light gray background
          iconColor: '#9E9E9E', // Gray icon
          titleColor: Colors.textSecondary, // Gray title
        };
      }
    };

    // New Order - always first
    const newOrderColors = getStageColors(1, currentStage === 'new') || {};
    timeline.push({
      id: '1',
      title: 'New Order',
      icon: 'cube-outline',
      iconBgColor: newOrderColors.iconBgColor || '#E1F5E1',
      iconColor: newOrderColors.iconColor || '#4CAF50',
      titleColor: newOrderColors.titleColor || Colors.textPrimary,
      time: formatDateTime(orderDate || new Date()),
      description: 'Order placed successfully',
      isCompleted: currentStage !== 'new',
      isCurrent: currentStage === 'new',
    });

    // Pending / Received
    if (orderDate) {
      const receivedDate = new Date(orderDate);
      receivedDate.setMinutes(receivedDate.getMinutes() + 15);
      const pendingColors = getStageColors(2, currentStage === 'pending') || {};
      timeline.push({
        id: '2',
        title: 'Pending / Received',
        icon: 'checkmark-circle-outline',
        iconBgColor: pendingColors.iconBgColor || '#E1F5E1',
        iconColor: pendingColors.iconColor || '#4CAF50',
        titleColor: pendingColors.titleColor || Colors.textPrimary,
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
      const progressColors = getStageColors(3, currentStage === 'in_progress') || {};
      timeline.push({
        id: '3',
        title: 'In Progress',
        icon: 'time-outline',
        iconBgColor: progressColors.iconBgColor || Colors.primaryPink,
        iconColor: progressColors.iconColor || Colors.primaryPink,
        titleColor: progressColors.titleColor || Colors.primaryPink,
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
      const deliveryColors = getStageColors(4, currentStage === 'out_for_delivery') || {};
      timeline.push({
        id: '4',
        title: 'Out for Delivery',
        icon: 'car-outline',
        iconBgColor: deliveryColors.iconBgColor || '#E0E0E0',
        iconColor: deliveryColors.iconColor || '#9E9E9E',
        titleColor: deliveryColors.titleColor || Colors.textSecondary,
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
      const deliveredColors = getStageColors(5, currentStage === 'delivered') || {};
      timeline.push({
        id: '5',
        title: 'Delivered',
        icon: 'checkmark-circle',
        iconBgColor: deliveredColors.iconBgColor || Colors.primaryPink,
        iconColor: deliveredColors.iconColor || Colors.primaryPink,
        titleColor: deliveredColors.titleColor || Colors.primaryPink,
        time: formatDateTime(deliveredTime),
        description: 'Order delivered successfully',
        isCompleted: true,
        isCurrent: currentStage === 'delivered',
      });
    }

    return timeline;
  };

  const timeline = generateTimeline();
  const statusColor = getStatusColor(order?.status);

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
            <Icon name="arrow-back" size={24} color={Colors.cardBackground} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.cardBackground} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Order Details Card */}
        <View style={styles.detailCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Order Details</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{order.status || 'Pending'}</Text>
            </View>
          </View>

          <Text style={styles.placedOnText}>
            Placed on {formatDate(order.orderDateRaw || order.order_date)}
          </Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Product Type</Text>
              <Text style={styles.detailValue}>Case</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Quantity</Text>
              <Text style={styles.detailValue}>
                {order.cases > 0 ? order.cases : 'N/A'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Est. Delivery</Text>
              <Text style={styles.detailValue}>
                {order.deliveryDate || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Timeline Card */}
        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Order Timeline</Text>
          
          {timeline.map((item, index) => (
            <View key={item.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineIcon,
                    {
                      backgroundColor: item.iconBgColor || '#E1F5E1',
                    },
                  ]}>
                  <Icon
                    name={item.icon}
                    size={20}
                    color={item.iconColor || '#4CAF50'}
                  />
                </View>
                {index < timeline.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      {
                        // Green line if next stage is completed or current, gray if next is future
                        backgroundColor: (timeline[index + 1]?.isCompleted || timeline[index + 1]?.isCurrent) ? '#4CAF50' : '#E0E0E0',
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
                      color: item.titleColor || Colors.textPrimary,
                    },
                  ]}>
                  {item.title}
                </Text>
                <Text style={styles.timelineTime}>{item.time}</Text>
                <Text style={styles.timelineDescription}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>
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
    backgroundColor: Colors.primaryPink,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontFamily: fontFamily,
    marginLeft: 8,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fontFamily,
    color: Colors.textSecondary,
  },
  detailCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '500',
    color: Colors.cardBackground,
  },
  placedOnText: {
    fontSize: 14,
    fontFamily: fontFamily,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: fontFamily,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  timelineCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontFamily: fontFamily,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 12,
    fontFamily: fontFamily,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    fontFamily: fontFamily,
    color: Colors.textSecondary,
  },
});

export default OrderDetailScreen;

