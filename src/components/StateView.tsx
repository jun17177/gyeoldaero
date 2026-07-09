import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  variant: 'loading' | 'empty' | 'error';
  title?: string;
  message?: string;
  icon?: IoniconsName;
  onRetry?: () => void;
  retryLabel?: string;
}

const DEFAULT_ICON: Record<'empty' | 'error', IoniconsName> = {
  empty: 'search-outline',
  error: 'cloud-offline-outline',
};

// 로딩·빈 결과·에러를 일관된 형태로 보여주는 공통 상태 뷰.
// 부모가 flex:1 컨테이너를 주면 화면 중앙에, 리스트 ListEmptyComponent로 쓰면 그 자리에 표시된다.
export default function StateView({ variant, title, message, icon, onRetry, retryLabel }: Props) {
  return (
    <View style={styles.wrap}>
      {variant === 'loading' ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <Ionicons
          name={icon ?? DEFAULT_ICON[variant]}
          size={40}
          color={variant === 'error' ? colors.danger : colors.textMuted}
        />
      )}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
          <Ionicons name="refresh" size={16} color={colors.primary} />
          <Text style={styles.retryText}>{retryLabel ?? '다시 시도'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  message: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  retryText: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
