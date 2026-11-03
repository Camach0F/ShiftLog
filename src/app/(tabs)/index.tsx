import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TypePicker } from '@/components/TypePicker';
import { Button, Card } from '@/components/ui';
import { addMonths, fromKey, formatMonth, monthGrid, todayKey, weekdayLabels } from '@/lib/dates';
import { formatDuration, formatMoney, summarize } from '@/lib/hours';
import { newId, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { ShiftEntry } from '@/lib/types';

export default function CalendarScreen() {
  const t = useTheme();
  const { state, applyEntries } = useStore();
  const { weekStartsOn, currency } = state.settings;
  const [anchor, setAnchor] = useState(todayKey());
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const today = todayKey();

  const days = useMemo(() => monthGrid(anchor, weekStartsOn), [anchor, weekStartsOn]);
  const month = anchor.slice(0, 7);
  const typesById = useMemo(() => new Map(state.types.map((x) => [x.id, x])), [state.types]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, ShiftEntry[]>();
    for (const e of state.entries) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return map;
  }, [state.entries]);

  const totals = summarize(state, `${month}-01`, `${month}-31`);

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const idsOnSelected = () => state.entries.filter((e) => selected.has(e.date)).map((e) => e.id);

  const assign = (typeId: string) => {
    const add = [...selected].map((date): ShiftEntry => ({ id: newId(), date, typeId, note: '' }));
    applyEntries(add, idsOnSelected());
    stopSelecting();
  };

  const clear = () => {
    const ids = idsOnSelected();
    if (ids.length === 0) {
      stopSelecting();
      return;
    }
    Alert.alert('Limpiar días', `Se eliminarán ${ids.length} turnos de los días seleccionados.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          applyEntries([], ids);
          stopSelecting();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.monthBar}>
          <Pressable accessibilityLabel="Mes anterior" hitSlop={12} onPress={() => setAnchor(addMonths(anchor, -1))}>
            <Ionicons name="chevron-back" size={26} color={t.accent} />
          </Pressable>
          <Pressable onPress={() => setAnchor(today)}>
            <Text style={[styles.monthTitle, { color: t.text }]}>{formatMonth(anchor)}</Text>
          </Pressable>
          <Pressable accessibilityLabel="Mes siguiente" hitSlop={12} onPress={() => setAnchor(addMonths(anchor, 1))}>
            <Ionicons name="chevron-forward" size={26} color={t.accent} />
          </Pressable>
        </View>

        {state.jobs.length === 0 && (
          <Card style={{ marginVertical: 8, gap: 10 }}>
            <Text style={{ color: t.text, fontWeight: '600' }}>Crea tu primer trabajo</Text>
            <Text style={{ color: t.sub }}>Define tu trabajo, sus turnos y su tarifa para empezar a apuntar horas.</Text>
            <Button label="Nuevo trabajo" onPress={() => router.push({ pathname: '/job/[id]', params: { id: 'new' } })} />
          </Card>
        )}

        <Pressable style={styles.selectToggle} hitSlop={8} onPress={() => (selecting ? stopSelecting() : setSelecting(true))}>
          <Text style={{ color: t.accent, fontWeight: '600' }}>{selecting ? 'Cancelar selección' : 'Seleccionar varios días'}</Text>
        </Pressable>

        <View style={styles.row}>
          {weekdayLabels(weekStartsOn).map((label) => (
            <Text key={label} style={[styles.weekday, { color: t.sub }]}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {days.map((key) => {
            const inMonth = key.startsWith(month);
            const entries = entriesByDay.get(key) ?? [];
            const isToday = key === today;
            const isSelected = selected.has(key);
            return (
              <Pressable
                key={key}
                onPress={() => (selecting ? toggle(key) : router.push(`/day/${key}`))}
                style={[
                  styles.cell,
                  { borderColor: t.border, opacity: inMonth ? 1 : 0.35 },
                  isSelected && { backgroundColor: t.accent + '33' },
                ]}
              >
                <View style={[styles.dayBadge, isToday && { backgroundColor: t.accent }, isSelected && { borderWidth: 2, borderColor: t.accent }]}>
                  <Text style={{ color: isToday ? t.onAccent : t.text, fontWeight: '600' }}>{fromKey(key).getDate()}</Text>
                </View>
                {entries.slice(0, 3).map((e) => {
                  const type = typesById.get(e.typeId);
                  if (!type) return null;
                  return (
                    <View key={e.id} style={[styles.pill, { backgroundColor: type.color }]}>
                      <Text numberOfLines={1} style={styles.pillText}>
                        {type.name}
                      </Text>
                    </View>
                  );
                })}
                {entries.length > 3 && <Text style={{ color: t.sub, fontSize: 10 }}>+{entries.length - 3}</Text>}
              </Pressable>
            );
          })}
        </View>

        <Card style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: t.text }]}>{formatDuration(totals.minutes)}</Text>
            <Text style={{ color: t.sub }}>Horas del mes</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: t.text }]}>{totals.worked}</Text>
            <Text style={{ color: t.sub }}>Turnos</Text>
          </View>
          {totals.overtimeMinutes > 0 && (
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: t.text }]}>{formatDuration(totals.overtimeMinutes)}</Text>
              <Text style={{ color: t.sub }}>Extra</Text>
            </View>
          )}
          {totals.pay > 0 && (
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: t.text }]}>{formatMoney(totals.pay, currency)}</Text>
              <Text style={{ color: t.sub }}>Ingresos</Text>
            </View>
          )}
        </Card>
      </ScrollView>

      {selecting && (
        <View style={[styles.panel, { backgroundColor: t.card, borderTopColor: t.border }]}>
          <Text style={{ color: t.text, fontWeight: '600', marginBottom: 4 }}>
            {selected.size} {selected.size === 1 ? 'día seleccionado' : 'días seleccionados'}
          </Text>
          <Text style={{ color: t.sub, fontSize: 12, marginBottom: 10 }}>Asignar un turno reemplaza lo que hubiera esos días.</Text>
          {selected.size > 0 && (
            <>
              <TypePicker onPick={(typeId) => typeId && assign(typeId)} />
              <View style={{ marginTop: 10 }}>
                <Button label="Limpiar días" variant="danger" onPress={clear} />
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 32, maxWidth: 900, width: '100%', alignSelf: 'center' },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  monthTitle: { fontSize: 20, fontWeight: '700' },
  selectToggle: { alignSelf: 'center', paddingVertical: 4, marginBottom: 6 },
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
  summary: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  panel: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
