import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Spot, TripSchedule } from '../types';
import { jejuSpots } from '../data/jejuSpots';
import { fetchJejuSpotsByCategory } from '../api/tourApi';
import { geocodeJejuAddress, GeocodeResult } from '../api/naverMapApi';
import { calcTripDays } from '../algorithms/timeBudget';
import { nearestNeighbor } from '../algorithms/nearestNeighbor';
import { colors, spacing, radius, shadows } from '../constants/theme';

type Nav = StackNavigationProp<RootStackParamList, 'SpotSelect'>;
type Route = RouteProp<RootStackParamList, 'SpotSelect'>;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICON: Record<string, IoniconsName> = {
  nature:   'leaf-outline',
  activity: 'bicycle-outline',
  culture:  'business-outline',
  food:     'restaurant-outline',
  photo:    'camera-outline',
  night:    'moon-outline',
};

const ACCOM_COORDS: Record<string, { lat: number; lon: number }> = {
  jejucity: { lat: 33.4996, lon: 126.5312 }, // 제주시 (공항 포함)
  aewol:    { lat: 33.4600, lon: 126.3100 }, // 애월
  hallim:   { lat: 33.3925, lon: 126.2376 }, // 한림 (서쪽 해안)
  jungmun:  { lat: 33.2453, lon: 126.4126 }, // 중문 리조트
  seogwipo: { lat: 33.2541, lon: 126.5600 }, // 서귀포 시내
  seongsan: { lat: 33.4390, lon: 126.9229 }, // 성산 (동쪽)
  custom:   { lat: 33.4996, lon: 126.5312 },
};

const ACCOM_OPTIONS: { id: TripSchedule['accommodation']; label: string }[] = [
  { id: 'jejucity', label: '제주시' },
  { id: 'aewol',    label: '애월' },
  { id: 'hallim',   label: '한림' },
  { id: 'jungmun',  label: '중문' },
  { id: 'seogwipo', label: '서귀포' },
  { id: 'seongsan', label: '성산' },
  { id: 'custom',   label: '직접입력' },
];

const THEME_TO_CATEGORY: Record<string, Spot['category']> = {
  healing:  'nature',
  activity: 'activity',
  food:     'food',
  culture:  'culture',
  photo:    'photo',
  night:    'night',
};

const ALL_FILTER_OPTIONS: { id: Spot['category'] | 'all'; label: string }[] = [
  { id: 'all',      label: '전체' },
  { id: 'nature',   label: '자연' },
  { id: 'activity', label: '액티비티' },
  { id: 'culture',  label: '문화' },
  { id: 'food',     label: '미식' },
  { id: 'photo',    label: '사진·감성' },
  { id: 'night',    label: '야경' },
];

const SEASON_WEATHER_FACTOR: Record<string, number> = {
  spring: 1.0,
  summer: 1.1,  // 더위로 이동·활동 시간 증가
  fall:   1.0,
  winter: 1.15, // 추위·방한 준비로 이동 시간 증가
};

// 계절에 맞는 명소에 높은 점수 부여 → 정렬에 사용
function seasonScore(spot: Spot, season: string): number {
  const tags = spot.tags;
  switch (season) {
    case 'winter':
      if (['culture', 'food'].includes(spot.category)) return 2;
      if (tags.some(t => ['실내', '수족관', '박물관', '시장', '체험'].includes(t))) return 2;
      if (tags.some(t => ['해변', '수영', '스노클링', '서핑'].includes(t))) return 0;
      return 1;
    case 'summer':
      if (tags.some(t => ['해변', '수영', '서핑', '스쿠버', '스노클링', '에메랄드'].includes(t))) return 2;
      if (['food'].includes(spot.category)) return 1;
      return 1;
    case 'spring':
      if (tags.some(t => ['꽃', '정원', '동백', '녹차', '벚꽃', '봄'].includes(t))) return 2;
      if (tags.some(t => ['산림욕', '숲', '힐링', '피톤치드'].includes(t))) return 2;
      return 1;
    case 'fall':
      if (tags.some(t => ['트레킹', '등산', '산림욕', '숲', '단풍'].includes(t))) return 2;
      return 1;
    default:
      return 1;
  }
}

