import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, DayPlan, TimelineItem } from '../types';
import { generateTimeline } from '../algorithms/generateTimeline';

import { colors, spacing, radius } from '../constants/theme';

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
  const { schedule } = route.params;

  const [saveModal, setSaveModal] = useState(false);
  const [scheduleName, setScheduleName] = useState('제주 여행');

  const dayPlans: DayPlan[] = useMemo(() =>
    schedule.dayPlans?.length ? schedule.dayPlans : generateTimeline(schedule),
  [schedule]);

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
    return `${d}박 ${d + 1}일`;
  };

  const renderItem = (item: TimelineItem, idx: number, isLast: boolean) => {
    const spotCategory = schedule.spots.find(s => s.name === item.name)?.category;
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
                <Text style={styles.itemMealOpts}>
                  {item.options.join(' / ')}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <Text style={styles.editBtnText}>수정</Text>
          </TouchableOpacity>
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
            <Text style={styles.daysSub}>AI 추천 여행 기간</Text>
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

        <View style={styles.divider} />

        {/* 타임라인 */}
        {dayPlans.map(plan => (
          <View key={plan.day} style={styles.daySection}>
            <Text style={styles.dayLabel}>DAY {plan.day}</Text>
            {plan.items.map((item, idx) =>
              renderItem(item, idx, idx === plan.items.length - 1)
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
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl, marginTop: spacing.md },
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
