import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, TripSettings } from '../types';
import RangeSlider from '../components/RangeSlider';
import { colors, spacing, radius } from '../constants/theme';

type Nav = StackNavigationProp<RootStackParamList, 'DetailCondition'>;
type Route = RouteProp<RootStackParamList, 'DetailCondition'>;

const ARRIVAL_TIMES = [
  { label: '설정 안 함', value: undefined },
  { label: '오전 9시',   value: 9  },
  { label: '오전 10시',  value: 10 },
  { label: '오전 11시',  value: 11 },
  { label: '오후 12시',  value: 12 },
  { label: '오후 1시',   value: 13 },
  { label: '오후 2시',   value: 14 },
  { label: '오후 3시',   value: 15 },
  { label: '오후 4시',   value: 16 },
  { label: '오후 5시',   value: 17 },
];

const DEPARTURE_TIMES = [
  { label: '설정 안 함', value: undefined },
  { label: '오전 9시',   value: 9  },
  { label: '오전 10시',  value: 10 },
  { label: '오전 11시',  value: 11 },
  { label: '오후 12시',  value: 12 },
  { label: '오후 1시',   value: 13 },
  { label: '오후 2시',   value: 14 },
  { label: '오후 3시',   value: 15 },
  { label: '오후 4시',   value: 16 },
  { label: '오후 5시',   value: 17 },
];

const LUGGAGE_OPTIONS: { id: TripSettings['luggage']; label: string; sub: string; dots: number }[] = [
  { id: 'light',      label: '가벼움', sub: '백팩',       dots: 1 },
  { id: 'medium',     label: '보통',   sub: '작은 캐리어', dots: 2 },
  { id: 'heavy',      label: '무거움', sub: '큰 캐리어',  dots: 3 },
  { id: 'very_heavy', label: '매우무거움', sub: '초대형',  dots: 4 },
];

function StepDots({ active }: { active: 1 | 2 }) {
  return (
    <View style={styles.dotsRow}>
      <View style={[styles.dash, active === 1 && styles.dashActive]} />
      <View style={[styles.dash, active === 2 && styles.dashActive]} />
    </View>
  );
}

function DotPattern({ count }: { count: number }) {
  return (
    <View style={styles.dotPattern}>
      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
        <View key={i} style={styles.dotDot} />
      ))}
      {count === 4 && (
        <View style={styles.dotRow2}>
          <View style={styles.dotDot} />
          <View style={styles.dotDot} />
        </View>
      )}
    </View>
  );
}

