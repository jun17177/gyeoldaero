import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, TripSettings } from '../types';
import { colors, spacing, radius } from '../constants/theme';

type Nav = StackNavigationProp<RootStackParamList, 'TravelStyle'>;
type Route = RouteProp<RootStackParamList, 'TravelStyle'>;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const THEMES: {
  id: TripSettings['themes'][number];
  label: string;
  desc: string;
  icon: IoniconsName;
}[] = [
  { id: 'healing',  label: '힐링',      desc: '느긋하게, 여유롭게',   icon: 'leaf-outline' },
  { id: 'activity', label: '액티비티',  desc: '활동적인 체험',        icon: 'bicycle-outline' },
  { id: 'food',     label: '미식',      desc: '맛집·시장·카페',       icon: 'restaurant-outline' },
  { id: 'culture',  label: '문화탐방',  desc: '역사·박물관',          icon: 'library-outline' },
  { id: 'photo',    label: '사진·감성', desc: '인생샷·뷰맛집',        icon: 'camera-outline' },
  { id: 'night',    label: '야경·야간', desc: '야시장·야경 중심',      icon: 'moon-outline' },
];

const SEASONS: { id: TripSettings['season']; label: string; icon: IoniconsName }[] = [
  { id: 'spring', label: '봄',   icon: 'flower-outline' },
  { id: 'summer', label: '여름', icon: 'sunny-outline' },
  { id: 'fall',   label: '가을', icon: 'partly-sunny-outline' },
  { id: 'winter', label: '겨울', icon: 'snow-outline' },
];

function StepDots({ active }: { active: 1 | 2 }) {
  return (
    <View style={styles.dotsRow}>
      <View style={[styles.dash, active === 1 && styles.dashActive]} />
      <View style={[styles.dash, active === 2 && styles.dashActive]} />
    </View>
  );
}

export default function TravelStyleScreen() {
  const navigation = useNavigation<Nav>();
  useRoute<Route>();

  const [themes, setThemes] = useState<TripSettings['themes']>([]);
  const [season, setSeason]   = useState<TripSettings['season']>('spring');

  const toggleTheme = (id: TripSettings['themes'][number]) =>
    setThemes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const handleNext = () => {
    navigation.navigate('DetailCondition', {
      settings: {
        themes: themes.length > 0 ? themes : ['healing'],
        weather: 'sunny',
        season,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>여행 스타일</Text>
        <StepDots active={1} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 테마 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>테마 선택</Text>
          <Text style={styles.sectionSub}>여러 개 가능</Text>
        </View>
        <View style={styles.themeGrid}>
          {THEMES.map(t => {
            const selected = themes.includes(t.id);
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.themeCard, selected && styles.themeCardSelected]}
                onPress={() => toggleTheme(t.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconCircle, selected && styles.iconCircleSelected]}>
                  <Ionicons name={t.icon} size={26} color={selected ? '#fff' : colors.primary} />
                </View>
                <Text style={[styles.themeLabel, selected && styles.themeLabelSelected]}>
                  {t.label}
                </Text>
                <Text style={[styles.themeDesc, selected && styles.themeDescSelected]}>
                  {t.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        {/* 계절 */}
        <Text style={styles.sectionLabel}>계절</Text>
        <View style={styles.segRow}>
          {SEASONS.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.segBtn, season === s.id && styles.segBtnActive]}
              onPress={() => setSeason(s.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={s.icon} size={17} color={season === s.id ? '#fff' : colors.primary} />
              <Text style={[styles.segLabel, season === s.id && styles.segLabelActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>다음 →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { marginRight: spacing.sm, padding: 4 },
  backText: { fontSize: 22, color: colors.text },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 },
  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dash: {
    width: 18, height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  dashActive: {
    backgroundColor: colors.primary,
    width: 28,
  },
  scroll: { paddingHorizontal: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  themeCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconCircleSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  themeLabelSelected: { color: '#fff' },
  themeDesc: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  themeDescSelected: { color: 'rgba(255,255,255,0.75)' },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  segRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  segBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: 3,
  },
  segBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  segLabelActive: { color: '#fff' },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: spacing.xl,
    paddingBottom: spacing.xl + 8,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
