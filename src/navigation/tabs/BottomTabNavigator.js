import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import Colors from "../../theme/colors";
import HomeStack from "../stacks/HomeStack";
import NewStack from "../stacks/NewStack";
import NotificationsStack from "../stacks/NotificationsStack";
import ProfileStack from "../stacks/ProfileStack";

const Tab = createBottomTabNavigator();

// Default tab bar style
const defaultTabBarStyle = {
  backgroundColor: Colors.cardBackground,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingTop: 8,
  paddingBottom: 8,
  height: 80,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 8,
};

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryPink,
        tabBarInactiveTintColor: Colors.textPrimary,
        tabBarStyle: defaultTabBarStyle,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      <Tab.Screen
        name="HomeStack"
        component={HomeStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home';
          return {
            tabBarLabel: 'Orders',
            tabBarIcon: ({ color, size }) => (
              <Icon name="home" size={size || 24} color={color} />
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
              <Icon name="add-circle" size={size || 24} color={color} />
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
          tabBarIcon: ({ color, size }) => (
            <Icon name="notifications-outline" size={size || 24} color={color} />
          ),
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

