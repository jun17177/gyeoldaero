import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import WaveLogo from '../components/WaveLogo';
import { RootStackParamList, TripSchedule } from '../types';
import { loadAllSchedules } from '../storage/scheduleStorage';
import { colors, spacing, radius, shadows } from '../constants/theme';

type Nav = StackNavigationProp<RootStackParamList, 'SavedList'>;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const THUMB_ICONS: IoniconsName[] = [
  'compass-outline', 'map-outline', 'airplane-outline', 'partly-sunny-outline',
  'leaf-outline', 'moon-outline', 'camera-outline', 'restaurant-outline',
];

const THEME_LABEL: Record<string, string> = {
  healing: '힐링', activity: '액티비티', food: '미식',
  culture: '문화탐방', photo: '사진', night: '야경',
};

function EmptyLogo() {
  return (
    <View style={styles.emptyLogoBox}>
      <WaveLogo variant="primary" scale={0.55} />
    </View>
  );
}

function formatDays(days: number) {
  if (days <= 1) return '당일치기';
  return `${days - 1}박${days}일`;
}

export default function SavedListScreen() {
  const navigation = useNavigation<Nav>();
  const [schedules, setSchedules] = useState<TripSchedule[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadAllSchedules().then(setSchedules);
    }, [])
  );

  const renderCard = ({ item, index }: { item: TripSchedule; index: number }) => {
    const thumbIcon = THUMB_ICONS[index % THUMB_ICONS.length];
    const date = new Date(item.createdAt).toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).replace(/\. /g, '.').replace(/\.$/, '');

    const tags = [
      ...item.settings.themes.map(t => THEME_LABEL[t] ?? t),
      item.settings.season === 'spring' ? '봄' :
      item.settings.season === 'summer' ? '여름' :
      item.settings.season === 'fall'   ? '가을' : '겨울',
    ].slice(0, 3);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Timeline', { schedule: item })}
        activeOpacity={0.85}
      >
        <View style={styles.thumbnailWrap}>
          <View style={styles.thumbnail}>
            <Ionicons name={thumbIcon} size={26} color={colors.primary} />
          </View>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>{formatDays(item.days)}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardMeta}>{date} 저장 · 명소 {item.spots.length}곳</Text>
          <View style={styles.tagRow}>
            {tags.map(tag => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {schedules.length > 0 ? (
        <>
          <Text style={styles.title}>저장된 일정</Text>
          <FlatList
            data={schedules}
            keyExtractor={item => item.id}
            renderItem={renderCard}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.title}>저장된 일정</Text>
          <View style={styles.emptyCenter}>
            <EmptyLogo />
            <Text style={styles.emptyTitle}>아직 저장된 일정이 없어요</Text>
            <Text style={styles.emptySub}>당신의 결대로</Text>
            <Text style={styles.emptySub}>여행의 한 페이지를 채워주세요</Text>
          </View>
        </View>
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>새로운 여행 시작하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  thumbnailWrap: { position: 'relative', marginRight: spacing.md },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dayBadgeText: { color: '#fff', fontSize: 8.5, fontWeight: '700' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  cardMeta: { fontSize: 10, color: colors.textMuted, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tagChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { fontSize: 10, color: colors.primary, fontWeight: '500' },
  arrow: { fontSize: 22, color: colors.border, marginLeft: spacing.sm },
  emptyContainer: { flex: 1 },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyLogoBox: { alignItems: 'center', marginBottom: spacing.md },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySub: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: spacing.xl,
    paddingBottom: spacing.xl + 4,
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
