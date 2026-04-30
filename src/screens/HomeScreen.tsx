import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import WaveLogo from '../components/WaveLogo';
import { colors, spacing, radius } from '../constants/theme';

type Nav = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.inner}>
        <View style={styles.header}>
          <WaveLogo variant="primary" scale={0.38} />
        </View>
        <View style={styles.center}>
          <Text style={styles.headline}>어떤 여행을{'\n'}떠나시나요?</Text>
          <Text style={styles.subline}>취향대로, 결대로</Text>
        </View>
        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('TravelStyle', { mode: 'manual' })}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>직접 설정 — 명소 먼저 담기</Text>
          </TouchableOpacity>
          <Text style={styles.orText}>또는</Text>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => navigation.navigate('TravelStyle', { mode: 'auto' })}
            activeOpacity={0.85}
          >
            <Text style={styles.outlineButtonText}>자동 설정 — 취향대로 추천받기</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('SavedList')} style={styles.linkWrapper}>
            <Text style={styles.linkText}>저장된 일정 보기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, paddingHorizontal: spacing.xl },
  header: {
    paddingTop: spacing.md,
  },
  center: { flex: 1, justifyContent: 'center' },
  headline: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 48,
    marginBottom: spacing.sm,
  },
  subline: { fontSize: 14, color: colors.textMuted },
  bottom: { paddingBottom: spacing.xxl + 8 },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  orText: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
    marginVertical: spacing.sm,
  },
  outlineButton: {
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
  },
  outlineButtonText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  linkWrapper: { alignItems: 'center' },
  linkText: { fontSize: 13, color: colors.textMuted, textDecorationLine: 'underline' },
});