function formatDays(days: number) {
  if (days === 0) return '—';
  if (days === 1) return '당일치기';
  return `${days - 1}박 ${days}일`;
}

export default function SpotSelectScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { settings } = route.params;

  // 선택한 테마 → 허용 카테고리
  const allowedCategories = settings.themes
    .map(t => THEME_TO_CATEGORY[t])
    .filter((c): c is Spot['category'] => !!c);

  // 필터 탭: 선택된 테마에 해당하는 것만 노출
  const visibleFilters = ALL_FILTER_OPTIONS.filter(
    f => f.id === 'all' || allowedCategories.includes(f.id as Spot['category'])
  );

  const [selected, setSelected] = useState<Spot[]>([]);
  const [accommodation, setAccommodation] = useState<TripSchedule['accommodation']>('jejucity');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Spot['category'] | 'all'>('all');
  const [customAddress, setCustomAddress] = useState('');
  const [customCoords, setCustomCoords] = useState<GeocodeResult | null>(null);
  const [customResolving, setCustomResolving] = useState(false);
  const [customError, setCustomError] = useState('');
  const [spots, setSpots] = useState<Spot[]>(
    jejuSpots.filter(s => allowedCategories.includes(s.category))
  );
  const [loading, setLoading] = useState(false);

  const loadSpots = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        allowedCategories.map(cat => fetchJejuSpotsByCategory(cat))
      );
      const combined = results.flat();
      if (combined.length > 0) setSpots(combined);
    } catch (e) {
      console.error('[SpotSelect] API 실패:', e);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSpots();
  }, [loadSpots]);

  const filtered = useMemo(() =>
    spots
      .filter(s => {
        const inTheme  = allowedCategories.includes(s.category);
        const matchCat = filter === 'all' ? inTheme : s.category === filter;
        const matchQ   = !query || s.name.includes(query) || s.tags.some(t => t.includes(query));
        return matchCat && matchQ;
      })
      .sort((a, b) => seasonScore(b, settings.season) - seasonScore(a, settings.season)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [spots, filter, query]);

  const toggleSpot = (spot: Spot) =>
    setSelected(prev =>
      prev.find(s => s.id === spot.id)
        ? prev.filter(s => s.id !== spot.id)
        : [...prev, spot]
    );

  const handleAccommodationSelect = (id: TripSchedule['accommodation']) => {
    setAccommodation(id);
    if (id !== 'custom') {
      setCustomError('');
    }
  };

  const handleCustomAddressChange = (value: string) => {
    setCustomAddress(value);
    setCustomCoords(null);
    setCustomError('');
  };

  const resolveCustomAccommodation = async () => {
    const trimmed = customAddress.trim();
    if (!trimmed) {
      setCustomError('숙소 주소나 숙소 이름을 입력해주세요.');
      return;
    }

    setCustomResolving(true);
    setCustomError('');
    try {
      const result = await geocodeJejuAddress(trimmed);
      if (!result) {
        setCustomCoords(null);
        setCustomError('주소를 찾지 못했어요. 예: 제주 시청, 애월읍 애월로 1');
        return;
      }
      setCustomCoords(result);
    } catch (e) {
      console.error('[SpotSelect] 숙소 주소 변환 실패:', e);
      setCustomCoords(null);
      setCustomError('주소 확인에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setCustomResolving(false);
    }
  };

  const days = useMemo(() => {
    if (selected.length === 0) return 0;
    return calcTripDays({
      spots: selected,
      startTime: settings.startTime,
      endTime: settings.endTime,
      firstDayArrival: settings.firstDayArrival,
      lastDayDeparture: settings.lastDayDeparture,
      luggage: settings.luggage,
      weatherFactor: SEASON_WEATHER_FACTOR[settings.season] ?? 1.0,
    });
  }, [selected, settings]);

  const customAccommodationReady = accommodation !== 'custom' || !!customCoords;
  const canOptimize = selected.length > 0 && customAccommodationReady && !customResolving;

  const handleOptimize = () => {
    if (selected.length === 0) return;
    if (accommodation === 'custom' && !customCoords) {
      setCustomError('일정 최적화 전에 숙소 주소를 먼저 확인해주세요.');
      return;
    }

    const accomCoord = accommodation === 'custom' && customCoords
      ? { lat: customCoords.lat, lon: customCoords.lon }
      : ACCOM_COORDS[accommodation];
    const orderedSpots = nearestNeighbor(selected, accomCoord.lat, accomCoord.lon);
    const schedule: TripSchedule = {
      id: Date.now().toString(),
      name: '제주 여행',
      createdAt: new Date().toISOString(),
      days,
      spots: orderedSpots,
      accommodation,
      customAccommodationAddress: accommodation === 'custom'
        ? (customCoords?.roadAddress || customCoords?.jibunAddress || customAddress.trim())
        : undefined,
      customAccommodationCoords: accommodation === 'custom' && customCoords
        ? { lat: customCoords.lat, lon: customCoords.lon }
        : undefined,
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
            <Ionicons name="checkmark" size={13} color="#fff" />
          </View>
        )}
        <View style={styles.spotImageArea}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.spotImage} />
          ) : (
            <Ionicons name={CATEGORY_ICON[item.category] ?? 'location-outline'} size={38} color={colors.primary} />
          )}
        </View>
        <View style={styles.spotInfo}>
          <Text style={styles.spotName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.spotMeta}>
            {item.category === 'nature'   ? '자연' :
             item.category === 'activity' ? '액티비티' :
             item.category === 'culture'  ? '문화' :
             item.category === 'food'     ? '미식' :
             item.category === 'photo'    ? '사진' : '야경'} · {item.durationMinutes}분
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
        <Ionicons name="search-outline" size={15} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
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
        {visibleFilters.map(f => (
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
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderSpot}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />
      )}

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
              onPress={() => handleAccommodationSelect(opt.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.accomText, accommodation === opt.id && styles.accomTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {accommodation === 'custom' && (
          <View style={styles.customAccomBox}>
            <View style={styles.customInputRow}>
              <Ionicons name="home-outline" size={15} color={colors.textMuted} style={styles.customInputIcon} />
              <TextInput
                style={styles.customInput}
                placeholder="숙소 주소 또는 이름 입력"
                placeholderTextColor={colors.textMuted}
                value={customAddress}
                onChangeText={handleCustomAddressChange}
                returnKeyType="search"
                onSubmitEditing={resolveCustomAccommodation}
              />
              <TouchableOpacity
                style={[styles.resolveBtn, customResolving && styles.resolveBtnDisabled]}
                onPress={resolveCustomAccommodation}
                disabled={customResolving}
                activeOpacity={0.85}
              >
                {customResolving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.resolveBtnText}>확인</Text>
                )}
              </TouchableOpacity>
            </View>

            {customCoords && (
              <View style={styles.customResultBox}>
                <Ionicons name="checkmark-circle" size={15} color={colors.teal} />
                <Text style={styles.customResultText} numberOfLines={2}>
                  {customCoords.roadAddress || customCoords.jibunAddress || customAddress.trim()}
                </Text>
              </View>
            )}

            {!!customError && (
              <Text style={styles.customErrorText}>{customError}</Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.optimizeBtn, !canOptimize && styles.optimizeBtnDisabled]}
          onPress={handleOptimize}
          disabled={!canOptimize}
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
  spotImageArea: {
    height: 80,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  customAccomBox: {
    marginBottom: spacing.md,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingLeft: spacing.md,
    minHeight: 46,
  },
  customInputIcon: { marginRight: spacing.xs },
  customInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  resolveBtn: {
    minWidth: 58,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  resolveBtnDisabled: { opacity: 0.6 },
  resolveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  customResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
    paddingHorizontal: spacing.sm,
  },
  customResultText: { flex: 1, fontSize: 11, color: colors.teal, fontWeight: '600' },
  customErrorText: {
    marginTop: 7,
    paddingHorizontal: spacing.sm,
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
  },
  optimizeBtn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optimizeBtnDisabled: { opacity: 0.4 },
  optimizeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  spotImage: { width: '100%', height: 80 },
});
