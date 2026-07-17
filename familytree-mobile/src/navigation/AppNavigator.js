import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../screens/DashboardScreen';
import TreeGraphScreen from '../screens/TreeGraphScreen';
import PersonProfileScreen from '../screens/PersonProfileScreen';
import MyProfileScreen from '../screens/MyProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
      />

      <Stack.Screen
        name="TreeGraph"
        component={TreeGraphScreen}
      />

      <Stack.Screen
        name="PersonProfile"
        component={PersonProfileScreen}
      />

      <Stack.Screen
        name="MyProfile"
        component={MyProfileScreen}
      />
    </Stack.Navigator>
  );
}