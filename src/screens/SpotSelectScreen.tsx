import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Spot, TripSchedule } from '../types';
import { jejuSpots } from '../data/jejuSpots';
import { calcTripDays } from '../algorithms/timeBudget';
import { nearestNeighbor } from '../algorithms/nearestNeighbor';
import { colors, spacing, radius, shadows } from '../constants/theme';

type Nav = StackNavigationProp<RootStackParamList, 'SpotSelect'>;
type Route = RouteProp<RootStackParamList, 'SpotSelect'>;

const ACCOM_COORDS: Record<string, { lat: number; lon: number }> = {
  airport:  { lat: 33.5074, lon: 126.4927 },
  jejucity: { lat: 33.4996, lon: 126.5312 },
  seogwipo: { lat: 33.2541, lon: 126.5600 },
  east:     { lat: 33.4390, lon: 126.9229 },
  west:     { lat: 33.3925, lon: 126.2376 },
  custom:   { lat: 33.4996, lon: 126.5312 },
};

const ACCOM_OPTIONS: { id: TripSchedule['accommodation']; label: string }[] = [
  { id: 'airport',  label: '공항 주변' },
  { id: 'jejucity', label: '제주시' },
  { id: 'seogwipo', label: '서귀포' },
  { id: 'east',     label: '동쪽' },
  { id: 'west',     label: '서쪽' },
];

const FILTER_OPTIONS: { id: Spot['category'] | 'all'; label: string }[] = [
  { id: 'all',     label: '전체' },
  { id: 'nature',  label: '자연' },
  { id: 'culture', label: '문화' },
  { id: 'food',    label: '미식' },
];

function formatDays(days: number) {
  if (days === 0) return '—';
  if (days === 1) return '당일치기';
  return `${days - 1}박 ${days}일`;
}

export default function SpotSelectScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { settings } = route.params;

  const [selected, setSelected] = useState<Spot[]>([]);
  const [accommodation, setAccommodation] = useState<TripSchedule['accommodation']>('airport');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Spot['category'] | 'all'>('all');

  const filtered = useMemo(() =>
    jejuSpots.filter(s => {
      const matchCat = filter === 'all' || s.category === filter;
      const matchQ   = !query || s.name.includes(query) || s.tags.some(t => t.includes(query));
      return matchCat && matchQ;
    }),
  [filter, query]);

  const toggleSpot = (spot: Spot) =>
    setSelected(prev =>
      prev.find(s => s.id === spot.id)
        ? prev.filter(s => s.id !== spot.id)
        : [...prev, spot]
    );

  const days = useMemo(() => {
    if (selected.length === 0) return 0;
    return calcTripDays({
      spots: selected,
      startTime: settings.startTime,
      endTime: settings.endTime,
      firstDayArrival: settings.firstDayArrival,
      lastDayDeparture: settings.lastDayDeparture,
      luggage: settings.luggage,
    });
  }, [selected, settings]);

  const handleOptimize = () => {
    if (selected.length === 0) return;
    const accomCoord = ACCOM_COORDS[accommodation];
    const orderedSpots = nearestNeighbor(selected, accomCoord.lat, accomCoord.lon);
    const schedule: TripSchedule = {
      id: Date.now().toString(),
      name: '제주 여행',
      createdAt: new Date().toISOString(),
      days,
      spots: orderedSpots,
      accommodation,
      tags: settings.themes,
      settings,
    };
    navigation.navigate('Timeline', { schedule });
  };

  const renderSpot = ({ item }: { item: Spot }) => {
    const isSelected = !!selected.find(s => s.id === item.id);
    return (
      <TouchableOpacity
        style={[styles.spotCard, isSelected && styles.spotCardSelected]}
        onPress={() => toggleSpot(item)}
        activeOpacity={0.85}
      >
        {isSelected && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        )}
        <View style={styles.spotImageArea}>
          <Text style={styles.spotEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.spotInfo}>
          <Text style={styles.spotName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.spotMeta}>
            {item.category === 'nature'  ? '자연' :
             item.category === 'culture' ? '문화' :
             item.category === 'food'    ? '미식' :
             item.category === 'photo'   ? '사진' : '야경'} · {item.durationMinutes}분
          </Text>
          {isSelected && <Text style={styles.selectedLabel}>✓ 담김</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* 검색창 */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="명소 이름 검색 (예: 한라산, 성산...)"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* 필터 칩 */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
            onPress={() => setFilter(f.id as Spot['category'] | 'all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 명소 그리드 */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderSpot}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />

      {/* 하단 패널 */}
      <View style={styles.bottomPanel}>
        {/* 일수 뱃지 */}
        <View style={styles.daysSection}>
          <Text style={styles.daysText}>{formatDays(days)}</Text>
          <Text style={styles.daysSub}>
            {selected.length > 0
              ? `명소 ${selected.length}개 담김 · 자동 계산`
              : '명소를 선택하세요'}
          </Text>
        </View>

        {/* 숙소 위치 */}
        <Text style={styles.accomLabel}>숙소 위치</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accomScroll}>
          {ACCOM_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.accomChip, accommodation === opt.id && styles.accomChipActive]}
              onPress={() => setAccommodation(opt.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.accomText, accommodation === opt.id && styles.accomTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.optimizeBtn, selected.length === 0 && styles.optimizeBtnDisabled]}
          onPress={handleOptimize}
          disabled={selected.length === 0}
          activeOpacity={0.85}
        >
          <Text style={styles.optimizeBtnText}>일정 최적화하기 →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.sm,
  },
  searchIcon: { fontSize: 15, marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: 13, color: colors.text },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: 8,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterTextActive: { color: '#fff' },
  grid: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 12,
  },
  gridRow: { gap: 10, marginBottom: 10 },
  spotCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  spotCardSelected: {
    borderColor: colors.primary,
  },
  checkBadge: {
    position: 'absolute',
    top: 8, right: 8,
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  checkIcon: { color: '#fff', fontSize: 12, fontWeight: '700' },
  spotImageArea: {
    height: 80,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotEmoji: { fontSize: 38 },
  spotInfo: { padding: spacing.sm, paddingTop: 6 },
  spotName: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 2 },
  spotMeta: { fontSize: 10, color: colors.textMuted },
  selectedLabel: { fontSize: 10, color: colors.primary, fontWeight: '600', marginTop: 2 },
  bottomPanel: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  daysSection: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  daysText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 34,
  },
  daysSub: { fontSize: 12, color: colors.textMuted },
  accomLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  accomScroll: { marginBottom: spacing.md },
  accomChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  accomChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  accomText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  accomTextActive: { color: '#fff' },
  optimizeBtn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optimizeBtnDisabled: { opacity: 0.4 },
  optimizeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
