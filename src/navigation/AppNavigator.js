import { NavigationContainer } from "@react-navigation/native";
import StackNavigator from "./stack/StackNavigator";

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <StackNavigator />
    </NavigationContainer>
  );
}
