import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, DayPlan, TimelineItem } from '../types';
import { generateTimeline } from '../algorithms/generateTimeline';
import { colors, spacing, radius } from '../constants/theme';

type Nav = StackNavigationProp<RootStackParamList, 'BusinessHours'>;
type Route = RouteProp<RootStackParamList, 'BusinessHours'>;

const SEARCH_URL = (name: string) =>
  `https://map.kakao.com/link/search/${encodeURIComponent(name + ' 제주')}`;

function LinkButton({ url }: { url: string }) {
  return (
    <TouchableOpacity
      style={styles.linkBtn}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.75}
    >
      <Ionicons name="link-outline" size={16} color="#fff" />
    </TouchableOpacity>
  );
}

export default function BusinessHoursScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { schedule } = route.params;

  const [dayPlans, setDayPlans] = useState<DayPlan[]>(schedule.dayPlans ?? []);
  const [loading, setLoading] = useState(!schedule.dayPlans?.length);

  useEffect(() => {
    if (schedule.dayPlans?.length) {
      setDayPlans(schedule.dayPlans);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    generateTimeline(schedule)
      .then(plans => {
        if (!cancelled) {
          setDayPlans(plans);
          setLoading(false);
        }
      })
      .catch(e => {
        // 실패해도 로딩 화면엔 빠져나갈 수단이 없으므로 이전 화면으로 되돌려준다
        console.error('[BusinessHours] 일정 생성 실패:', e);
        if (cancelled) return;
        setLoading(false);
        Alert.alert('불러오기 실패', '정보를 불러오지 못했어요. 다시 시도해 주세요.');
        navigation.goBack();
      });
    return () => { cancelled = true; };
  }, [schedule, navigation]);

  const renderItem = (item: TimelineItem, idx: number, isLast: boolean) => {
    // 사용자가 고른 식당만 실제 장소로 취급 — 후보만 있고 선택 전이면 미확정 상태
    const chosenRestaurant = item.type === 'meal' ? item.selectedOption ?? null : null;
    // '이동'·'숙소 출발/복귀' 등은 실제 장소가 아니라 검색 링크가 무의미하므로 표시하지 않음
    const showLink = item.type === 'spot' || !!chosenRestaurant;
    const url = item.linkUrl ?? SEARCH_URL(chosenRestaurant ?? item.name);

    return (
      <View key={`${item.time}_${idx}`} style={styles.timelineRow}>
        <View style={styles.dotCol}>
          <View style={[styles.dot, { backgroundColor: item.dotColor }]} />
          {!isLast && <View style={styles.connector} />}
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemMain}>
            <View style={styles.itemText}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.time}{item.duration > 0 ? ` · ${item.duration}분` : ''}
              </Text>
              {chosenRestaurant && (
                <Text style={styles.itemRestaurant}>{chosenRestaurant}</Text>
              )}
            </View>
          </View>
          {showLink && <LinkButton url={url} />}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* 헤더 */}
      <View style={styles.heroHeader}>
        <Text style={styles.heroTitle}>바로가기</Text>
        <Text style={styles.heroDesc}>
          정확한 위치나 영업중을 확인하려면{'\n'}아래 링크 버튼을 눌러주세요
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {dayPlans.map(plan => (
          <View key={plan.day} style={styles.daySection}>
            <Text style={styles.dayLabel}>DAY {plan.day}</Text>
            {plan.items.map((item, idx) =>
              renderItem(item, idx, idx === plan.items.length - 1)
            )}
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.backBtnText}>뒤로가기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: spacing.sm },
  heroDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  daySection: { marginBottom: spacing.md },
  dayLabel: {
    fontSize: 12, fontWeight: '700',
    color: colors.textMuted, letterSpacing: 1,
    marginBottom: spacing.md,
  },
  timelineRow: { flexDirection: 'row', minHeight: 52 },
  dotCol: { width: 20, alignItems: 'center', paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  connector: { flex: 1, width: 1.5, backgroundColor: colors.border, marginTop: 4 },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  itemMain: { flex: 1 },
  itemText: {},
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  itemRestaurant: { fontSize: 12, fontWeight: '600', color: colors.warning, marginTop: 3 },
  linkBtn: {
    backgroundColor: colors.primary,
    width: 36, height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: spacing.xl,
    paddingBottom: spacing.xl + 4,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backBtn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
