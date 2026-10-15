import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SkyCondition } from '../api/weatherApi';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// 날씨 4단계의 아이콘·라벨·색. 날짜 선택 화면과 저장 목록이 같은 모양을 쓰도록 한 곳에 둔다.
export const WEATHER_META: Record<
  SkyCondition,
  { icon: IoniconsName; label: string; color: string; bg: string }
> = {
  sunny:  { icon: 'sunny',        label: '맑음', color: '#F59E0B', bg: '#FFFBEB' },
  cloudy: { icon: 'partly-sunny', label: '구름', color: '#64748B', bg: '#F1F5F9' },
  rainy:  { icon: 'rainy',        label: '비',   color: '#3B82F6', bg: '#EFF6FF' },
  snowy:  { icon: 'snow',         label: '눈',   color: '#93C5FD', bg: '#F0F9FF' },
};
