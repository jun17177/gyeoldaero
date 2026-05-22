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

const HANDLE_VISUAL = 26;
const HANDLE_HIT    = 44;

export default function RangeSlider({
  min, max, low, high,
  onLowChange, onHighChange,
  step = 1,
}: Props) {
  const trackWidth = useRef(0);

  // Always-current value refs — PanResponder closure reads these, not stale props
  const lowRef        = useRef(low);
  const highRef       = useRef(high);
  const onLowRef      = useRef(onLowChange);
  const onHighRef     = useRef(onHighChange);
  lowRef.current      = low;
  highRef.current     = high;
  onLowRef.current    = onLowChange;
  onHighRef.current   = onHighChange;

  const snap = (v: number) =>
    Math.max(min, Math.min(max, Math.round(v / step) * step));

  // dx-based approach: capture start value on grant, add delta on move.
  // No absolute screen coordinates needed — trackWidth alone is enough.
  const makePan = (which: 'low' | 'high') => {
    let startValue = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        startValue = which === 'low' ? lowRef.current : highRef.current;
      },
      onPanResponderMove: (_, gs) => {
        if (!trackWidth.current) return;
        const delta = (gs.dx / trackWidth.current) * (max - min);
        const v = snap(startValue + delta);
        if (which === 'low'  && v < highRef.current) onLowRef.current(v);
        if (which === 'high' && v > lowRef.current)  onHighRef.current(v);
      },
    });
  };

  const lowPan  = useRef(makePan('low')).current;
  const highPan = useRef(makePan('high')).current;

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  const valueToRatio = (v: number) => (v - min) / (max - min);
  const lowPct  = valueToRatio(low)  * 100;
  const highPct = valueToRatio(high) * 100;

  const markers = [0, 6, 12, 18, 24];

  return (
    <View>
      <View style={styles.badgeRow}>
        <Text style={styles.badge}>
          {`${String(low).padStart(2, '0')}:00 ~ ${String(high).padStart(2, '0')}:00`}
        </Text>
      </View>

      <View style={styles.trackWrapper} onLayout={onLayout}>
        <View style={styles.track}>
          <View style={[
            styles.fill,
            {
              left:  `${lowPct}%`  as `${number}%`,
              width: `${highPct - lowPct}%` as `${number}%`,
            },
          ]} />
        </View>

        <View
          style={[styles.handleHit, { left: `${lowPct}%` as `${number}%` }]}
          {...lowPan.panHandlers}
        >
          <View style={styles.handleVisual} />
        </View>

        <View
          style={[styles.handleHit, { left: `${highPct}%` as `${number}%` }]}
          {...highPan.panHandlers}
        >
          <View style={styles.handleVisual} />
        </View>
      </View>

      <View style={styles.markersRow}>
        {markers.map(m => (
          <Text key={m} style={styles.marker}>{m}시</Text>
        ))}
      </View>
    </View>
  );
}

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
    height: HANDLE_HIT,
    justifyContent: 'center',
    marginHorizontal: HANDLE_HIT / 2,
  },
  track: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  fill: {
    position: 'absolute',
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  handleHit: {
    position: 'absolute',
    width: HANDLE_HIT,
    height: HANDLE_HIT,
    marginLeft: -(HANDLE_HIT / 2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleVisual: {
    width: HANDLE_VISUAL,
    height: HANDLE_VISUAL,
    borderRadius: HANDLE_VISUAL / 2,
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  marker: { fontSize: 10, color: colors.textMuted },
});
