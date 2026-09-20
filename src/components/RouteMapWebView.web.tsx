import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';

// 웹 전용 대체 화면. Expo가 웹 빌드에서 이 파일을 RouteMapWebView 대신 쓴다.
// react-native-webview는 네이티브 전용이라 웹에서는 동작하지 않으므로,
// 지도 대신 방문 순서를 보여주고 네이버 지도로 넘어가는 링크를 준다.

export interface RoutePoint {
  label: string;
  name: string;
  lat: number;
  lon: number;
  kind: 'spot' | 'accommodation';
}

interface Props {
  points: RoutePoint[];
  routePath?: { lat: number; lon: number }[];
}

const naverUrl = (p: RoutePoint) =>
  `https://map.naver.com/p/search/${encodeURIComponent(p.name)}`;

export default function RouteMapWebViewWeb({ points }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.notice}>
        <Ionicons name="phone-portrait-outline" size={14} color={colors.primary} />
        <Text style={styles.noticeText}>
          지도는 앱에서 볼 수 있어요. 여기서는 방문 순서로 보여드려요.
        </Text>
      </View>

      {points.map((p, i) => (
        <TouchableOpacity
          key={`${p.label}-${i}`}
          style={styles.row}
          onPress={() => Linking.openURL(naverUrl(p))}
          activeOpacity={0.75}
        >
          <View style={[styles.pin, p.kind === 'accommodation' && styles.pinAccom]}>
            <Text style={styles.pinText}>{p.label}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
          <Ionicons name="open-outline" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  noticeText: { flex: 1, fontSize: 12, color: colors.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pin: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  pinAccom: { backgroundColor: colors.teal },
  pinText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  name: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
});
