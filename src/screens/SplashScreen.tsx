import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import WaveLogo from '../components/WaveLogo';

type Nav = StackNavigationProp<RootStackParamList, 'Splash'>;

export default function SplashScreen() {
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('SavedList');
    }, 2200);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3D5A73" />
      <View style={styles.center}>
        <WaveLogo variant="white" scale={0.95} />
        <View style={styles.sloganBox}>
          <Text style={styles.slogan}>당신의 결(취향)을 따라</Text>
          <Text style={styles.slogan}>여행의 결(흐름)을 설계합니다</Text>
        </View>
      </View>
      <Text style={styles.bottom}>GYEOLDAERO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3D5A73',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  sloganBox: {
    alignItems: 'center',
    marginTop: 16,
  },
  slogan: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
  },
  bottom: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 4,
    marginBottom: 36,
  },
});
