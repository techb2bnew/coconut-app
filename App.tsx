/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, useColorScheme, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { fontFamily } from './src/theme/fonts';

// Set default font family for all Text components globally
// Create a default style that includes the font family
const defaultTextStyle = StyleSheet.create({
  default: {
    fontFamily: fontFamily,
  },
});

// Set defaultProps to apply font to all Text components
// Using type assertion for TypeScript compatibility
const TextComponent = Text as any;
if (!TextComponent.defaultProps) {
  TextComponent.defaultProps = {};
}
// Merge font family into default style
TextComponent.defaultProps.style = defaultTextStyle.default;

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
