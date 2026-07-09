import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Spot, TripSchedule } from '../types';
import { jejuSpots } from '../data/jejuSpots';
import { themeScore } from '../constants/themeProfiles';
import { mergeSeedAndApiSpots } from '../utils/mergeSpots';
import { loadImageCache, saveImageToCache } from '../storage/imageCache';
import { seasonScore } from '../utils/seasonScore';
import SpotCard from '../components/SpotCard';
import { fetchJejuSpotsByCategory, fetchSpotImage } from '../api/tourApi';
import StateView from '../components/StateView';
import {
  fetchDrivingRouteSummary,
  geocodeJejuAddress,
  GeocodeResult,
} from '../api/naverMapApi';
import { fetchJejuWeather, JejuWeather } from '../api/weatherApi';
import { fetchSpotRecommendations } from '../api/aiApi';
import { generateTimeline } from '../algorithms/generateTimeline';
import { nearestNeighbor } from '../algorithms/nearestNeighbor';
import { colors, spacing, radius, shadows } from '../constants/theme';

type Nav = StackNavigationProp<RootStackParamList, 'SpotSelect'>;
type Route = RouteProp<RootStackParamList, 'SpotSelect'>;

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
  { id: 'custom',   label: '직접입력' },
  { id: 'jejucity', label: '제주시' },
  { id: 'aewol',    label: '애월' },
  { id: 'hallim',   label: '한림' },
  { id: 'jungmun',  label: '중문' },
  { id: 'seogwipo', label: '서귀포' },
  { id: 'seongsan', label: '성산' },
];

// 테마 성격(카테고리+태그) 정의는 themeProfiles로 일원화

const ALL_FILTER_OPTIONS: { id: Spot['category'] | 'all'; label: string }[] = [
  { id: 'all',      label: '전체' },
  { id: 'nature',   label: '자연' },
  { id: 'activity', label: '액티비티' },
  { id: 'culture',  label: '문화' },
  { id: 'food',     label: '미식' },
  { id: 'photo',    label: '사진·감성' },
  { id: 'night',    label: '야경' },
];


// id 중복 제거 — TourAPI는 테마별 조회 시 같은 명소를 여러 번 돌려줄 수 있어
// FlatList key 충돌을 막기 위해 합친 뒤 한 번 정리한다.
function dedupeById(spots: Spot[]): Spot[] {
  const seen = new Set<string>();
  return spots.filter(s => (seen.has(s.id) ? false : (seen.add(s.id), true)));
}

function formatDays(days: number) {
  if (days === 0) return '—';
  if (days === 1) return '당일치기';
  return `${days - 1}박 ${days}일`;
}

