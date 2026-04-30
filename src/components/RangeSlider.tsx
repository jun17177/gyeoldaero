import React, { useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { colors } from '../constants/theme';

interface Props {
  min: number;
  max: number;
  low: number;
  high: number;
  onLowChange: (v: number) => void;
  onHighChange: (v: number) => void;
  step?: number;
}

export default function RangeSlider({
  min, max, low, high,
  onLowChange, onHighChange,
  step = 1,
}: Props) {
  const trackWidth = useRef(0);
  const trackX = useRef(0);

  const valueToRatio = (v: number) => (v - min) / (max - min);
  const ratioToValue = (r: number) => {
    const raw = min + r * (max - min);
    return Math.round(raw / step) * step;
  };
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const lowPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        if (!trackWidth.current) return;
        const ratio = (gs.moveX - trackX.current) / trackWidth.current;
        const v = clamp(ratioToValue(ratio));
        if (v < high) onLowChange(v);
      },
    })
  ).current;

  const highPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        if (!trackWidth.current) return;
        const ratio = (gs.moveX - trackX.current) / trackWidth.current;
        const v = clamp(ratioToValue(ratio));
        if (v > low) onHighChange(v);
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
    trackX.current = e.nativeEvent.layout.x;
  };

  const lowPct  = `${valueToRatio(low) * 100}%` as `${number}%`;
  const highPct = `${valueToRatio(high) * 100}%` as `${number}%`;
  const fillLeft  = `${valueToRatio(low) * 100}%` as `${number}%`;
  const fillWidth = `${(valueToRatio(high) - valueToRatio(low)) * 100}%` as `${number}%`;

  const markers = [0, 6, 12, 18, 24];

  return (
    <View>
      <View style={styles.badgeRow}>
        <Text style={styles.badge}>{`${String(low).padStart(2,'0')}:00 ~ ${String(high).padStart(2,'0')}:00`}</Text>
      </View>
      <View style={styles.trackWrapper} onLayout={onLayout}>
        <View style={styles.track}>
          <View style={[styles.fill, { left: fillLeft, width: fillWidth }]} />
        </View>
        <View style={[styles.handle, { left: lowPct }]} {...lowPan.panHandlers} />
        <View style={[styles.handle, { left: highPct }]} {...highPan.panHandlers} />
      </View>
      <View style={styles.markersRow}>
        {markers.map(m => (
          <Text key={m} style={styles.marker}>{m}시</Text>
        ))}
      </View>
    </View>
  );
}

const HANDLE = 22;

const styles = StyleSheet.create({
  badgeRow: { alignItems: 'flex-end', marginBottom: 6 },
  badge: {
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trackWrapper: {
    height: HANDLE + 8,
    justifyContent: 'center',
    marginHorizontal: HANDLE / 2,
  },
  track: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: colors.primary,
    top: -(HANDLE / 2) + 2,
    marginLeft: -(HANDLE / 2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  markersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  marker: { fontSize: 10, color: colors.textMuted },
});
