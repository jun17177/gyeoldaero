import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spot } from '../types';
import { colors, spacing, radius } from '../constants/theme';

// AI 추천 줄. 화면 안에서 함수로 만들어 ListHeaderComponent에 넘기면
// 렌더마다 컴포넌트 타입이 바뀌어 React가 통째로 다시 마운트하고,
// 그때 가로 스크롤이 맨 앞으로 돌아간다 (명소를 담을 때마다 추천이 처음으로 튀던 원인).
// 모듈 최상단에 두고 memo로 감싸 위치를 유지한다.
const AiRecommendations = React.memo(function AiRecommendations({
  loading, recs, summary, selectedIds, onToggle,
}: {
  loading: boolean;
  recs: { spot: Spot; reason: string }[];
  summary: string;
  selectedIds: ReadonlySet<string>;
  onToggle: (spot: Spot) => void;
}) {
  if (!loading && recs.length === 0) return null;
  return (
    <View style={styles.aiSection}>
      <View style={styles.aiTitleRow}>
        <Ionicons name="sparkles" size={14} color={colors.primary} />
        <Text style={styles.aiTitle}>AI 맞춤 추천</Text>
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>
      {!!summary && <Text style={styles.aiSummary}>{summary}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {recs.map(({ spot, reason }) => {
          const isSelected = selectedIds.has(spot.id);
          return (
            <TouchableOpacity
              key={spot.id}
              style={[styles.aiCard, isSelected && styles.aiCardSelected]}
              onPress={() => onToggle(spot)}
              activeOpacity={0.85}
            >
              <View style={styles.aiCardHeader}>
                <Text style={styles.aiCardName} numberOfLines={1}>{spot.name}</Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                )}
              </View>
              <Text style={styles.aiCardReason} numberOfLines={2}>{reason}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  aiSection: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  aiSummary: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  aiCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginRight: spacing.sm,
    width: 170,
  },
  aiCardSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  aiCardName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  aiCardReason: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
});

export default AiRecommendations;
