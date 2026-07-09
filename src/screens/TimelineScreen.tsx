import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, DayPlan, TimelineItem, TripSchedule, Spot } from '../types';
import { generateTimeline } from '../algorithms/generateTimeline';
import { fetchTripComment } from '../api/aiApi';
import { enrichMealOptions } from '../api/mealRecommend';
import { colors, spacing, radius, fonts } from '../constants/theme';
import { formatStartDate } from '../utils/date';

type Nav = StackNavigationProp<RootStackParamList, 'Timeline'>;
type Route = RouteProp<RootStackParamList, 'Timeline'>;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICON: Record<string, IoniconsName> = {
  nature:   'leaf-outline',
  activity: 'bicycle-outline',
  culture:  'business-outline',
  food:     'restaurant-outline',
  photo:    'camera-outline',
  night:    'moon-outline',
};

const WEATHER_LABEL: Record<string, string> = {
  sunny: '맑음', cloudy: '흐림', rainy: '비', snowy: '눈',
};

const THEME_LABEL: Record<string, string> = {
  healing: '힐링', activity: '액티비티', food: '미식',
  culture: '문화탐방', photo: '사진·감성', night: '야경·야간',
};

const ACCOM_LABEL: Record<string, string> = {
  jejucity: '제주시', aewol: '애월', hallim: '한림',
  jungmun: '중문', seogwipo: '서귀포', seongsan: '성산', custom: '직접입력',
};

function ItemIcon({ type, spotCategory }: { type: TimelineItem['type']; spotCategory?: string }) {
  const iconName: IoniconsName =
    type === 'accommodation' ? 'bed-outline' :
    type === 'meal'          ? 'restaurant-outline' :
    type === 'move'          ? 'car-outline' :
    (CATEGORY_ICON[spotCategory ?? 'nature'] ?? 'location-outline');
  return <Ionicons name={iconName} size={20} color={colors.textMuted} style={styles.itemIcon} />;
}

