import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spot } from '../types';
import { colors, spacing, radius, shadows } from '../constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICON: Record<string, IoniconsName> = {
  nature: 'leaf-outline',
  activity: 'bicycle-outline',
  culture: 'business-outline',
  food: 'restaurant-outline',
  photo: 'camera-outline',
  night: 'moon-outline',
};

const CATEGORY_LABEL: Record<Spot['category'], string> = {
  nature: '자연', activity: '액티비티', culture: '문화',
  food: '미식', photo: '사진', night: '야경',
};

interface Props {
  item: Spot;
  isSelected: boolean;
  isThemePick: boolean; // 선택 테마 성격에 부합 → ★ 뱃지
  onPress: (spot: Spot) => void;
}

// 명소 그리드 카드 — 사진(없으면 카테고리 아이콘) + 이름·분류·체류시간 + 뱃지
function SpotCard({ item, isSelected, isThemePick, onPress }: Props) {
  const [failedUri, setFailedUri] = useState<string>();
  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={() => onPress(item)}
      activeOpacity={0.85}
    >
      {isSelected && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={13} color="#fff" />
        </View>
      )}
      <View style={styles.imageArea}>
        {item.imageUrl && failedUri !== item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image}
            onError={() => setFailedUri(item.imageUrl)} />
        ) : (
          <Ionicons name={CATEGORY_ICON[item.category] ?? 'location-outline'} size={38} color={colors.primary} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta}>
          {CATEGORY_LABEL[item.category]} · {item.durationMinutes}분
        </Text>
        {isThemePick && <Text style={styles.themePickLabel}>★ 테마 맞춤</Text>}
        {isSelected && <Text style={styles.selectedLabel}>✓ 담김</Text>}
      </View>
    </TouchableOpacity>
  );
}

// 담김/뱃지/사진이 바뀔 때만 리렌더 — 그리드 스크롤 성능 확보
export default React.memo(SpotCard, (prev, next) =>
  prev.item.id === next.item.id &&
  prev.item.imageUrl === next.item.imageUrl &&
  prev.isSelected === next.isSelected &&
  prev.isThemePick === next.isThemePick
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  cardSelected: { borderColor: colors.primary },
  checkBadge: {
    position: 'absolute',
    top: 8, right: 8,
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  imageArea: {
    height: 80,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: 80 },
  info: { padding: spacing.sm, paddingTop: 6 },
  name: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 2 },
  meta: { fontSize: 10, color: colors.textMuted },
  selectedLabel: { fontSize: 10, color: colors.primary, fontWeight: '600', marginTop: 2 },
  themePickLabel: { fontSize: 10, color: colors.warning, fontWeight: '700', marginTop: 2 },
});
