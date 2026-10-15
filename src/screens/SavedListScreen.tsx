import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import WaveLogo from '../components/WaveLogo';
import { RootStackParamList, TripSchedule } from '../types';
import { loadAllSchedules, deleteSchedule, renameSchedule } from '../storage/scheduleStorage';
import { colors, spacing, radius, shadows, fonts } from '../constants/theme';
import { formatTripRange } from '../utils/date';

type Nav = StackNavigationProp<RootStackParamList, 'SavedList'>;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const THUMB_ICONS: IoniconsName[] = [
  'compass-outline', 'map-outline', 'airplane-outline', 'partly-sunny-outline',
  'leaf-outline', 'moon-outline', 'camera-outline', 'restaurant-outline',
];

const THEME_LABEL: Record<string, string> = {
  healing: '힐링', activity: '액티비티', food: '미식',
  culture: '문화탐방', photo: '사진', night: '야경',
};

function EmptyLogo() {
  return (
    <View style={styles.emptyLogoBox}>
      <WaveLogo variant="primary" scale={0.55} />
    </View>
  );
}

function formatDays(days: number) {
  if (days <= 1) return '당일치기';
  return `${days - 1}박${days}일`;
}

export default function SavedListScreen() {
  const navigation = useNavigation<Nav>();
  const [schedules, setSchedules] = useState<TripSchedule[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadAllSchedules().then(setSchedules);
    }, [])
  );

  // 이름 수정 — 연필 아이콘을 누르면 이름 입력 창을 띄우고, 저장하면 그 일정의 이름만 제자리에서 바꾼다
  const [renameTarget, setRenameTarget] = useState<TripSchedule | null>(null);
  const [renameText, setRenameText] = useState('');

  const openRename = (item: TripSchedule) => {
    setRenameTarget(item);
    setRenameText(item.name);
  };

  const submitRename = async () => {
    if (!renameTarget) return;
    const ok = await renameSchedule(renameTarget.id, renameText).catch(() => false);
    if (!ok) {
      Alert.alert('이름을 바꾸지 못했어요', '이름을 입력했는지 확인하고 다시 시도해주세요.');
      return;
    }
    setRenameTarget(null);
    setSchedules(await loadAllSchedules());
  };

  // 카드 길게 누르면 삭제 (확인 후)
  const handleDelete = (item: TripSchedule) => {
    Alert.alert(
      '일정 삭제',
      `"${item.name}" 일정을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await deleteSchedule(item.id);
            setSchedules(await loadAllSchedules());
          },
        },
      ],
    );
  };

  const renderCard = ({ item, index }: { item: TripSchedule; index: number }) => {
    const thumbIcon = THUMB_ICONS[index % THUMB_ICONS.length];
    const range = formatTripRange(item.startDate, item.days);

    const tags = [
      ...item.settings.themes.map(t => THEME_LABEL[t] ?? t),
      item.settings.season === 'spring' ? '봄' :
      item.settings.season === 'summer' ? '여름' :
      item.settings.season === 'fall'   ? '가을' : '겨울',
    ].slice(0, 3);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('SavedDetail', { schedule: item })}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.85}
      >
        <View style={styles.thumbnailWrap}>
          <View style={styles.thumbnail}>
            <Ionicons name={thumbIcon} size={26} color={colors.primary} />
          </View>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>{formatDays(item.days)}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          {/* 여행 기간: 언제부터 언제까지인지가 카드에서 가장 먼저 보이게 한다 */}
          {range ? (
            <View style={styles.rangeRow}>
              <Ionicons name="calendar" size={13} color={colors.primary} />
              <Text style={styles.rangeText}>{range.start}</Text>
              {range.end && (
                <>
                  <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
                  <Text style={styles.rangeText}>{range.end}</Text>
                </>
              )}
            </View>
          ) : (
            <View style={styles.rangeRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={styles.rangeUnset}>여행 날짜 미정</Text>
            </View>
          )}
          <View style={styles.tagRow}>
            {tags.map(tag => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
        <TouchableOpacity
          style={styles.renameBtn}
          onPress={() => openRename(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`${item.name} 이름 수정`}
        >
          <Ionicons name="create-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {schedules.length > 0 ? (
        <>
          <Text style={styles.title}>저장된 일정</Text>
          <Text style={styles.deleteHint}>연필 아이콘으로 이름을 바꾸고, 카드를 길게 누르면 삭제할 수 있어요</Text>
          <FlatList
            data={schedules}
            keyExtractor={item => item.id}
            renderItem={renderCard}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.title}>저장된 일정</Text>
          <View style={styles.emptyCenter}>
            <EmptyLogo />
            <Text style={styles.emptyTitle}>아직 저장된 일정이 없어요</Text>
            <Text style={styles.emptySub}>당신의 결대로</Text>
            <Text style={styles.emptySub}>여행의 한 페이지를 채워주세요</Text>
          </View>
        </View>
      )}

      <Modal visible={renameTarget !== null} transparent animationType="fade" onRequestClose={() => setRenameTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>일정 이름 수정</Text>
            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="예: 제주 봄 여행"
              placeholderTextColor={colors.textMuted}
              maxLength={30}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={submitRename}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRenameTarget(null)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, !renameText.trim() && styles.modalSaveDisabled]}
                onPress={submitRename}
                disabled={!renameText.trim()}
              >
                <Text style={styles.modalSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>새로운 여행 시작하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 26, // 스펙: Noto Serif KR Bold 26px
    color: colors.text,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  deleteHint: {
    fontSize: 11,
    color: colors.textMuted,
    paddingHorizontal: spacing.xl,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  thumbnailWrap: { position: 'relative', marginRight: spacing.md },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dayBadgeText: { color: '#fff', fontSize: 8.5, fontWeight: '700' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  rangeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  rangeUnset: { fontSize: 12, color: colors.textMuted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tagChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { fontSize: 10, color: colors.primary, fontWeight: '500' },
  arrow: { fontSize: 22, color: colors.border, marginLeft: spacing.sm },
  renameBtn: { padding: 4, marginLeft: spacing.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalBox: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  modalBtns: { flexDirection: 'row', gap: spacing.sm },
  modalCancel: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { color: colors.textMuted, fontWeight: '600' },
  modalSave: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveDisabled: { opacity: 0.4 },
  modalSaveText: { color: '#fff', fontWeight: '700' },
  emptyContainer: { flex: 1 },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyLogoBox: { alignItems: 'center', marginBottom: spacing.md },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySub: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: spacing.xl,
    paddingBottom: spacing.xl + 4,
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
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
