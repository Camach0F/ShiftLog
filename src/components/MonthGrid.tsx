import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addMonths, formatMonth, fromKey, monthGrid, todayKey, weekdayLabels } from '@/lib/dates';
import { useTheme } from '@/lib/theme';

/** Month calendar: navigation bar, weekday header and day cells whose content the caller renders. */
export function MonthGrid({
  anchor,
  onAnchorChange,
  weekStartsOn,
  onPressDay,
  selected,
  renderDay,
  belowBar,
}: {
  anchor: string;
  onAnchorChange: (key: string) => void;
  weekStartsOn: number;
  onPressDay: (key: string) => void;
  /** Days drawn as selected */
  selected?: Set<string>;
  /** Content shown under the day number */
  renderDay?: (key: string) => ReactNode;
  /** Shown between the month bar and the weekday header */
  belowBar?: ReactNode;
}) {
  const t = useTheme();
  const today = todayKey();
  const month = anchor.slice(0, 7);
  const days = monthGrid(anchor, weekStartsOn);

  return (
    <View>
      <View style={styles.monthBar}>
        <Pressable accessibilityLabel="Mes anterior" hitSlop={12} onPress={() => onAnchorChange(addMonths(anchor, -1))}>
          <Ionicons name="chevron-back" size={26} color={t.accent} />
        </Pressable>
        <Pressable onPress={() => onAnchorChange(today)}>
          <Text style={[styles.monthTitle, { color: t.text }]}>{formatMonth(anchor)}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Mes siguiente" hitSlop={12} onPress={() => onAnchorChange(addMonths(anchor, 1))}>
          <Ionicons name="chevron-forward" size={26} color={t.accent} />
        </Pressable>
      </View>

      {belowBar}

      <View style={styles.row}>
        {weekdayLabels(weekStartsOn).map((label) => (
          <Text key={label} style={[styles.weekday, { color: t.sub }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((key) => {
          const isToday = key === today;
          const isSelected = selected?.has(key) ?? false;
          return (
            <Pressable
              key={key}
              onPress={() => onPressDay(key)}
              style={[
                styles.cell,
                { borderColor: t.border, opacity: key.startsWith(month) ? 1 : 0.35 },
                isSelected && { backgroundColor: t.accent + '33' },
              ]}
            >
              <View style={[styles.dayBadge, isToday && { backgroundColor: t.accent }, isSelected && { borderWidth: 2, borderColor: t.accent }]}>
                <Text style={{ color: isToday ? t.onAccent : t.text, fontWeight: '600' }}>{fromKey(key).getDate()}</Text>
              </View>
              {renderDay?.(key)}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text numberOfLines={1} style={styles.pillText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  monthTitle: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 84,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: 'center',
    gap: 2,
  },
  dayBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pill: { alignSelf: 'stretch', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 },
  pillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600', textAlign: 'center' },
});
