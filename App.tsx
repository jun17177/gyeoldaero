import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
  NotoSansKR_700Bold,
} from '@expo-google-fonts/noto-sans-kr';
import { NotoSerifKR_700Bold } from '@expo-google-fonts/noto-serif-kr';
import { RootStackParamList } from './src/types';

import SplashScreen from './src/screens/SplashScreen';
import SavedListScreen from './src/screens/SavedListScreen';
import HomeScreen from './src/screens/HomeScreen';
import AutoSetupScreen from './src/screens/AutoSetupScreen';
import TravelStyleScreen from './src/screens/TravelStyleScreen';
import DetailConditionScreen from './src/screens/DetailConditionScreen';
import SpotSelectScreen from './src/screens/SpotSelectScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import SavedDetailScreen from './src/screens/SavedDetailScreen';
import RouteMapScreen from './src/screens/RouteMapScreen';
import WeatherScreen from './src/screens/WeatherScreen';
import BusinessHoursScreen from './src/screens/BusinessHoursScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  // 폰트 로딩 — 로딩 전엔 빈 화면(스플래시가 바로 이어지므로 깜빡임 없음)
  const [fontsLoaded] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_500Medium,
    NotoSansKR_700Bold,
    NotoSerifKR_700Bold,
  });
  if (!fontsLoaded) return null;

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
          {/* S6 저장 일정 상세 */}
          <Stack.Screen name="SavedDetail"      component={SavedDetailScreen} />
          {/* S2 */}
          <Stack.Screen name="Home"             component={HomeScreen} />
          <Stack.Screen name="AutoSetup"        component={AutoSetupScreen} />
          {/* S3a */}
          <Stack.Screen name="TravelStyle"      component={TravelStyleScreen} />
          {/* S3b */}
          <Stack.Screen name="DetailCondition"  component={DetailConditionScreen} />
          {/* S4 */}
          <Stack.Screen name="SpotSelect"       component={SpotSelectScreen} />
          {/* S5 */}
          <Stack.Screen name="Timeline"         component={TimelineScreen} />
          {/* S5_3 동선 지도 */}
          <Stack.Screen name="RouteMap"         component={RouteMapScreen} />
          {/* S5_2 날짜(날씨) 선택 */}
          <Stack.Screen name="Weather"          component={WeatherScreen} />
          {/* S5_1 */}
          <Stack.Screen name="BusinessHours"    component={BusinessHoursScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