function TimePickerModal({
  visible,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  options: { label: string; value: number | undefined }[];
  selected: number | undefined;
  onSelect: (v: number | undefined) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <FlatList
            data={options}
            keyExtractor={item => String(item.value)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, selected === item.value && styles.modalItemActive]}
                onPress={() => { onSelect(item.value); onClose(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalItemText, selected === item.value && styles.modalItemTextActive]}>
                  {item.label}
                </Text>
                {selected === item.value && <Text style={styles.modalCheck}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function DetailConditionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const prevSettings = route.params?.settings ?? {};

  const [startTime, setStartTime] = useState(9);
  const [endTime, setEndTime]     = useState(19);
  const [arrival, setArrival]     = useState<number | undefined>(undefined);
  const [departure, setDeparture] = useState<number | undefined>(undefined);
  const [people, setPeople]       = useState(2);
  const [budget, setBudget]       = useState(1);
  const [luggage, setLuggage]     = useState<TripSettings['luggage']>('light');
  const [arrivalModal, setArrivalModal]   = useState(false);
  const [departureModal, setDepartureModal] = useState(false);

  const firstDayHours = arrival !== undefined ? endTime - arrival : endTime - startTime;

  const buildSettings = (): TripSettings => ({
    themes:            prevSettings.themes  ?? ['healing'],
    weather:           prevSettings.weather ?? 'sunny',
    season:            prevSettings.season  ?? 'spring',
    startTime,
    endTime,
    firstDayArrival:   arrival,
    lastDayDeparture:  departure,
    people,
    budget,
    luggage,
  });

  const formatTimeLabel = (v: number | undefined) =>
    v === undefined
      ? '설정 안 함'
      : v < 12
        ? `오전 ${v}시`
        : v === 12
          ? '오후 12시'
          : `오후 ${v - 12}시`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>세부 조건</Text>
        <StepDots active={2} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 활동 시간대 */}
        <View style={styles.section}>
          <Text style={styles.sectionIcon}>⏰</Text>
          <Text style={styles.sectionLabel}>활동 시간대</Text>
        </View>
        <View style={styles.sliderCard}>
          <RangeSlider
            min={0} max={24}
            low={startTime} high={endTime}
            onLowChange={setStartTime}
            onHighChange={setEndTime}
          />
        </View>

        {/* 도착 / 출발 */}
        <View style={styles.twoCol}>
          <TouchableOpacity style={styles.timeCard} onPress={() => setArrivalModal(true)} activeOpacity={0.8}>
            <Text style={styles.timeCardIcon}>🛬</Text>
            <Text style={styles.timeCardTitle}>첫날 도착 시간</Text>
            <Text style={styles.timeCardSub}>이 시간부터 활동 시작</Text>
            <Text style={styles.timeCardValue}>{formatTimeLabel(arrival)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.timeCard} onPress={() => setDepartureModal(true)} activeOpacity={0.8}>
            <Text style={styles.timeCardIcon}>🛫</Text>
            <Text style={styles.timeCardTitle}>마지막날 출발</Text>
            <Text style={styles.timeCardSub}>이 시간까지만 활동</Text>
            <Text style={styles.timeCardValue}>{formatTimeLabel(departure)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            ⏱ 첫날 가용시간 {firstDayHours}시간
            {arrival !== undefined ? ` (${formatTimeLabel(arrival)} 도착 기준)` : ''}
          </Text>
        </View>

        {/* 인원 / 예산 */}
        <View style={styles.twoCol}>
          <View style={styles.counterBlock}>
            <Text style={styles.counterTitle}>인원</Text>
            <Text style={styles.counterSub}>동행 인원</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity onPress={() => setPeople(p => Math.max(1, p - 1))} style={styles.countBtn}>
                <Text style={styles.countBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.countValue}>{people} 명</Text>
              <TouchableOpacity onPress={() => setPeople(p => Math.min(20, p + 1))} style={styles.countBtn}>
                <Text style={styles.countBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.counterBlock}>
            <Text style={styles.counterTitle}>예산</Text>
            <Text style={styles.counterSub}>하루 교통 예산</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity onPress={() => setBudget(b => Math.max(1, b - 1))} style={styles.countBtn}>
                <Text style={styles.countBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.countValue}>{budget} 만원</Text>
              <TouchableOpacity onPress={() => setBudget(b => Math.min(50, b + 1))} style={styles.countBtn}>
                <Text style={styles.countBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 짐 무게 */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          짐 무게
        </Text>
        <View style={styles.luggageRow}>
          {LUGGAGE_OPTIONS.map(opt => {
            const active = luggage === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.luggageCard, active && styles.luggageCardActive]}
                onPress={() => setLuggage(opt.id)}
                activeOpacity={0.8}
              >
                <DotPattern count={opt.dots} />
                <Text style={[styles.luggageLabel, active && styles.luggageLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={[styles.luggageSub, active && styles.luggageSubActive]}>
                  {opt.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('SpotSelect', { settings: buildSettings() })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>명소 선택하기 →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('SpotSelect', { settings: buildSettings() })}
          style={styles.skipWrapper}
        >
          <Text style={styles.skipText}>기본값으로 건너뛰기</Text>
        </TouchableOpacity>
      </View>

      <TimePickerModal
        visible={arrivalModal}
        options={ARRIVAL_TIMES}
        selected={arrival}
        onSelect={setArrival}
        onClose={() => setArrivalModal(false)}
      />
      <TimePickerModal
        visible={departureModal}
        options={DEPARTURE_TIMES}
        selected={departure}
        onSelect={setDeparture}
        onClose={() => setDepartureModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: { marginRight: spacing.sm, padding: 4 },
  backText: { fontSize: 22, color: colors.text },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 },
  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dash: { width: 18, height: 3, borderRadius: 2, backgroundColor: colors.border },
  dashActive: { backgroundColor: colors.primary, width: 28 },
  scroll: { paddingHorizontal: spacing.xl },
  section: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionIcon: { fontSize: 14 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  sliderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  twoCol: { flexDirection: 'row', gap: 10, marginBottom: spacing.sm },
  timeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  timeCardIcon: { fontSize: 20, marginBottom: 4 },
  timeCardTitle: { fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 2 },
  timeCardSub: { fontSize: 10, color: colors.textMuted, marginBottom: 8 },
  timeCardValue: { fontSize: 16, fontWeight: '700', color: colors.primary },
  hintBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  hintText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
  counterBlock: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  counterTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  counterSub: { fontSize: 10, color: colors.textMuted, marginBottom: spacing.sm },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  countBtnText: { fontSize: 16, color: colors.primary, fontWeight: '600', lineHeight: 20 },
  countValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  luggageRow: { flexDirection: 'row', gap: 8 },
  luggageCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
    minHeight: 88,
    justifyContent: 'center',
  },
  luggageCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotPattern: { flexDirection: 'row', gap: 3, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'center', width: 28 },
  dotRow2: { flexDirection: 'row', gap: 3, width: '100%', justifyContent: 'center' },
  dotDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted },
  luggageLabel: { fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: 1 },
  luggageLabelActive: { color: '#fff' },
  luggageSub: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  luggageSubActive: { color: 'rgba(255,255,255,0.75)' },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: spacing.xl,
    paddingBottom: spacing.xl + 8,
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
    marginBottom: spacing.sm,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipWrapper: { alignItems: 'center', paddingVertical: spacing.sm },
  skipText: { fontSize: 13, color: colors.textMuted, textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.md,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  modalItemActive: { backgroundColor: colors.primaryLight },
  modalItemText: { fontSize: 15, color: colors.text },
  modalItemTextActive: { color: colors.primary, fontWeight: '700' },
  modalCheck: { color: colors.primary, fontWeight: '700', fontSize: 16 },
});