export default function SpotSelectScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { settings, mode = 'manual' } = route.params;

  // 테마는 "차단 필터"가 아니라 "추천 우선순위" — 전체 명소를 다 보여주되
  // 테마 맞춤 명소가 뱃지와 함께 상단에 오도록 정렬한다. 필터 칩도 전체 노출.
  const visibleFilters = ALL_FILTER_OPTIONS;

  const [selected, setSelected] = useState<Spot[]>([]);
  const [accommodation, setAccommodation] = useState<TripSchedule['accommodation']>('jejucity');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Spot['category'] | 'all'>('all');
  const [customAddress, setCustomAddress] = useState('');
  const [customCoords, setCustomCoords] = useState<GeocodeResult | null>(null);
  const [customResolving, setCustomResolving] = useState(false);
  const [customError, setCustomError] = useState('');
  const [routeOptimizing, setRouteOptimizing] = useState(false);
  const [spots, setSpots] = useState<Spot[]>(jejuSpots);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<JejuWeather | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [aiRecs, setAiRecs] = useState<{ spot: Spot; reason: string }[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiRequested = useRef(false);

  // imageUrl 없는 명소를 TourAPI 실제 사진으로 지연 보강 (동시성 4, 시도한 id는 재요청 안 함)
  const imgTried = useRef<Set<string>>(new Set());
  const enrichAbort = useRef(false);
  const enrichImages = useCallback((list: Spot[]) => {
    enrichAbort.current = false;
    const queue = list.filter(s => !s.imageUrl && !imgTried.current.has(s.id));
    if (queue.length === 0) return;
    const run = async () => {
      while (queue.length > 0 && !enrichAbort.current) {
        const s = queue.shift()!;
        imgTried.current.add(s.id);
        const url = await fetchSpotImage(s);
        if (url && !enrichAbort.current) {
          setSpots(prev => prev.map(p => (p.id === s.id ? { ...p, imageUrl: url } : p)));
          void saveImageToCache(s.id, url); // 다음 방문 땐 API 없이 즉시 표시
        }
      }
    };
    for (let i = 0; i < 4; i++) void run();
  }, []);

  const loadSpots = useCallback(async () => {
    setLoading(true);
    setUsedFallback(false);
    enrichAbort.current = true; // 이전 보강 작업 중단
    try {
      // 전체 카테고리 조회 — 테마 밖 명소도 목록 하단에서 선택 가능해야 하므로
      const apiSpots = dedupeById(await fetchJejuSpotsByCategory('all'));
      if (apiSpots.length > 0) {
        // 시드(성격 태그·정확한 체류시간)를 기본으로 유지하고, 시드에 없는 API 명소만 보탠다.
        // — API로 통째 대체하면 테마 태그 매칭·체류시간 정확도가 사라지는 문제 방지
        const cache = await loadImageCache();
        const merged = mergeSeedAndApiSpots(jejuSpots, apiSpots).map(s =>
          !s.imageUrl && cache[s.id] ? { ...s, imageUrl: cache[s.id] } : s
        );
        setSpots(merged);
        enrichImages(merged); // 캐시에 없는 명소만 실제 이미지로 보강
        aiRequested.current = false; // 새 명소 목록 기준으로 AI 추천 다시 요청
      } else {
        setUsedFallback(true); // API는 응답했지만 결과 0건 → 시드 데이터 유지
      }
    } catch (e) {
      console.error('[SpotSelect] API 실패:', e);
      setUsedFallback(true);
      // 오프라인이어도 이전에 캐시된 사진은 보여준다
      try {
        const cache = await loadImageCache();
        setSpots(prev => prev.map(s => (!s.imageUrl && cache[s.id] ? { ...s, imageUrl: cache[s.id] } : s)));
      } catch { /* 캐시 실패 시 이모지 폴백 유지 */ }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSpots();
  }, [loadSpots]);

  // 언마운트 시 진행 중인 이미지 보강 중단
  useEffect(() => () => { enrichAbort.current = true; }, []);

  // 제주 오늘 날씨 조회 → 기간 산출 보정에 사용
  useEffect(() => {
    let cancelled = false;
    fetchJejuWeather()
      .then(w => { if (!cancelled) setWeather(w); })
      .catch(e => console.warn('[SpotSelect] 날씨 조회 실패:', e));
    return () => { cancelled = true; };
  }, []);

  // AI 맞춤 명소 추천 — 명소 로딩이 끝나면 한 번만 요청. 실패해도 화면은 정상 동작.
  // 자동 설정 모드(mode==='auto')면 추천 명소를 자동으로 담아준다.
  useEffect(() => {
    if (loading || spots.length === 0 || aiRequested.current) return;
    aiRequested.current = true;
    let cancelled = false;
    setAiLoading(true);

    // 자동 모드에서 AI가 실패했을 때: 테마 성격 점수 → 계절 점수 순 상위 6곳을 대신 담는다
    const autoFallback = () => {
      if (mode !== 'auto') return;
      const top = [...spots]
        .sort((a, b) =>
          themeScore(b, settings.themes) - themeScore(a, settings.themes) ||
          seasonScore(b, settings.season) - seasonScore(a, settings.season))
        .slice(0, 6);
      setSelected(prev => (prev.length > 0 ? prev : top));
      setAutoFilled(true);
    };

    fetchSpotRecommendations({
      spots,
      settings: { ...settings, weather: weather?.condition ?? settings.weather },
      maxCount: mode === 'auto' ? 6 : 5,
    })
      .then(result => {
        if (cancelled) return;
        if (!result || !Array.isArray(result.recommendations)) { autoFallback(); return; }
        const byId = new Map(spots.map(s => [s.id, s]));
        const seenRec = new Set<string>();
        const recs = result.recommendations
          .map(r => {
            const spot = byId.get(r.spotId);
            return spot ? { spot, reason: r.reason } : null;
          })
          .filter((r): r is { spot: Spot; reason: string } => r !== null)
          // LLM이 같은 명소를 중복 추천해도 한 번만 (selected/타임라인 중복 방지)
          .filter(r => (seenRec.has(r.spot.id) ? false : (seenRec.add(r.spot.id), true)));
        setAiRecs(recs);
        setAiSummary(result.summary ?? '');
        if (mode === 'auto' && recs.length > 0) {
          // 사용자가 이미 직접 담기 시작했다면 덮어쓰지 않는다
          setSelected(prev => (prev.length > 0 ? prev : recs.map(r => r.spot)));
          setAutoFilled(true);
        } else if (mode === 'auto') {
          autoFallback();
        }
      })
      .catch(e => {
        if (cancelled) return;
        console.warn('[SpotSelect] AI 추천 처리 실패, 폴백:', e);
        autoFallback();
      })
      .finally(() => { if (!cancelled) setAiLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, spots]);

  const filtered = useMemo(() =>
    spots
      .filter(s => {
        // 테마로 걸러내지 않는다 — 전체 명소 노출, 테마 맞춤은 정렬·뱃지로 표현
        const matchCat = filter === 'all' || s.category === filter;
        const matchQ   = !query || s.name.includes(query) || s.tags.some(t => t.includes(query));
        return matchCat && matchQ;
      })
      // 테마 성격이 뚜렷한 명소 우선, 동점이면 계절 점수
      .sort((a, b) =>
        themeScore(b, settings.themes) - themeScore(a, settings.themes) ||
        seasonScore(b, settings.season) - seasonScore(a, settings.season)),
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
      setCustomError('숙소 도로명주소나 지번주소를 입력해주세요.');
      return;
    }

    setCustomResolving(true);
    setCustomError('');
    try {
      const result = await geocodeJejuAddress(trimmed);
      if (!result) {
        setCustomCoords(null);
        setCustomError('주소를 찾지 못했어요. 예: 제주시 광양9길 10');
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

  // 미리보기 일수 — 실제 생성기(generateTimeline)와 동일 기준으로 산출해 결과와 어긋나지 않게 한다.
  // (이동시간은 아직 API 조회 전이라 기본값으로 추정)
  const days = useMemo(() => {
    if (selected.length === 0) return 0;
    const preview: TripSchedule = {
      id: 'preview', name: '', createdAt: '', days: 0,
      spots: selected,
      accommodation,
      customAccommodationCoords:
        accommodation === 'custom' && customCoords
          ? { lat: customCoords.lat, lon: customCoords.lon }
          : undefined,
      moveDurationsBySpotId: {},
      tags: settings.themes,
      settings: { ...settings, weather: weather?.condition ?? settings.weather },
    };
    return generateTimeline(preview).length;
  }, [selected, settings, accommodation, customCoords, weather]);

  const customAccommodationReady = accommodation !== 'custom' || !!customCoords;
  const canOptimize = selected.length > 0 && customAccommodationReady && !customResolving && !routeOptimizing;

  const buildMoveDurations = async (
    orderedSpots: Spot[],
    accomCoord: { lat: number; lon: number }
  ): Promise<Record<string, number>> => {
    const durations: Record<string, number> = {};
    let current = accomCoord;

    for (const spot of orderedSpots) {
      try {
        const routeSummary = await fetchDrivingRouteSummary({
          start: current,
          goal: { lat: spot.lat, lon: spot.lon },
        });
        durations[spot.id] = routeSummary?.durationMinutes ?? 20;
      } catch (e) {
        console.warn('[SpotSelect] 이동 시간 조회 실패, 기본값 사용:', e);
        durations[spot.id] = 20;
      }
      current = { lat: spot.lat, lon: spot.lon };
    }

    return durations;
  };

  const handleOptimize = async () => {
    if (selected.length === 0) return;
    if (accommodation === 'custom' && !customCoords) {
      setCustomError('일정 최적화 전에 숙소 주소를 먼저 확인해주세요.');
      return;
    }

    const accomCoord = accommodation === 'custom' && customCoords
      ? { lat: customCoords.lat, lon: customCoords.lon }
      : ACCOM_COORDS[accommodation];
    const orderedSpots = nearestNeighbor(selected, accomCoord.lat, accomCoord.lon);

    setRouteOptimizing(true);
    try {
      const moveDurationsBySpotId = await buildMoveDurations(orderedSpots, accomCoord);
      const scheduleBase: TripSchedule = {
        id: Date.now().toString(),
        name: '제주 여행',
        createdAt: new Date().toISOString(),
        days: 0, // 아래에서 실제 생성 일수로 확정
        spots: orderedSpots,
        accommodation,
        customAccommodationAddress: accommodation === 'custom'
          ? (customCoords?.roadAddress || customCoords?.jibunAddress || customAddress.trim())
          : undefined,
        customAccommodationCoords: accommodation === 'custom' && customCoords
          ? { lat: customCoords.lat, lon: customCoords.lon }
          : undefined,
        moveDurationsBySpotId,
        tags: settings.themes,
        settings: { ...settings, weather: weather?.condition ?? settings.weather },
      };
      // days는 실제 생성되는 일자 수로 확정 — 누락 방지로 늘어난 날짜까지 반영, 전 화면 표시와 일치
      const schedule: TripSchedule = {
        ...scheduleBase,
        days: generateTimeline(scheduleBase).length,
      };
      navigation.navigate('Timeline', { schedule });
    } finally {
      setRouteOptimizing(false);
    }
  };

  // AI 추천 섹션 — 추천이 있거나 로딩 중일 때만 리스트 상단에 노출
  const renderAiHeader = () => {
    if (!aiLoading && aiRecs.length === 0) return null;
    return (
      <View style={styles.aiSection}>
        <View style={styles.aiTitleRow}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={styles.aiTitle}>AI 맞춤 추천</Text>
          {aiLoading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
        {!!aiSummary && <Text style={styles.aiSummary}>{aiSummary}</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {aiRecs.map(({ spot, reason }) => {
            const isSelected = !!selected.find(s => s.id === spot.id);
            return (
              <TouchableOpacity
                key={spot.id}
                style={[styles.aiCard, isSelected && styles.aiCardSelected]}
                onPress={() => toggleSpot(spot)}
                activeOpacity={0.85}
              >
                <View style={styles.aiCardHeader}>
                  <Text style={styles.aiCardName} numberOfLines={1}>{spot.name}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.aiCardReason} numberOfLines={2}>{reason}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSpot = ({ item }: { item: Spot }) => (
    <SpotCard
      item={item}
      isSelected={!!selected.find(s => s.id === item.id)}
      isThemePick={themeScore(item, settings.themes) > 0}
      onPress={toggleSpot}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {/* 숙소 주소 입력 시 키보드가 하단 패널을 가리지 않도록 밀어올린다 */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >

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

      {/* 자동 설정: AI가 명소를 담았다는 안내 */}
      {autoFilled && selected.length > 0 && (
        <View style={styles.autoBanner}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={styles.autoBannerText}>
            취향에 맞춰 명소 {selected.length}개를 담아뒀어요 — 자유롭게 조정한 뒤 일정을 최적화하세요
          </Text>
        </View>
      )}

      {/* 실시간 명소 로딩 실패 안내 */}
      {usedFallback && (
        <TouchableOpacity style={styles.fallbackBanner} onPress={loadSpots} activeOpacity={0.8}>
          <Ionicons name="cloud-offline-outline" size={14} color={colors.warning} />
          <Text style={styles.fallbackText}>
            실시간 명소를 불러오지 못해 기본 목록을 보여드려요 · 탭해서 다시 시도
          </Text>
        </TouchableOpacity>
      )}

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
          <StateView variant="loading" message="제주 명소를 불러오는 중..." />
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
          ListHeaderComponent={renderAiHeader}
          ListEmptyComponent={
            <StateView
              variant="empty"
              title={query ? '검색 결과가 없어요' : '표시할 명소가 없어요'}
              message={
                query
                  ? `"${query}"에 맞는 명소를 찾지 못했어요`
                  : '다른 카테고리를 선택해보세요'
              }
              onRetry={query ? () => setQuery('') : undefined}
              retryLabel="검색 지우기"
            />
          }
        />
      )}

      {/* 하단 패널 */}
      <View style={styles.bottomPanel}>
        {/* 일수 뱃지 */}
        <View style={styles.daysSection}>
          <View style={styles.daysHeaderRow}>
            <Text style={styles.daysText}>{formatDays(days)}</Text>
            {weather && (
              <View style={styles.weatherChip}>
                <Text style={styles.weatherChipText}>
                  {weather.emoji} {weather.label}
                  {weather.tempC != null ? ` ${Math.round(weather.tempC)}°` : ''}
                </Text>
              </View>
            )}
          </View>
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
                placeholder="숙소 도로명/지번주소 입력"
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
          {routeOptimizing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.optimizeBtnText}>일정 최적화하기 →</Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
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
  // 명소 카드 스타일은 components/SpotCard.tsx로 이관
  bottomPanel: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  autoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  autoBannerText: {
    flex: 1,
    fontSize: 11,
    color: colors.primary,
  },
  fallbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FEF3E2',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  fallbackText: {
    flex: 1,
    fontSize: 11,
    color: colors.warning,
  },
  aiSection: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  aiSummary: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  aiCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginRight: spacing.sm,
    width: 170,
  },
  aiCardSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  aiCardName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  aiCardReason: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  daysSection: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  daysHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  daysText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 34,
  },
  weatherChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  weatherChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
});
