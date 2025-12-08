import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../../screens/LoginScreen";
import ForgotPasswordScreen from "../../screens/ForgotPasswordScreen";
import OTPScreen from "../../screens/OTPScreen";
import ResetPasswordScreen from "../../screens/ResetPasswordScreen";
import CreateAccountScreen from "../../screens/CreateAccountScreen";
import HomeScreen from "../../screens/HomeScreen";
import ProfileScreen from "../../screens/ProfileScreen";
import NotificationScreen from "../../screens/NotificationScreen";
import OrdersListScreen from "../../screens/OrdersListScreen";
import OrderDetailScreen from "../../screens/OrderDetailScreen";
import CreateOrderScreen from "../../screens/CreateOrderScreen";
import EditAccountScreen from "../../screens/EditAccountScreen";
import ChangePasswordScreen from "../../screens/ChangePasswordScreen";
import AllAboutCoconutsScreen from "../../screens/AllAboutCoconutsScreen";
import PrivacyPolicyScreen from "../../screens/PrivacyPolicyScreen";
import TermsAndConditionsScreen from "../../screens/TermsAndConditionsScreen";

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="OrdersList" component={OrdersListScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
      <Stack.Screen name="EditAccount" component={EditAccountScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="AllAboutCoconuts" component={AllAboutCoconutsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
    </Stack.Navigator>
  );
}
