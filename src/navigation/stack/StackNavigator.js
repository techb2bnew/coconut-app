import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashScreen from "../../screens/SplashScreen";
import LoginScreen from "../../screens/LoginScreen";
import ForgotPasswordScreen from "../../screens/ForgotPasswordScreen";
import OTPScreen from "../../screens/OTPScreen";
import ResetPasswordScreen from "../../screens/ResetPasswordScreen";
import CreateAccountScreen from "../../screens/CreateAccountScreen";
import BottomTabNavigator from "../tabs/BottomTabNavigator";

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="Splash">
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
    </Stack.Navigator>
  );
}
