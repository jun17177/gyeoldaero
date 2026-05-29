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
import WeatherScreen from './src/screens/WeatherScreen';

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
          {/* S1 */}
          <Stack.Screen name="Splash"           component={SplashScreen} />
          {/* S1_1a / S1_1b */}
          <Stack.Screen name="SavedList"        component={SavedListScreen} />
          {/* S2 */}
          <Stack.Screen name="Home"             component={HomeScreen} />
          {/* S3a */}
          <Stack.Screen name="TravelStyle"      component={TravelStyleScreen} />
          {/* S3b */}
          <Stack.Screen name="DetailCondition"  component={DetailConditionScreen} />
          {/* S4 */}
          <Stack.Screen name="SpotSelect"       component={SpotSelectScreen} />
          {/* S5 */}
          <Stack.Screen name="Timeline"         component={TimelineScreen} />
          {/* S5_1 */}
          <Stack.Screen name="BusinessHours"    component={BusinessHoursScreen} />
          {/* S5_2 */}
          <Stack.Screen name="Weather"          component={WeatherScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
