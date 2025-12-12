import { createNativeStackNavigator } from "@react-navigation/native-stack";
import NotificationScreen from "../../screens/NotificationScreen";

const Stack = createNativeStackNavigator();

export default function NotificationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Notifications" component={NotificationScreen} />
    </Stack.Navigator>
  );
}

