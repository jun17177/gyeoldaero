import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Linking,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, DayPlan, TimelineItem } from '../types';
import { findSpotOf } from '../utils/findSpot';
import { colors, spacing, radius, shadows, fonts } from '../constants/theme';
import { ACCOMMODATION_LABEL } from '../constants/accommodations';
import { generateTimeline } from '../algorithms/generateTimeline';
import { deleteSchedule } from '../storage/scheduleStorage';
import { formatStartDate, parseYyyymmdd } from '../utils/date';
import { buildShareText } from '../utils/shareSchedule';
import { fetchWeatherForecastCached, WeatherDay } from '../api/weatherApi';
import { WEATHER_META } from '../constants/weatherMeta';
import { tripWeather, weatherAdvice } from '../utils/tripWeather';

type Nav = StackNavigationProp<RootStackParamList, 'SavedDetail'>;
type Route = RouteProp<RootStackParamList, 'SavedDetail'>;

const WEATHER_LABEL: Record<string, string> = {
  sunny: '맑음', cloudy: '흐림', rainy: '비', snowy: '눈',
};
const THEME_LABEL: Record<string, string> = {
  healing: '힐링', activity: '액티비티', food: '미식',
  culture: '문화탐방', photo: '사진·감성', night: '야경·야간',
};

function formatDays(days: number): string {
  if (days <= 1) return '당일치기';
  return `${days - 1}박 ${days}일`;
}

