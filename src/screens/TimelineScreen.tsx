import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, DayPlan, TimelineItem, TripSchedule } from '../types';
import { PlannedTrip, planWithAi, planWithAlgorithm } from '../algorithms/planTrip';
import { colors, spacing, radius } from '../constants/theme';
import { ACCOMMODATION_LABEL } from '../constants/accommodation';
import { AI_MAX_SPOTS, PLANNER_API_URL } from '../constants/config';

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

const THEME_LABEL: Record<string, string> = {
  healing: '힐링', activity: '액티비티', food: '미식',
  culture: '문화탐방', photo: '사진·감성', night: '야경·야간',
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
  const { schedule: initialSchedule } = route.params;

  const [schedule, setSchedule] = useState<TripSchedule>(initialSchedule);
  const [saveModal, setSaveModal] = useState(false);
  const [scheduleName, setScheduleName] = useState('제주 여행');
  const [dayPlans, setDayPlans] = useState<DayPlan[]>(schedule.dayPlans ?? []);
  const [loading, setLoading] = useState(!schedule.dayPlans?.length);
  const [aiPending, setAiPending] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [mealEditTarget, setMealEditTarget] = useState<{ day: number; itemIdx: number; options: string[] } | null>(null);

  // 최초 진입과 명소 삭제 때만 다시 계획한다. 계획 결과를 schedule에 합쳐도 spots는 그대로라 재실행되지 않음
  useEffect(() => {
    if (schedule.dayPlans?.length) return;

    let cancelled = false;
    let aiApplied = false;
    const apply = (plan: PlannedTrip) => {
      setSchedule(prev => ({
        ...prev,
        days: plan.days,
        dayPlans: plan.dayPlans,
        planSource: plan.planSource,
        aiReason: plan.aiReason,
      }));
      setDayPlans(plan.dayPlans);
      setLoading(false);
    };

    const aiEnabled = Boolean(PLANNER_API_URL) && schedule.spots.length > 0;
    const tooManySpots = schedule.spots.length > AI_MAX_SPOTS;
    setLoading(true);
    setAiPending(aiEnabled && !tooManySpots);
    setAiNotice(aiEnabled && tooManySpots
      ? `명소가 ${AI_MAX_SPOTS}곳을 넘어 AI 추천 없이 기본 계산으로 짰어요.`
      : null);
    // AI는 수 초 이상 걸리므로 요청을 먼저 띄워두고, 그동안 1초 안팎이면 나오는 알고리즘 일정을 먼저 보여준다
    const aiRequest = planWithAi(schedule);
    planWithAlgorithm(schedule).then(plan => {
      if (!cancelled && !aiApplied) apply(plan);
    });
    aiRequest.then(plan => {
      if (cancelled) return;
      setAiPending(false);
      if (plan) {
        aiApplied = true;
        apply(plan);
      } else if (aiEnabled && !tooManySpots) {
        setAiNotice('AI 추천을 받지 못해 기본 계산으로 짰어요.');
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.spots]);

  const handleDeleteSpot = () => {
    if (!deleteTarget) return;
    setSchedule(prev => ({
      ...prev,
      spots: prev.spots.filter(s => s.id !== deleteTarget.id),
      dayPlans: undefined,
    }));
    setDeleteTarget(null);
  };

  const handleSelectMealOption = (chosen: string) => {
    if (!mealEditTarget) return;
    const { day, itemIdx } = mealEditTarget;
    setDayPlans(prev => prev.map(dp =>
      dp.day !== day ? dp : {
        ...dp,
        items: dp.items.map((it, i) => i === itemIdx ? { ...it, options: [chosen] } : it),
      }
    ));
    setMealEditTarget(null);
  };

  const handleSave = () => {
    setSaveModal(false);
    navigation.navigate('Weather', {
      schedule: { ...schedule, dayPlans },
      scheduleName,
    });
  };

  const formatDays = () => {
    const d = schedule.days;
    if (d <= 1) return '당일치기';
    return `${d - 1}박 ${d}일`;
  };

  const renderItem = (day: number, item: TimelineItem, idx: number, isLast: boolean) => {
    const matchedSpot = schedule.spots.find(s => s.name === item.name);
    // AI 일정이 도착하면 화면 일정이 통째로 바뀌므로, 그 전에 한 수정이 사라지지 않도록 대기 중엔 수정을 막는다
    const canEdit = !aiPending &&
      (item.type === 'spot' || (item.type === 'meal' && (item.options?.length ?? 0) > 1));

    const handleEditPress = () => {
      if (item.type === 'spot' && matchedSpot) {
        setDeleteTarget({ id: matchedSpot.id, name: matchedSpot.name });
      } else if (item.type === 'meal' && item.options) {
        setMealEditTarget({ day, itemIdx: idx, options: item.options });
      }
    };

    return (
      <View key={`${item.time}_${idx}`} style={styles.timelineRow}>
        <View style={styles.dotCol}>
          <View style={[styles.dot, { backgroundColor: item.dotColor }]} />
          {!isLast && <View style={styles.connector} />}
        </View>
        <View style={styles.itemContent}>
          <TouchableOpacity
            style={styles.itemMain}
            activeOpacity={item.type === 'spot' && matchedSpot ? 0.6 : 1}
            disabled={!(item.type === 'spot' && matchedSpot)}
            onPress={() => matchedSpot && navigation.navigate('SpotDetail', { spot: matchedSpot })}
          >
            <ItemIcon type={item.type} spotCategory={matchedSpot?.category} />
            <View style={styles.itemText}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.time}
                {item.duration > 0 ? ` · ${item.duration}분` : ''}
                {item.type === 'spot' ? ' · 야외' : ''}
              </Text>
              {item.type === 'meal' && item.options && (
                <Text style={styles.itemMealOpts}>
                  {item.options.join(' / ')}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          {canEdit && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={handleEditPress}
              activeOpacity={0.7}
            >
              <Text style={styles.editBtnText}>수정</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>일정을 만드는 중이에요…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.topSection}>
          <View style={styles.topLeft}>
            <Text style={styles.daysTitle}>{formatDays()}</Text>
            <Text style={styles.daysSub}>
              {schedule.planSource === 'ai' ? 'AI 추천 여행 기간' : '자동 계산 여행 기간'}
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
            <Text style={styles.tagText}>명소 {schedule.spots.length}곳</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{ACCOMMODATION_LABEL[schedule.accommodation]}</Text>
          </View>
        </ScrollView>

        {aiPending ? (
          <View style={styles.aiReasonBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.aiReasonText}>
              AI가 더 나은 동선과 기간을 찾고 있어요. 준비되면 일정이 바뀌어요.
            </Text>
          </View>
        ) : schedule.planSource === 'ai' && schedule.aiReason ? (
          <View style={styles.aiReasonBox}>
            <Ionicons name="sparkles-outline" size={15} color={colors.primary} style={styles.aiReasonIcon} />
            <Text style={styles.aiReasonText}>{schedule.aiReason}</Text>
          </View>
        ) : aiNotice ? (
          <View style={styles.aiReasonBox}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} style={styles.aiReasonIcon} />
            <Text style={styles.aiNoticeText}>{aiNotice}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        {/* 타임라인 */}
        {dayPlans.map(plan => (
          <View key={plan.day} style={styles.daySection}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>DAY {plan.day}</Text>
              {plan.note ? <Text style={styles.dayNote}>{plan.note}</Text> : null}
            </View>
            {plan.items.map((item, idx) =>
              renderItem(plan.day, item, idx, idx === plan.items.length - 1)
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

      {/* 명소 삭제 모달 */}
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>일정에서 삭제할까요?</Text>
            <Text style={styles.modalDesc}>
              {deleteTarget?.name}을(를) 삭제하면 나머지 일정이 자동으로 다시 짜여요.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDanger} onPress={handleDeleteSpot}>
                <Text style={styles.modalSaveText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 식사 옵션 선택 모달 */}
      <Modal visible={!!mealEditTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>식당 선택</Text>
            {mealEditTarget?.options.map(opt => (
              <TouchableOpacity
                key={opt}
                style={styles.optionRow}
                onPress={() => handleSelectMealOption(opt)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionRowText}>{opt}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setMealEditTarget(null)}>
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { fontSize: 13, color: colors.textMuted },
  topSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  topLeft: {},
  daysTitle: { fontSize: 40, fontWeight: '700', color: colors.text, lineHeight: 46 },
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
  aiReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  aiReasonIcon: { marginTop: 2 },
  aiReasonText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text },
  aiNoticeText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl, marginTop: spacing.md },
  daySection: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  dayHeader: { marginBottom: spacing.md },
  dayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  dayNote: { fontSize: 13, lineHeight: 18, color: colors.text, marginTop: 4 },
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
  itemMealOpts: { fontSize: 11, color: colors.warning, marginTop: 3 },
  editBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
    marginTop: 2,
  },
  editBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
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
  modalDesc: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 19 },
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
  modalDanger: {
    flex: 2, height: 44, backgroundColor: colors.danger,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
  },
  optionRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionRowText: { fontSize: 15, color: colors.text, fontWeight: '500' },
});
