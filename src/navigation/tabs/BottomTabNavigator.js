import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { StyleSheet, View, Text } from "react-native";
import { useState, useEffect } from "react";
import Icon from "react-native-vector-icons/Ionicons";
import Colors from "../../theme/colors";
import { fontFamilyBody } from "../../theme/fonts";
import HomeStack from "../stacks/HomeStack";
import NewStack from "../stacks/NewStack";
import OrdersStack from "../stacks/OrdersStack";
import NotificationsStack from "../stacks/NotificationsStack";
import ProfileStack from "../stacks/ProfileStack";
import { getCustomerId, fetchNotifications } from "../../services/notificationService";

const Tab = createBottomTabNavigator();

// Default tab bar style
const defaultTabBarStyle = {
  backgroundColor: Colors.cardBackground,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingTop: 8,
  paddingBottom: 8,
  height: 70,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 8,
  overflow: 'visible',
};

export default function BottomTabNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const customerId = await getCustomerId();
        if (customerId) {
          const notifications = await fetchNotifications(customerId);
          const unread = notifications.filter((n) => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    loadUnreadCount();
    // Refresh count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh count when screen comes into focus
  useEffect(() => {
    const refreshCount = async () => {
      try {
        const customerId = await getCustomerId();
        if (customerId) {
          const notifications = await fetchNotifications(customerId);
          const unread = notifications.filter((n) => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error('Error refreshing unread count:', error);
      }
    };

    // Refresh on mount and when component updates
    refreshCount();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryBlue,
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: defaultTabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      <Tab.Screen
        name="HomeStack"
        component={HomeStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home';
          return {
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Icon name="home" size={size || 24} color={color} />
            ),
            tabBarStyle: (routeName === 'OrderDetail' || routeName === 'OrdersList') ? { display: 'none' } : defaultTabBarStyle,
          };
        }}
      />
      <Tab.Screen
        name="OrdersStack"
        component={OrdersStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'OrdersList';
          return {
            tabBarLabel: 'Orders',
            tabBarIcon: ({ color, size }) => (
              <Icon name="list-outline" size={size || 24} color={color} />
            ),
            tabBarStyle: routeName === 'OrderDetail' ? { display: 'none' } : defaultTabBarStyle,
          };
        }}
      />
      <Tab.Screen
        name="NewStack"
        component={NewStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'CreateOrder';
          return {
            tabBarLabel: 'New',
            tabBarIcon: ({ color, size }) => (
              <Icon name="add" size={size || 24} color={color} />
            ),
            tabBarStyle: routeName === 'CreateOrder' ? { display: 'none' } : defaultTabBarStyle,
          };
        }}
      />
      <Tab.Screen
        name="NotificationsStack"
        component={NotificationsStack}
        options={{
          tabBarLabel: 'Notifications',
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Icon name="notifications-outline" size={size || 24} color={color} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: async () => {
            // Refresh count when tab is pressed
            try {
              const customerId = await getCustomerId();
              if (customerId) {
                const notifications = await fetchNotifications(customerId);
                const unread = notifications.filter((n) => !n.isRead).length;
                setUnreadCount(unread);
              }
            } catch (error) {
              console.error('Error refreshing unread count:', error);
            }
          },
        }}
      />
      <Tab.Screen
        name="ProfileStack"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="person-outline" size={size || 24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: Colors.error || '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.cardBackground || '#FFFFFF',
  },
  badgeText: {
    color: Colors.cardBackground || '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fontFamilyBody,
    lineHeight: 12,
  },
});