export default function SavedDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { schedule } = route.params;

  const plans: DayPlan[] = useMemo(
    () =>
      schedule.dayPlans && schedule.dayPlans.length > 0
        ? schedule.dayPlans
        : generateTimeline(schedule),
    [schedule]
  );

  // 10일 예보 — 실패·임시 데이터면 비워 두어 날씨 표시와 안내를 모두 숨긴다
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchWeatherForecastCached()
      .then(f => { if (!cancelled) setForecast(f.isMock ? [] : f.days); })
      .catch(() => { if (!cancelled) setForecast([]); });
    return () => { cancelled = true; };
  }, []);
  const weather = tripWeather(schedule.startDate, schedule.days, forecast);
  const advice = weatherAdvice(schedule.startDate, schedule.days, forecast, schedule.weatherPlan);

  const departure = formatStartDate(schedule.startDate);
  const startBase = parseYyyymmdd(schedule.startDate);

  const dayDate = (day: number): string | null => {
    if (!startBase) return null;
    const d = new Date(startBase);
    d.setDate(startBase.getDate() + (day - 1));
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const tags = [
    ...schedule.settings.themes.map(t => THEME_LABEL[t] ?? t),
    WEATHER_LABEL[schedule.settings.weather],
    ACCOMMODATION_LABEL[schedule.accommodation] ?? schedule.accommodation,
  ];

  const handleShare = async () => {
    try {
      await Share.share({ message: buildShareText(schedule, plans) });
    } catch (e) {
      console.warn('[SavedDetail] 공유 실패:', e);
    }
  };

  const handleDelete = () => {
    Alert.alert('일정 삭제', `"${schedule.name}" 일정을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSchedule(schedule.id);
            navigation.popTo('SavedList');
          } catch (e) {
            console.error('[SavedDetail] 삭제 실패:', e);
            Alert.alert('삭제 실패', '일정을 삭제하지 못했어요. 다시 시도해주세요.');
          }
        },
      },
    ]);
  };

  const renderRow = (item: TimelineItem, idx: number, isLast: boolean) => {
    const spot = findSpotOf(schedule.spots, item);
    const displayName =
      item.type === 'meal' && item.selectedOption ? item.selectedOption : item.name;
    return (
      <View key={`${item.time}-${idx}`} style={styles.row}>
        <View style={styles.dotCol}>
          <View style={[styles.dot, { backgroundColor: item.dotColor }]} />
          {!isLast && <View style={styles.connector} />}
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTime}>{item.time}</Text>
          <Text style={styles.rowName}>{displayName}</Text>
          {item.type === 'meal' && !item.selectedOption && item.name !== displayName && (
            <Text style={styles.rowSub}>{item.name}</Text>
          )}
          {spot?.businessHoursUrl && (
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => Linking.openURL(spot.businessHoursUrl!)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={13} color={colors.primary} />
              <Text style={styles.linkText}>영업시간·정보</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{schedule.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* 요약 */}
        <View style={styles.summaryCard}>
          <View style={styles.daysBadge}>
            <Text style={styles.daysBadgeText}>{formatDays(schedule.days)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {departure ? (
              <Text style={styles.departText}>{departure} 출발</Text>
            ) : (
              <Text style={styles.departMuted}>출발일 미설정</Text>
            )}
            <Text style={styles.summaryMeta}>
              명소 {schedule.spots.length}곳 · {ACCOMMODATION_LABEL[schedule.accommodation] ?? schedule.accommodation} 숙소
            </Text>
          </View>
        </View>

        {/* 태그 */}
        <View style={styles.tagRow}>
          {tags.map((t, i) => (
            <View key={`${t}-${i}`} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>

        {/* 날씨 안내 — 비·눈 예보가 일정과 겹칠 때만 */}
        {advice && (
          <View style={styles.adviceCard}>
            <View style={styles.adviceTitleRow}>
              <Ionicons
                name={advice.state === 'adjusted' ? 'checkmark-circle' : WEATHER_META.rainy.icon}
                size={16}
                color={advice.state === 'adjusted' ? colors.teal : WEATHER_META.rainy.color}
              />
              <Text style={[styles.adviceTitle, advice.state === 'adjusted' && { color: colors.teal }]}>
                {advice.state === 'adjusted'
                  ? '날씨에 맞춰 조정된 일정이에요'
                  : `${advice.badDays.map(d => `${d}일차`).join('·')}에 비·눈 예보가 있어요`}
              </Text>
            </View>
            {advice.state === 'suggest' && (
              <>
                <Text style={styles.adviceText}>실내 명소 중심으로 일정을 다시 조정할 수 있어요.</Text>
                <TouchableOpacity
                  style={styles.adviceBtn}
                  onPress={() => navigation.navigate('Weather', { schedule, scheduleName: schedule.name })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.adviceBtnText}>날씨 반영해 조정하기</Text>
                </TouchableOpacity>
              </>
            )}
            {advice.state === 'partial' && (
              <Text style={styles.adviceText}>예보가 일정의 일부 날짜만 있어 자동 조정은 어려워요. 출발이 가까워지면 다시 확인해 주세요.</Text>
            )}
          </View>
        )}

        {/* AI 코멘트 */}
        {schedule.aiComment ? (
          <View style={styles.aiCard}>
            <View style={styles.aiTitleRow}>
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text style={styles.aiTitle}>AI 플래너의 한마디</Text>
            </View>
            <Text style={styles.aiText}>{schedule.aiComment}</Text>
          </View>
        ) : null}

        {/* 지도 */}
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => navigation.navigate('RouteMap', { schedule, initialDay: 1 })}
          activeOpacity={0.85}
        >
          <Ionicons name="map" size={18} color={colors.primary} />
          <Text style={styles.mapBtnText}>지도로 동선 보기</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* 일자별 타임라인 (읽기전용) */}
        {plans.map(plan => (
          <View key={plan.day} style={styles.daySection}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{plan.day}일차</Text>
              {dayDate(plan.day) && <Text style={styles.dayDate}>{dayDate(plan.day)}</Text>}
              {weather?.forecastDays[plan.day - 1] && (() => {
                const f = weather.forecastDays[plan.day - 1]!;
                const meta = WEATHER_META[f.condition];
                return (
                  <View style={styles.dayWeather} accessible accessibilityLabel={`${meta.label}, 기온 ${f.tMin}도에서 ${f.tMax}도`}>
                    <Ionicons name={meta.icon} size={15} color={meta.color} />
                    <Text style={styles.dayWeatherText}>{f.tMin}°~{f.tMax}°</Text>
                  </View>
                );
              })()}
            </View>
            <View style={styles.dayBody}>
              {plan.items.map((item, idx) =>
                renderRow(item, idx, idx === plan.items.length - 1)
              )}
            </View>
          </View>
        ))}

        {/* 편집 진입 */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('Timeline', { schedule })}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.editBtnText}>이 일정 편집하기</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row' },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.serifBold,
    color: colors.text,
    textAlign: 'center',
  },

  scroll: { paddingHorizontal: spacing.xl },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  daysBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  daysBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  departText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  departMuted: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  summaryMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  tag: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  tagText: { fontSize: 12, color: colors.primary, fontWeight: '600' },

  aiCard: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  aiTitle: { fontSize: 12, fontWeight: '700', color: colors.primary },
  aiText: { fontSize: 13, color: colors.text, lineHeight: 19 },

  // 날씨 안내 카드 (날씨 화면의 비 색과 같은 톤)
  adviceCard: {
    marginTop: spacing.md,
    backgroundColor: WEATHER_META.rainy.bg,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  adviceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adviceTitle: { fontSize: 13, fontWeight: '700', color: WEATHER_META.rainy.color },
  adviceText: { fontSize: 12, color: colors.text, lineHeight: 18, marginTop: 4 },
  adviceBtn: {
    marginTop: spacing.sm,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adviceBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primary },

  daySection: { marginTop: spacing.xl },
  dayHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.sm },
  dayTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  dayDate: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  // 그날 날씨는 머리글 오른쪽 끝에 붙인다 (아이콘 + 그날 최저~최고)
  dayWeather: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', alignSelf: 'center' },
  dayWeatherText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  dayBody: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },

  row: { flexDirection: 'row', gap: spacing.md },
  dotCol: { alignItems: 'center', width: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  connector: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  rowBody: { flex: 1, paddingBottom: spacing.md },
  rowTime: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  rowName: { fontSize: 14, color: colors.text, fontWeight: '600', marginTop: 1 },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  linkText: { fontSize: 12, color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 56,
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
  },
  editBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
