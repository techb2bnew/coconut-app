import { createDrawerNavigator } from "@react-navigation/drawer";
import TabNavigator from "../tabs/TabNavigator";
import ProfileScreen from "../../screens/ProfileScreen";

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator screenOptions={{ headerShown: false }}>
      <Drawer.Screen name="Tabs" component={TabNavigator} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
