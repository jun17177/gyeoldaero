import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { fetchSpotDetail, SpotDetailInfo } from '../api/tourApi';
import { colors, spacing, radius, shadows } from '../constants/theme';

type Nav = StackNavigationProp<RootStackParamList, 'SpotDetail'>;
type Route = RouteProp<RootStackParamList, 'SpotDetail'>;
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICON: Record<string, IoniconsName> = {
  nature:   'leaf-outline',
  activity: 'bicycle-outline',
  culture:  'business-outline',
  food:     'restaurant-outline',
  photo:    'camera-outline',
  night:    'moon-outline',
};

const CATEGORY_LABEL: Record<string, string> = {
  nature: '자연', activity: '액티비티', culture: '문화',
  food: '미식', photo: '사진·감성', night: '야경',
};

const kakaoMapSearchUrl = (name: string) =>
  `https://map.kakao.com/link/search/${encodeURIComponent(name + ' 제주')}`;

export default function SpotDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { spot } = route.params;

  const [detail, setDetail] = useState<SpotDetailInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSpotDetail(spot.id, spot.contentTypeId)
      .then(result => { if (!cancelled) setDetail(result); })
      .catch(() => { if (!cancelled) setDetail(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [spot.id, spot.contentTypeId]);

  const hasAnyInfo = !!(detail?.overview || detail?.tel || detail?.homepage || detail?.businessHours);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroArea}>
          {spot.imageUrl ? (
            <Image source={{ uri: spot.imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name={CATEGORY_ICON[spot.category] ?? 'location-outline'} size={56} color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{spot.name}</Text>
          <Text style={styles.meta}>
            {CATEGORY_LABEL[spot.category] ?? spot.category} · 평균 {spot.durationMinutes}분 소요
          </Text>

          {spot.tags.length > 0 && (
            <View style={styles.tagRow}>
              {spot.tags.map(t => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <>
              {detail?.overview && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>소개</Text>
                  <Text style={styles.overviewText}>{detail.overview}</Text>
                </View>
              )}

              {detail?.businessHours && (
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.infoText}>{detail.businessHours}</Text>
                </View>
              )}

              {detail?.tel && (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => Linking.openURL(`tel:${detail.tel}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={18} color={colors.textMuted} />
                  <Text style={[styles.infoText, styles.infoLink]}>{detail.tel}</Text>
                </TouchableOpacity>
              )}

              {detail?.homepage && (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => Linking.openURL(detail.homepage!)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="globe-outline" size={18} color={colors.textMuted} />
                  <Text style={[styles.infoText, styles.infoLink]} numberOfLines={1}>{detail.homepage}</Text>
                </TouchableOpacity>
              )}

              {!hasAnyInfo && (
                <Text style={styles.emptyText}>
                  등록된 상세 정보(영업시간·연락처)가 없어요. 아래 카카오맵에서 최신 정보와 방문자 후기를 확인해보세요.
                </Text>
              )}
            </>
          )}

          <TouchableOpacity
            style={styles.kakaoBtn}
            onPress={() => Linking.openURL(kakaoMapSearchUrl(spot.name))}
            activeOpacity={0.85}
          >
            <Ionicons name="map-outline" size={16} color="#fff" />
            <Text style={styles.kakaoBtnText}>카카오맵에서 후기·상세 보기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  scroll: { paddingBottom: spacing.xxl },
  heroArea: { width: '100%', height: 220, backgroundColor: colors.primaryLight },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  name: { fontSize: 24, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  tag: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  loadingBox: { paddingVertical: spacing.xl, alignItems: 'center' },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  overviewText: { fontSize: 14, color: colors.text, lineHeight: 21 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  infoText: { fontSize: 14, color: colors.text, flex: 1 },
  infoLink: { color: colors.primary, fontWeight: '600' },
  emptyText: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },
  kakaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
  },
  kakaoBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
