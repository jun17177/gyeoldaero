import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AiTripSettings, RootStackParamList, TripSettings } from '../types';
import { requestTripSettings } from '../api/tripSettingsApi';
import { PLANNER_API_URL } from '../constants/config';
import { colors, spacing, radius } from '../constants/theme';

type Nav = StackNavigationProp<RootStackParamList, 'AutoSetup'>;

const EXAMPLES = [
  '부모님 모시고 셋이서 가요. 많이 걷긴 힘들고 바다 보면서 쉬고 싶어요',
  '친구랑 둘이서 맛집이랑 카페 위주로, 아침은 늦게 시작하고 싶어요',
  '혼자 백팩 하나로 오름이랑 액티비티 즐기려고요. 첫날 오후 2시 도착',
];

const THEME_LABEL: Record<TripSettings['themes'][number], string> = {
  healing: '힐링', activity: '액티비티', food: '미식',
  culture: '문화탐방', photo: '사진·감성', night: '야경·야간',
};
const SEASON_LABEL: Record<TripSettings['season'], string> = {
  spring: '봄', summer: '여름', fall: '가을', winter: '겨울',
};
const LUGGAGE_LABEL: Record<TripSettings['luggage'], string> = {
  light: '가벼움 (백팩)', medium: '보통 (작은 캐리어)', heavy: '무거움 (큰 캐리어)', very_heavy: '매우 무거움',
};

const hourLabel = (h?: number) => (h === undefined ? '설정 안 함' : `${h}시`);

function settingRows(s: TripSettings): { label: string; value: string }[] {
  return [
    { label: '테마', value: s.themes.map(t => THEME_LABEL[t]).join(', ') },
    { label: '계절', value: SEASON_LABEL[s.season] },
    { label: '활동 시간', value: `${s.startTime}시 ~ ${s.endTime}시` },
    { label: '첫날 도착', value: hourLabel(s.firstDayArrival) },
    { label: '마지막 날 출발', value: hourLabel(s.lastDayDeparture) },
    { label: '인원', value: `${s.people}명` },
    { label: '짐', value: LUGGAGE_LABEL[s.luggage] },
    { label: '하루 교통 예산', value: `${s.budget}만원` },
  ];
}

export default function AutoSetupScreen() {
  const navigation = useNavigation<Nav>();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiTripSettings | null>(null);
  const [failed, setFailed] = useState(false);

  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && !loading && Boolean(PLANNER_API_URL);

  const handleChangeText = (value: string) => {
    setText(value);
    // 입력을 고치면 이전 결과는 더 이상 이 문장의 해석이 아니므로 지운다
    setResult(null);
    setFailed(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setFailed(false);
    const res = await requestTripSettings(trimmed);
    setLoading(false);
    setResult(res);
    setFailed(!res);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>자동 설정</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headline}>어떤 여행을 원하세요?</Text>
          <Text style={styles.subline}>
            누구와, 어떤 분위기로, 짐은 얼마나 — 편하게 적어주세요. AI가 여행 조건을 채워드려요.
          </Text>

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleChangeText}
            placeholder="예: 부모님이랑 셋이서, 많이 걷긴 힘들고 바다 보면서 쉬고 싶어요"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            editable={!loading}
          />

          {!result && (
            <View style={styles.examples}>
              <Text style={styles.examplesLabel}>이렇게 적어도 돼요</Text>
              {EXAMPLES.map(example => (
                <TouchableOpacity
                  key={example}
                  style={styles.exampleChip}
                  onPress={() => handleChangeText(example)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.exampleText}>{example}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {(!PLANNER_API_URL || failed) && (
            <View style={styles.noticeBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
              <View style={styles.flex}>
                <Text style={styles.noticeText}>
                  {PLANNER_API_URL
                    ? '조건을 불러오지 못했어요. 다시 시도하거나 직접 설정으로 진행해주세요.'
                    : 'AI 서버 주소가 설정되지 않아 자동 설정을 쓸 수 없어요.'}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('TravelStyle')}>
                  <Text style={styles.noticeLink}>직접 설정으로 진행 →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {result && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                <Text style={styles.resultTitle}>AI가 이해한 여행</Text>
              </View>
              <Text style={styles.summary}>{result.summary}</Text>
              {settingRows(result.settings).map(row => (
                <View key={row.label} style={styles.row}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          {result ? (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('SpotSelect', { settings: result.settings })}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>이대로 명소 고르기 →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkWrapper}
                onPress={() => navigation.navigate('DetailCondition', { settings: result.settings })}
              >
                <Text style={styles.linkText}>조건 직접 수정하기</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={colors.surface} />
                : <Text style={styles.primaryButtonText}>AI로 조건 채우기</Text>}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { marginRight: spacing.sm, padding: 4 },
  backText: { fontSize: 22, color: colors.text },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subline: { fontSize: 13, lineHeight: 19, color: colors.textMuted, marginBottom: spacing.lg },
  input: {
    minHeight: 120,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
    textAlignVertical: 'top',
  },
  examples: { marginTop: spacing.lg, gap: spacing.sm },
  examplesLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  exampleChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  exampleText: { fontSize: 13, lineHeight: 18, color: colors.primary },
  noticeBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  noticeText: { fontSize: 13, lineHeight: 19, color: colors.text },
  noticeLink: { fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: spacing.xs },
  resultCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  resultTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  summary: { fontSize: 14, lineHeight: 20, color: colors.text, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: { fontSize: 13, color: colors.textMuted },
  rowValue: {
    flexShrink: 1,
    marginLeft: spacing.md,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  bottomBar: {
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
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
  linkWrapper: { alignItems: 'center', marginTop: spacing.md },
  linkText: { fontSize: 13, color: colors.textMuted, textDecorationLine: 'underline' },
});
