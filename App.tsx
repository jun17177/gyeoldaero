import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/types';

import SplashScreen from './src/screens/SplashScreen';
import SavedListScreen from './src/screens/SavedListScreen';
import HomeScreen from './src/screens/HomeScreen';
import TravelStyleScreen from './src/screens/TravelStyleScreen';
import DetailConditionScreen from './src/screens/DetailConditionScreen';
import SpotSelectScreen from './src/screens/SpotSelectScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import BusinessHoursScreen from './src/screens/BusinessHoursScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Splash"           component={SplashScreen} />
          <Stack.Screen name="SavedList"        component={SavedListScreen} />
          <Stack.Screen name="Home"             component={HomeScreen} />
          <Stack.Screen name="TravelStyle"      component={TravelStyleScreen} />
          <Stack.Screen name="DetailCondition"  component={DetailConditionScreen} />
          <Stack.Screen name="SpotSelect"       component={SpotSelectScreen} />
          <Stack.Screen name="Timeline"         component={TimelineScreen} />
          <Stack.Screen name="BusinessHours"    component={BusinessHoursScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
