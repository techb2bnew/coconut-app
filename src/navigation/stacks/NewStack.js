import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CreateOrderScreen from "../../screens/CreateOrderScreen";

const Stack = createNativeStackNavigator();

export default function NewStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
    </Stack.Navigator>
  );
}

