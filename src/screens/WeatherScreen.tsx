import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, TripSchedule } from '../types';
import { colors, spacing, radius, shadows } from '../constants/theme';
import { fetchWeatherForecast, WeatherDay } from '../api/weatherApi';
import { WEATHER_META } from '../constants/weatherMeta';
import { planTrip } from '../algorithms/planTrip';
import { forecastWeatherFactor } from '../algorithms/weatherFactor';
import { saveSchedule } from '../storage/scheduleStorage';
import StateView from '../components/StateView';
import TripCalendar from '../components/TripCalendar';
import { addDays, addYears, startOfDay, toYyyymmdd } from '../utils/calendar';

type Nav = StackNavigationProp<RootStackParamList, 'Weather'>;
type Route = RouteProp<RootStackParamList, 'Weather'>;
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const DAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

function parseDate(dateStr: string): Date {
  const yyyy = parseInt(dateStr.slice(0, 4), 10);
  const mm   = parseInt(dateStr.slice(4, 6), 10) - 1;
  const dd   = parseInt(dateStr.slice(6, 8), 10);
  return new Date(yyyy, mm, dd);
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const d = parseDate(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth()    === today.getMonth() &&
    d.getDate()     === today.getDate()
  );
}

export default function WeatherScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { schedule: baseSchedule, scheduleName } = route.params;
  const schedule = baseSchedule;

  const [forecast, setForecast]     = useState<WeatherDay[]>([]);
  // 예보 조회 실패 시 가짜 데이터가 실제 예보처럼 보이지 않도록 안내한다
  const [forecastIsMock, setForecastIsMock] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [selectedStart, setSelected] = useState<number | null>(null);
  // 10일 예보 밖의 날짜를 달력으로 직접 고른 경우 (예보 목록에서 고른 것과 둘 중 하나만 유지)
  const [manualStart, setManualStart] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarPick, setCalendarPick] = useState<Date | null>(null);
  const [saving, setSaving]          = useState(false);
  // 예보를 반영해 일정을 다시 짜는 중 — 몇 초 걸릴 수 있어 버튼에 표시한다
  const [replanning, setReplanning]  = useState(false);

  const tripDays = schedule.days;

  useEffect(() => {
    fetchWeatherForecast()
      .then(({ days, isMock }) => { setForecast(days); setForecastIsMock(isMock); })
      .finally(() => setLoading(false));
  }, []);

  // 이미 출발일이 정해진 일정(저장된 일정을 다시 저장하는 경우)은 그 날짜를 미리 선택해 둔다.
  // 예보 안에 온전히 들어오면 예보 선택, 아니면 달력 선택으로 이어서 바로 저장할 수 있다.
  useEffect(() => {
    if (loading || !schedule.startDate) return;
    const idx = forecast.findIndex(d => d.date === schedule.startDate);
    if (idx >= 0 && idx + tripDays <= forecast.length) {
      setSelected(idx);
      return;
    }
    const d = parseDate(schedule.startDate);
    const today = startOfDay(new Date());
    if (!Number.isNaN(d.getTime()) && d.getTime() >= today.getTime() && d.getTime() <= addYears(today, 1).getTime()) {
      setManualStart(d);
    }
  // 예보를 받은 직후 한 번만 — 이후 사용자의 선택을 덮어쓰지 않는다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const inRange    = (i: number) => selectedStart !== null && i >= selectedStart && i < selectedStart + tripDays;
  const isStart    = (i: number) => selectedStart !== null && i === selectedStart;
  const isEnd      = (i: number) => selectedStart !== null && i === selectedStart + tripDays - 1;
  const canSelect  = (i: number) => i + tripDays <= forecast.length;

  // 달력으로 고를 수 있는 범위: 오늘 ~ 1년 뒤 (출발일 기준, 도착일은 넘어가도 된다)
  const minDate = startOfDay(new Date());
  const maxDate = addYears(minDate, 1);

  const openCalendar = () => {
    const current = selectedStart !== null && forecast[selectedStart]
      ? parseDate(forecast[selectedStart].date)
      : manualStart;
    setCalendarPick(current);
    setCalendarOpen(true);
  };

  // 달력에서 확정: 고른 날짜가 10일 예보 안에 온전히 들어가면 예보 선택으로 처리해
  // 날씨 표시와 날씨 반영 재설계를 그대로 쓰고, 아니면 날짜만 저장하는 수동 선택으로 둔다.
  const confirmCalendar = () => {
    if (!calendarPick) return;
    const idx = forecast.findIndex(d => d.date === toYyyymmdd(calendarPick));
    if (idx >= 0 && canSelect(idx)) {
      setSelected(idx);
      setManualStart(null);
    } else {
      setSelected(null);
      setManualStart(calendarPick);
    }
    setCalendarOpen(false);
  };

  const hasSelection = selectedStart !== null || manualStart !== null;

  // 고른 날짜의 예보로 일정을 다시 맞춘다.
  // 서버는 이미 "비·눈 오는 날엔 실내 명소" 규칙으로 검증하지만, 그동안 앱이 예보를
  // 넘기지 않아 이 규칙이 동작하지 않았다. 실패하면 기존 일정을 그대로 저장한다.
  const replanForWeather = async (start: number): Promise<TripSchedule> => {
    const weatherByDay = forecast.slice(start, start + tripDays).map(d => d.condition);
    if (weatherByDay.length < tripDays) return schedule;
    // 비·눈이 하루도 없으면 다시 짤 이유가 없다 (불필요한 대기 제거)
    if (!weatherByDay.some(c => c === 'rainy' || c === 'snowy')) return schedule;
    setReplanning(true);
    try {
      // 일수 보정도 오늘 날씨가 아니라 이 여행 날짜들의 예보로 구한다
      const planned = await planTrip(schedule, {
        weatherByDay,
        weatherFactor: forecastWeatherFactor(schedule.settings.season, weatherByDay),
      });
      // 비·눈 반영은 AI 설계만 할 수 있다. 서버·토큰 문제로 알고리즘 일정으로 대체됐다면 날씨가 반영된 것이 아니고
      // 기존 일정(직접 편집한 순서 포함)을 덮어쓰기만 하므로, 기존 일정을 유지하고 날짜만 저장한다.
      if (planned.planSource !== 'ai') {
        Alert.alert('날씨 반영은 하지 못했어요', 'AI 서버에 연결하지 못해 일정은 그대로 두고 날짜만 저장했어요.');
        return schedule;
      }
      return {
        ...schedule,
        ...planned,
        spots: planned.spots ?? schedule.spots,
        // 동선이 바뀌면 식당 추천도 다시 받아야 한다
        mealOptionsEnriched: false,
        // 같은 예보로 또 조정하라고 안내하지 않도록 반영한 날씨를 기록한다 (저장 상세의 안내가 이 값을 본다)
        weatherPlan: weatherByDay.join(','),
      };
    } catch (e) {
      console.warn('[Weather] 날씨 반영 재설계 실패, 기존 일정 유지:', e);
      return schedule;
    } finally {
      setReplanning(false);
    }
  };

  const handleSave = async (withDate: boolean) => {
    setSaving(true);
    const startDate = !withDate
      ? undefined
      : selectedStart !== null
        ? forecast[selectedStart]?.date
        : manualStart ? toYyyymmdd(manualStart) : undefined;
    try {
      const schedule = withDate && selectedStart !== null && !forecastIsMock
        ? await replanForWeather(selectedStart)
        : baseSchedule;
      // 저장된 일정을 편집해 다시 저장하면 같은 id로 제자리 업데이트된다 (이름은 Timeline에서 이미 정해져 넘어옴).
      // 이름 변경은 저장 목록의 이름 수정 기능으로 분리했으므로 여기서 복제본을 만들지 않는다.
      // dayPlans·aiComment 등은 ...schedule 스프레드로 그대로 보존, startDate만 덧붙인다
      await saveSchedule({ ...schedule, name: scheduleName, startDate });
      // navigate는 목록을 한 겹 더 쌓으므로, 스택에 이미 있는 저장 목록까지 되돌아간다
      navigation.popTo('SavedList');
    } catch (e) {
      console.error('[Weather] 일정 저장 실패:', e);
      Alert.alert('저장 실패', '일정을 저장하지 못했어요. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  // 여행 기간이 예보 범위(10일)를 초과하면 날짜 선택이 불가능하므로 안내한다
  const outOfRange = !loading && forecast.length > 0 && tripDays > forecast.length;

  const fmtMD = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  const tripLabel = tripDays <= 1 ? '당일치기' : `${tripDays - 1}박 ${tripDays}일`;

  // 하단 요약: 예보에서 고른 날짜든 달력에서 고른 날짜든 같은 모양으로 보여준다
  const renderSummary = () => {
    let start: Date | null = null;
    if (selectedStart !== null && forecast[selectedStart]) start = parseDate(forecast[selectedStart].date);
    else if (manualStart) start = manualStart;
    if (!start) return null;
    const end = addDays(start, Math.max(tripDays, 1) - 1);
    return (
      <View>
        <View style={styles.summaryBox}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={styles.summaryText}>
            {fmtMD(start)}
            {'  →  '}
            {fmtMD(end)}
            {'  ·  '}
            {tripLabel}
          </Text>
        </View>
        {selectedStart === null && (
          <Text style={styles.noForecastNote}>예보는 출발 10일 전부터 볼 수 있어요 · 가까워지면 일정을 다시 저장해 날씨를 반영하세요</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>날짜 선택</Text>
          <Text style={styles.headerSub}>
            {tripLabel} 여행
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* 안내 */}
      {forecastIsMock && !loading && (
        // 조회 실패로 채운 가짜 예보 — 실제 예보로 오해하지 않도록 알린다
        <View style={styles.warnBanner}>
          <Ionicons name="cloud-offline-outline" size={15} color={colors.warning} />
          <Text style={[styles.warnText, { color: colors.warning }]}>
            예보를 불러오지 못해 임시 날씨를 보여드려요 · 날짜는 그대로 고를 수 있어요
          </Text>
        </View>
      )}

      {outOfRange ? (
        <View style={styles.warnBanner}>
          <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
          <Text style={styles.warnText}>
            여행 기간({tripDays}일)이 예보 범위(10일)를 넘어요 · 아래 버튼으로 달력에서 날짜를 직접 고를 수 있어요
          </Text>
        </View>
      ) : (
        <View style={styles.guideBanner}>
          <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
          <Text style={styles.guideText}>출발 날짜를 탭하면 여행 기간이 자동으로 표시됩니다</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <StateView variant="loading" message="날씨 정보를 불러오는 중..." />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* 10일 예보 밖(또는 예보에 없는 날짜)을 직접 고르는 입구 */}
          <TouchableOpacity style={styles.calendarBtn} onPress={openCalendar} activeOpacity={0.8}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <Text style={styles.calendarBtnText}>
              {manualStart ? `달력에서 고른 날짜 · ${fmtMD(manualStart)} 출발` : '10일 이후 날짜 직접 선택'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {forecast.map((day, idx) => {
            const d       = parseDate(day.date);
            const meta    = WEATHER_META[day.condition];
            const active  = inRange(idx);
            const start   = isStart(idx);
            const end     = isEnd(idx);
            const today   = isToday(day.date);
            const selectable = canSelect(idx);

            return (
              <TouchableOpacity
                key={day.date}
                style={[
                  styles.card,
                  active  && styles.cardActive,
                  start   && styles.cardStart,
                  !selectable && styles.cardDisabled,
                ]}
                onPress={() => { if (selectable) { setSelected(idx); setManualStart(null); } }}
                activeOpacity={selectable ? 0.75 : 1}
              >
                {/* 날짜 영역 */}
                <View style={styles.dateBlock}>
                  {today && (
                    <View style={[styles.todayBadge, active && styles.todayBadgeActive]}>
                      <Text style={[styles.todayBadgeText, active && styles.todayBadgeTextActive]}>오늘</Text>
                    </View>
                  )}
                  <Text style={[styles.monthText, active && styles.textWhiteMuted]}>
                    {d.getMonth() + 1}월
                  </Text>
                  <Text style={[styles.dayNum, active && styles.textWhite]}>
                    {d.getDate()}
                  </Text>
                  <Text style={[
                    styles.weekday,
                    active && styles.textWhiteMuted,
                    d.getDay() === 0 && styles.sunday,
                    d.getDay() === 6 && styles.saturday,
                  ]}>
                    {DAY_KR[d.getDay()]}
                  </Text>
                </View>

                {/* 구분선 */}
                <View style={[styles.vDivider, active && styles.vDividerActive]} />

                {/* 날씨 아이콘 */}
                <View style={[styles.weatherBlock, !active && { backgroundColor: meta.bg }, active && styles.weatherBlockActive]}>
                  <Ionicons
                    name={meta.icon}
                    size={26}
                    color={active ? '#fff' : meta.color}
                  />
                  <Text style={[styles.conditionLabel, active && styles.textWhite, !active && { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </View>

                {/* 기온 */}
                <View style={styles.tempBlock}>
                  <Text style={[styles.tMax, active && styles.textWhite]}>
                    {day.tMax}°
                  </Text>
                  <Text style={[styles.tMin, active && styles.textWhiteMuted]}>
                    {day.tMin}°
                  </Text>
                </View>

                {/* 구간 라벨 */}
                {(start || end) && (
                  <View style={[styles.rangeTag, end && styles.rangeTagEnd]}>
                    <Text style={styles.rangeTagText}>{start ? '출발' : '도착'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 160 }} />
        </ScrollView>
      )}

      {/* 하단 바 */}
      <View style={styles.bottomBar}>
        {renderSummary()}

        <TouchableOpacity
          style={[
            styles.saveBtn,
            !hasSelection && styles.saveBtnDisabled,
          ]}
          onPress={() => handleSave(true)}
          disabled={!hasSelection || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <View style={styles.savingRow}>
              <ActivityIndicator size="small" color="#fff" />
              {replanning && <Text style={styles.saveBtnText}>날씨에 맞춰 일정 조정 중…</Text>}
            </View>
          ) : (
            <Text style={styles.saveBtnText}>
              {!hasSelection ? '날짜를 선택해주세요' : '이 날짜로 저장하기'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => handleSave(false)}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>날짜 없이 저장</Text>
        </TouchableOpacity>
      </View>

      {/* 달력 (바텀 시트) */}
      <Modal visible={calendarOpen} transparent animationType="slide" onRequestClose={() => setCalendarOpen(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setCalendarOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>출발 날짜 선택</Text>
            <Text style={styles.sheetSub}>{tripLabel} 여행 · 출발일을 탭하면 기간이 표시돼요</Text>
            <TripCalendar
              tripDays={tripDays}
              selectedStart={calendarPick}
              onSelect={setCalendarPick}
              minDate={minDate}
              maxDate={maxDate}
            />
            {calendarPick ? (
              <View style={[styles.summaryBox, { marginTop: spacing.md }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.summaryText}>
                  {fmtMD(calendarPick)}
                  {'  →  '}
                  {fmtMD(addDays(calendarPick, Math.max(tripDays, 1) - 1))}
                  {'  ·  '}
                  {tripLabel}
                </Text>
              </View>
            ) : (
              <Text style={styles.sheetHint}>오늘부터 1년 뒤까지 고를 수 있어요</Text>
            )}
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setCalendarOpen(false)}>
                <Text style={styles.sheetCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetConfirm, !calendarPick && styles.saveBtnDisabled]}
                onPress={confirmCalendar}
                disabled={!calendarPick}
              >
                <Text style={styles.sheetConfirmText}>이 날짜로 선택</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // 헤더
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
  headerSub:   { fontSize: 12, color: colors.textMuted, marginTop: 1 },

  // 안내 배너
  guideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  guideText: { fontSize: 12, color: colors.primary, flex: 1 },

  // 예보 범위 초과 경고 배너
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  warnText: { fontSize: 12, color: colors.danger, flex: 1 },

  // 로딩
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { fontSize: 14, color: colors.textMuted },

  // 스크롤
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs },

  // 카드
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  cardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cardStart: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  cardDisabled: { opacity: 0.4 },

  // 날짜 블록
  dateBlock: {
    width: 52,
    alignItems: 'center',
  },
  monthText: { fontSize: 10, color: colors.textMuted, fontWeight: '500' },
  dayNum:    { fontSize: 28, fontWeight: '700', color: colors.text, lineHeight: 34 },
  weekday:   { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  sunday:    { color: colors.danger },
  saturday:  { color: '#3B82F6' },

  // 오늘 뱃지
  todayBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginBottom: 2,
  },
  todayBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  todayBadgeText:   { fontSize: 9, color: colors.primary, fontWeight: '700' },
  todayBadgeTextActive: { color: '#fff' },

  // 구분선
  vDivider: {
    width: 1, height: 40,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  vDividerActive: { backgroundColor: 'rgba(255,255,255,0.3)' },

  // 날씨 블록
  weatherBlock: {
    width: 64,
    alignItems: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    gap: 3,
  },
  weatherBlockActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  conditionLabel: { fontSize: 11, fontWeight: '600' },

  // 기온 블록
  tempBlock: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: spacing.xs,
  },
  tMax: { fontSize: 22, fontWeight: '700', color: colors.text },
  tMin: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },

  // 출발/도착 라벨
  rangeTag: {
    position: 'absolute',
    top: -8, right: 12,
    backgroundColor: colors.warning,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rangeTagEnd: { backgroundColor: colors.teal },
  rangeTagText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  // 공통 텍스트
  textWhite:     { color: '#fff' },
  textWhiteMuted:{ color: 'rgba(255,255,255,0.7)' },

  // 하단 바
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 4,
    gap: spacing.sm,
  },

  // 선택 요약
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  noForecastNote: { fontSize: 11, color: colors.textMuted, marginTop: 6, lineHeight: 16 },

  // 달력 열기 버튼 (예보 목록 맨 위)
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  calendarBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primary },

  // 달력 바텀 시트
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetBackdrop: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl + 8,
    borderTopRightRadius: radius.xl + 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 4,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  sheetSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: spacing.lg },
  sheetHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  sheetBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  sheetCancel: {
    flex: 1,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  sheetConfirm: {
    flex: 2,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // 저장 버튼
  saveBtn: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // 날짜 없이 저장
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  skipBtnText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
});
