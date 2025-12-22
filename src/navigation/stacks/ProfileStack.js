import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "../../screens/ProfileScreen";
import EditAccountScreen from "../../screens/EditAccountScreen";
import ChangePasswordScreen from "../../screens/ChangePasswordScreen";
import AllAboutCoconutsScreen from "../../screens/AllAboutCoconutsScreen";
import PrivacyPolicyScreen from "../../screens/PrivacyPolicyScreen";
import TermsAndConditionsScreen from "../../screens/TermsAndConditionsScreen";
import DocumentCenterScreen from "../../screens/DocumentCenterScreen";

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditAccount" component={EditAccountScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="AllAboutCoconuts" component={AllAboutCoconutsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
      <Stack.Screen name="DocumentCenter" component={DocumentCenterScreen} />
    </Stack.Navigator>
  );
}

