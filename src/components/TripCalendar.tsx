import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { buildMonthGrid, dayKey, isInTripRange, isSameDay, shiftMonth, addDays } from '../utils/calendar';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  tripDays: number;            // 총 일수 (2 = 1박 2일) — 출발일을 고르면 이만큼 칠해진다
  selectedStart: Date | null;
  onSelect: (date: Date) => void;
  minDate: Date;               // 이 날짜 전은 선택 불가 (보통 오늘)
  maxDate: Date;               // 이 날짜 뒤는 선택 불가
}

// 여행 출발일을 고르는 월 달력. 출발일을 탭하면 여행 기간 전체가 구간으로 칠해진다
// (날씨 화면의 예보 카드와 같은 방식). 색·간격·폰트는 모두 theme.ts 토큰을 쓴다.
export default function TripCalendar({ tripDays, selectedStart, onSelect, minDate, maxDate }: Props) {
  const initial = selectedStart ?? minDate;
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const today = new Date();
  const weeks = buildMonthGrid(view.year, view.month);

  // 선택 가능한 첫 달·마지막 달에서는 해당 방향 이동을 막는다
  const monthIdx = (y: number, m: number) => y * 12 + m;
  const canPrev = monthIdx(view.year, view.month) > monthIdx(minDate.getFullYear(), minDate.getMonth());
  const canNext = monthIdx(view.year, view.month) < monthIdx(maxDate.getFullYear(), maxDate.getMonth());
  const move = (delta: number) => setView(v => shiftMonth(v.year, v.month, delta));

  const endDate = selectedStart ? addDays(selectedStart, Math.max(tripDays, 1) - 1) : null;

  return (
    <View>
      {/* 월 이동 */}
      <View style={styles.monthRow}>
        <TouchableOpacity
          onPress={() => move(-1)}
          disabled={!canPrev}
          style={[styles.navBtn, !canPrev && styles.navBtnDisabled]}
          accessibilityLabel="이전 달"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{view.year}년 {view.month + 1}월</Text>
        <TouchableOpacity
          onPress={() => move(1)}
          disabled={!canNext}
          style={[styles.navBtn, !canNext && styles.navBtnDisabled]}
          accessibilityLabel="다음 달"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* 요일 */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={w} style={[styles.weekday, i === 0 && styles.sunday, i === 6 && styles.saturday]}>{w}</Text>
        ))}
      </View>

      {/* 날짜 격자 */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((date, di) => {
            if (!date) return <View key={di} style={styles.cell} />;

            const disabled = dayKey(date) < dayKey(minDate) || dayKey(date) > dayKey(maxDate);
            const inRange = isInTripRange(date, selectedStart, tripDays);
            const isStart = selectedStart !== null && isSameDay(date, selectedStart);
            const isEnd = endDate !== null && isSameDay(date, endDate);
            const isToday = isSameDay(date, today);
            const edge = isStart || isEnd;

            return (
              <TouchableOpacity
                key={di}
                style={styles.cell}
                disabled={disabled}
                onPress={() => onSelect(date)}
                activeOpacity={0.7}
                accessibilityLabel={`${date.getMonth() + 1}월 ${date.getDate()}일${isStart ? ' 출발' : ''}${isEnd && !isStart ? ' 도착' : ''}`}
              >
                {/* 구간 띠: 시작·끝은 반쪽만 칠해 이어지는 모양으로 보이게 한다 */}
                {inRange && !(isStart && isEnd) && (
                  <View
                    style={[
                      styles.band,
                      isStart && styles.bandStart,
                      isEnd && styles.bandEnd,
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.dayCircle,
                    inRange && !edge && styles.dayCircleRange,
                    isStart && styles.dayCircleStart,
                    isEnd && !isStart && styles.dayCircleEnd,
                    isToday && !edge && styles.dayCircleToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      di === 0 && styles.sunday,
                      di === 6 && styles.saturday,
                      inRange && !edge && styles.dayTextRange,
                      edge && styles.dayTextEdge,
                      disabled && styles.dayTextDisabled,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL = 44;

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  // 명조체(serifBold)는 이 화면의 다른 글자(고딕 계열)와 어울리지 않아 쓰지 않는다
  monthTitle: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },

  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    paddingBottom: spacing.sm,
  },
  sunday: { color: colors.danger },
  saturday: { color: '#3B82F6' },

  cell: { flex: 1, height: CELL, alignItems: 'center', justifyContent: 'center' },
  // 구간 띠 — 셀 전체 너비로 이어 붙인다 (시작은 오른쪽 절반, 끝은 왼쪽 절반)
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 34,
    backgroundColor: colors.primaryLight,
  },
  bandStart: { left: '50%' },
  bandEnd: { right: '50%' },

  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleRange: { backgroundColor: 'transparent' },
  dayCircleStart: { backgroundColor: colors.primaryDark },
  dayCircleEnd: { backgroundColor: colors.primary },
  dayCircleToday: { borderWidth: 1.5, borderColor: colors.primary },

  dayText: { fontSize: 15, color: colors.text, fontWeight: '500' },
  dayTextRange: { color: colors.primary, fontWeight: '700' },
  dayTextEdge: { color: '#fff', fontWeight: '700' },
  dayTextDisabled: { color: colors.border, fontWeight: '400' },
});
