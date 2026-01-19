import { NavigationContainer } from "@react-navigation/native";
import { createNavigationContainerRef } from "@react-navigation/native";
import StackNavigator from "./stack/StackNavigator";

// Create navigation ref for global access
export const navigationRef = createNavigationContainerRef();

export default function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <StackNavigator />
    </NavigationContainer>
  );
}
