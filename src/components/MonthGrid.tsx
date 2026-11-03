import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

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

  // Cells grow with the space they get: taller on tablets, never below the phone size.
  const [gridWidth, setGridWidth] = useState(0);
  const cellWidth = gridWidth / 7;
  const cellHeight = gridWidth ? Math.round(Math.min(140, Math.max(84, cellWidth * 1.15))) : 84;
  const badge = cellWidth >= 90 ? 32 : 26;

  return (
    <View onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
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
              android_ripple={{ color: t.accent + '22' }}
              style={[
                styles.cell,
                { minHeight: cellHeight },
                { borderColor: t.border, opacity: key.startsWith(month) ? 1 : 0.35 },
                isSelected && { backgroundColor: t.accent + '33' },
              ]}
            >
              <View style={[styles.dayBadge, { width: badge, height: badge, borderRadius: badge / 2 }, isToday && { backgroundColor: t.accent }, isSelected && { borderWidth: 2, borderColor: t.accent }]}>
                <Text maxFontSizeMultiplier={1.2} style={{ color: isToday ? t.onAccent : t.text, fontWeight: '600', fontSize: badge > 26 ? 16 : 14 }}>{fromKey(key).getDate()}</Text>
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
  const { width } = useWindowDimensions();
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        maxFontSizeMultiplier={1.2}
        style={[styles.pillText, width >= 600 && { fontSize: 12 }]}
      >
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