export default function TimelineScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  // 명소 제거·순서 변경을 지원하기 위해 일정을 상태로 보관 (이후 화면 이동·저장에 편집본이 흐름)
  const [schedule, setSchedule] = useState<TripSchedule>(route.params.schedule);

  const [saveModal, setSaveModal] = useState(false);
  // 저장된 일정을 다시 열면 원본 이름으로 초기화 (신규 생성 시엔 '제주 여행' 기본값)
  const [scheduleName, setScheduleName] = useState(schedule.name || '제주 여행');
  const [aiComment, setAiComment] = useState('');
  const [aiCommentLoading, setAiCommentLoading] = useState(false);

  // AI 일정 코멘트 — 실패해도 화면은 정상 동작 (코멘트만 미표시)
  // 저장된 일정을 다시 연 경우엔 보관된 코멘트를 재사용해 API 재호출을 막는다
  useEffect(() => {
    if (schedule.aiComment) {
      setAiComment(schedule.aiComment);
      return;
    }
    let cancelled = false;
    setAiCommentLoading(true);
    fetchTripComment({
      days: schedule.days,
      spots: schedule.spots,
      settings: schedule.settings,
    })
      .then(comment => { if (!cancelled && comment) setAiComment(comment); })
      .finally(() => { if (!cancelled) setAiCommentLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const basePlans: DayPlan[] = useMemo(() =>
    schedule.dayPlans?.length ? schedule.dayPlans : generateTimeline(schedule),
  [schedule]);

  // 식사 슬롯에 동선 주변 실제 식당 3곳 연결 — 완료 전/실패 시엔 기본 옵션 표시
  const [enrichedPlans, setEnrichedPlans] = useState<DayPlan[] | null>(null);
  useEffect(() => {
    // 저장된 일정을 다시 연 경우(dayPlans 보유)는 이미 보강된 상태라 건너뜀
    if (schedule.dayPlans?.length) return;
    let cancelled = false;
    enrichMealOptions(basePlans, schedule)
      .then(plans => { if (!cancelled) setEnrichedPlans(plans); })
      .catch(e => console.warn('[Timeline] 식당 추천 실패:', e));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePlans]);

  const dayPlans = enrichedPlans ?? basePlans;

  // 식사 슬롯에서 사용자가 고른 식당 — key: `${day}-${itemIdx}`
  const [mealChoice, setMealChoice] = useState<Record<string, string>>({});

  // ── 명소 편집 (제거·순서 변경) ──────────────────────────────
  // 편집 시 dayPlans를 비워 타임라인을 재생성하고, manualSpotOrder로 자동 재정렬을 막는다
  const applySpotsChange = (newSpots: Spot[]) => {
    const base: TripSchedule = {
      ...schedule,
      spots: newSpots,
      manualSpotOrder: true,
      dayPlans: undefined,
    };
    setSchedule({ ...base, days: generateTimeline(base).length });
    setEnrichedPlans(null); // 식당 추천은 새 동선 기준으로 다시
    setMealChoice({});      // 슬롯 인덱스가 바뀌므로 선택 초기화
  };

  const moveSpot = (name: string, dir: -1 | 1) => {
    const spots = [...schedule.spots];
    const i = spots.findIndex(s => s.name === name);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= spots.length) return;
    [spots[i], spots[j]] = [spots[j], spots[i]];
    applySpotsChange(spots);
  };

  const removeSpot = (name: string) => {
    if (schedule.spots.length <= 1) {
      Alert.alert('삭제 불가', '최소 1개의 명소는 남아 있어야 해요.');
      return;
    }
    Alert.alert('명소 빼기', `"${name}"을(를) 일정에서 뺄까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '빼기',
        style: 'destructive',
        onPress: () => applySpotsChange(schedule.spots.filter(s => s.name !== name)),
      },
    ]);
  };

  const handleSave = async () => {
    try {
      // 선택한 식당을 dayPlans에 새겨서 저장 (다시 열었을 때 유지)
      const plansWithChoices = dayPlans.map(plan => ({
        ...plan,
        items: plan.items.map((item, idx) => {
          if (item.type !== 'meal') return item;
          const choice = mealChoice[`${plan.day}-${idx}`] ?? item.selectedOption;
          return choice ? { ...item, selectedOption: choice } : item;
        }),
      }));
      setSaveModal(false);
      // 저장 직전 날씨 화면에서 출발일을 고르게 한다 (실제 저장은 WeatherScreen에서 수행)
      navigation.navigate('Weather', {
        schedule: {
          ...schedule,
          name: scheduleName,
          dayPlans: plansWithChoices,
          aiComment: aiComment || undefined,
        },
        scheduleName,
      });
    } catch (e) {
      console.error('[Timeline] 일정 저장 실패:', e);
      Alert.alert('저장 실패', '일정을 저장하지 못했어요. 다시 시도해주세요.');
    }
  };

  // schedule.days는 총 일수 (예: 2 = 1박 2일) — SpotSelectScreen formatDays와 동일 기준
  const formatDays = () => {
    const d = schedule.days;
    if (d <= 1) return '당일치기';
    return `${d - 1}박 ${d}일`;
  };

  const renderItem = (item: TimelineItem, idx: number, isLast: boolean, day: number) => {
    const spotCategory = schedule.spots.find(s => s.name === item.name)?.category;
    const mealKey = `${day}-${idx}`;
    const chosenMeal = mealChoice[mealKey] ?? item.selectedOption;
    return (
      <View key={`${item.time}_${idx}`} style={styles.timelineRow}>
        <View style={styles.dotCol}>
          <View style={[styles.dot, { backgroundColor: item.dotColor }]} />
          {!isLast && <View style={styles.connector} />}
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemMain}>
            <ItemIcon type={item.type} spotCategory={spotCategory} />
            <View style={styles.itemText}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.time}
                {item.duration > 0 ? ` · ${item.duration}분` : ''}
                {item.type === 'spot' ? ' · 야외' : ''}
              </Text>
              {item.type === 'meal' && item.options && (
                <View style={styles.mealOptRow}>
                  {item.options.map(opt => {
                    const active = chosenMeal === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.mealOptChip, active && styles.mealOptChipActive]}
                        onPress={() =>
                          setMealChoice(prev => ({
                            ...prev,
                            [mealKey]: active ? '' : opt, // 다시 누르면 선택 해제
                          }))
                        }
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[styles.mealOptText, active && styles.mealOptTextActive]}
                          numberOfLines={1}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
          {/* 명소만 편집 가능: 순서 위/아래 이동 + 일정에서 빼기 */}
          {item.type === 'spot' && (
            <View style={styles.spotEditRow}>
              <TouchableOpacity style={styles.spotEditBtn} onPress={() => moveSpot(item.name, -1)} activeOpacity={0.6}>
                <Ionicons name="chevron-up" size={15} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.spotEditBtn} onPress={() => moveSpot(item.name, 1)} activeOpacity={0.6}>
                <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.spotEditBtn} onPress={() => removeSpot(item.name)} activeOpacity={0.6}>
                <Ionicons name="close" size={15} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.topSection}>
          <View style={styles.topLeft}>
            <Text style={styles.daysTitle}>{formatDays()}</Text>
            <Text style={styles.daysSub}>
              {formatStartDate(schedule.startDate)
                ? `${formatStartDate(schedule.startDate)} 출발`
                : 'AI 추천 여행 기간'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.businessBtn}
            onPress={() => navigation.navigate('BusinessHours', { schedule: { ...schedule, dayPlans } })}
            activeOpacity={0.85}
          >
            <Text style={styles.businessBtnText}>영업시간 확인</Text>
          </TouchableOpacity>
        </View>

        {/* 태그 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagScroll}
          contentContainerStyle={styles.tagContent}
        >
          {schedule.settings.themes.map(t => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{THEME_LABEL[t] ?? t}</Text>
            </View>
          ))}
          <View style={styles.tag}>
            <Text style={styles.tagText}>{WEATHER_LABEL[schedule.settings.weather]}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>명소 {schedule.spots.length}곳</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{ACCOM_LABEL[schedule.accommodation]}</Text>
          </View>
        </ScrollView>

        {/* AI 코멘트 */}
        {(aiComment || aiCommentLoading) && (
          <View style={styles.aiCommentCard}>
            <View style={styles.aiCommentTitleRow}>
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text style={styles.aiCommentTitle}>AI 플래너의 한마디</Text>
            </View>
            {aiComment ? (
              <Text style={styles.aiCommentText}>{aiComment}</Text>
            ) : (
              <Text style={styles.aiCommentLoading}>일정을 살펴보는 중…</Text>
            )}
          </View>
        )}

        {/* 동선 지도 진입 */}
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => navigation.navigate('RouteMap', { schedule: { ...schedule, dayPlans }, initialDay: 1 })}
          activeOpacity={0.85}
        >
          <Ionicons name="map" size={18} color={colors.primary} />
          <Text style={styles.mapBtnText}>지도로 동선 보기</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 타임라인 */}
        {dayPlans.map(plan => (
          <View key={plan.day} style={styles.daySection}>
            <Text style={styles.dayLabel}>DAY {plan.day}</Text>
            {plan.items.map((item, idx) =>
              renderItem(item, idx, idx === plan.items.length - 1, plan.day)
            )}
          </View>
        ))}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => setSaveModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>일정 저장</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.backBtnText}>← 다시 선택</Text>
        </TouchableOpacity>
      </View>

      {/* 저장 모달 */}
      <Modal visible={saveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>일정 이름</Text>
            <TextInput
              style={styles.modalInput}
              value={scheduleName}
              onChangeText={setScheduleName}
              placeholder="예: 제주 봄 여행"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSaveModal(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSave}>
                <Text style={styles.modalSaveText}>저장</Text>
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
  topSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  topLeft: {},
  daysTitle: { fontFamily: fonts.serifBold, fontSize: 40, color: colors.text, lineHeight: 46 },
  daysSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  businessBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  businessBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tagScroll: { marginTop: spacing.sm },
  tagContent: { paddingHorizontal: spacing.xl, gap: 8 },
  tag: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl, marginTop: spacing.md },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primary },
  aiCommentCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  aiCommentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  aiCommentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  aiCommentText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  aiCommentLoading: {
    fontSize: 12,
    color: colors.textMuted,
  },
  daySection: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  dayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 56,
    marginBottom: 2,
  },
  dotCol: {
    width: 20,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connector: {
    flex: 1,
    width: 1.5,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  itemIcon: { marginTop: 0 },
  itemText: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
  itemMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  mealOptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  mealOptChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    maxWidth: 150,
  },
  mealOptChipActive: {
    borderColor: colors.warning,
    backgroundColor: '#FEF3E2',
  },
  mealOptText: { fontSize: 11, color: colors.textMuted },
  mealOptTextActive: { color: colors.warning, fontWeight: '600' },
  // 명소 편집 컨트롤 (↑ ↓ ✕)
  spotEditRow: { flexDirection: 'row', gap: 4, marginLeft: spacing.sm, marginTop: 2 },
  spotEditBtn: {
    width: 26, height: 26,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.xl,
    paddingBottom: spacing.xl + 4,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    flex: 3,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  backBtn: {
    flex: 2,
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: radius.xl,
    padding: spacing.xl, width: '80%',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  modalInput: {
    height: 48, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    fontSize: 15, color: colors.text, marginBottom: spacing.lg,
  },
  modalBtns: { flexDirection: 'row', gap: spacing.sm },
  modalCancel: {
    flex: 1, height: 44, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCancelText: { color: colors.textMuted, fontWeight: '600' },
  modalSave: {
    flex: 2, height: 44, backgroundColor: colors.primary,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
  },
  modalSaveText: { color: '#fff', fontWeight: '700' },
});
