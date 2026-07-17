// react-native-gesture-handler MUST be the very first import
import 'react-native-gesture-handler';
import React from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';

// GestureHandlerRootView is only imported on native to avoid web crash
let GestureHandlerRootView;
if (Platform.OS !== 'web') {
  GestureHandlerRootView = require('react-native-gesture-handler').GestureHandlerRootView;
}

export default function App() {
  const inner = (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SafeAreaProvider>
  );

  if (Platform.OS === 'web') {
    return <View style={{ flex: 1 }}>{inner}</View>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {inner}
    </GestureHandlerRootView>
  );
}