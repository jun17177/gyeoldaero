import React, { useEffect, useMemo, useState } from 'react';
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
import { RootStackParamList, DayPlan } from '../types';
import { colors, spacing, radius } from '../constants/theme';
import { generateTimeline, ACCOMMODATION_COORDS } from '../algorithms/generateTimeline';
import RouteMapWebView, { RoutePoint } from '../components/RouteMapWebView';
import { fetchDrivingRoutePath, LatLon } from '../api/naverMapApi';
import { NAVER_MAP_API_KEY_ID } from '../constants/naverApiKeys';
import { parseYyyymmdd } from '../utils/date';

type Nav = StackNavigationProp<RootStackParamList, 'RouteMap'>;
type Route = RouteProp<RootStackParamList, 'RouteMap'>;

export default function RouteMapScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { schedule, initialDay } = route.params;

  // 저장된 일정은 dayPlans를 갖고 있고, 없으면 즉석 생성
  const plans: DayPlan[] = useMemo(
    () =>
      schedule.dayPlans && schedule.dayPlans.length > 0
        ? schedule.dayPlans
        : generateTimeline(schedule),
    [schedule]
  );

  const [selectedDay, setSelectedDay] = useState<number>(
    initialDay && plans.some(p => p.day === initialDay) ? initialDay : (plans[0]?.day ?? 1)
  );

  // 숙소 좌표 (custom이면 저장된 좌표, 아니면 프리셋)
  const accomCoords = useMemo(
    () =>
      schedule.accommodation === 'custom' && schedule.customAccommodationCoords
        ? schedule.customAccommodationCoords
        : ACCOMMODATION_COORDS[schedule.accommodation] ?? ACCOMMODATION_COORDS.jejucity,
    [schedule]
  );

  // 선택된 날짜의 방문 순서대로 좌표 추출 (숙소 시작 → 명소 1,2,3…)
  const points: RoutePoint[] = useMemo(() => {
    const plan = plans.find(p => p.day === selectedDay);
    if (!plan) return [];
    const pts: RoutePoint[] = [
      { label: '숙소', name: '숙소', lat: accomCoords.lat, lon: accomCoords.lon, kind: 'accommodation' },
    ];
    let n = 1;
    for (const item of plan.items) {
      if (item.type !== 'spot') continue;
      const spot = schedule.spots.find(s => s.name === item.name);
      if (!spot || typeof spot.lat !== 'number' || typeof spot.lon !== 'number') continue;
      pts.push({ label: String(n), name: spot.name, lat: spot.lat, lon: spot.lon, kind: 'spot' });
      n += 1;
    }
    return pts;
  }, [plans, selectedDay, schedule.spots, accomCoords]);

  const spotCount = points.filter(p => p.kind === 'spot').length;

  // 선택된 날의 방문 순서대로 실제 도로 경로를 조회해 지도에 곡선으로 그린다.
  // 키가 없거나 조회 실패 시 undefined → WebView가 마커 직선 연결로 폴백.
  const [routePath, setRoutePath] = useState<LatLon[] | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    if (!NAVER_MAP_API_KEY_ID || points.length < 2) {
      setRoutePath(undefined);
      return;
    }
    setRoutePath(undefined); // 날짜 전환 시 이전 경로 초기화
    const controller = new AbortController();
    (async () => {
      const segments = await Promise.all(
        points.slice(0, -1).map((p, i) =>
          fetchDrivingRoutePath({
            start: { lat: p.lat, lon: p.lon },
            goal: { lat: points[i + 1].lat, lon: points[i + 1].lon },
            signal: controller.signal,
          })
        )
      );
      if (cancelled) return;
      const combined: LatLon[] = [];
      segments.forEach((seg, i) => {
        // 실패한 구간은 두 점 직선으로 이어 경로 연속성 유지
        const part =
          seg && seg.length > 1
            ? seg
            : [
                { lat: points[i].lat, lon: points[i].lon },
                { lat: points[i + 1].lat, lon: points[i + 1].lon },
              ];
        combined.push(...part);
      });
      setRoutePath(combined.length > 1 ? combined : undefined);
    })();
    return () => {
      cancelled = true;
      controller.abort(); // 날짜 전환/언마운트 시 진행 중인 경로 요청도 실제로 취소
    };
  }, [points]);

  // 출발일이 있으면 선택된 일차의 실제 날짜 계산 (출발일 + (일차-1))
  const dayDateLabel = useMemo(() => {
    const base = parseYyyymmdd(schedule.startDate);
    if (!base) return null;
    const d = new Date(base);
    d.setDate(base.getDate() + (selectedDay - 1));
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }, [schedule.startDate, selectedDay]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>동선 지도</Text>
          <Text style={styles.headerSub}>
            {dayDateLabel ? `${dayDateLabel} · ` : ''}{selectedDay}일차 · 명소 {spotCount}곳
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* 날짜 탭 */}
      {plans.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabContent}
        >
          {plans.map(p => {
            const active = p.day === selectedDay;
            return (
              <TouchableOpacity
                key={p.day}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setSelectedDay(p.day)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{p.day}일차</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* 지도 */}
      <View style={styles.mapWrap}>
        <RouteMapWebView points={points} routePath={routePath} />
      </View>

      {/* 범례 — 지도 위 실제 스타일과 일치 (숙소=흰바탕 teal테두리, 동선=오렌지) */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendAccom} />
          <Text style={styles.legendText}>숙소</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>명소 (방문 순서)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendLine} />
          <Text style={styles.legendText}>이동 동선</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

  tabScroll: { flexGrow: 0, marginBottom: spacing.sm },
  tabContent: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: '#fff' },

  mapWrap: {
    flex: 1,
    marginHorizontal: spacing.xl,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendAccom: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#fff', borderWidth: 2, borderColor: colors.teal,
  },
  legendLine: { width: 16, height: 3, borderRadius: 2, backgroundColor: colors.warning },
  legendText: { fontSize: 12, color: colors.textMuted },
});
