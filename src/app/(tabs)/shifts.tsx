import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MonthGrid, Pill } from '@/components/MonthGrid';
import { TypePicker } from '@/components/TypePicker';
import { Button, Card } from '@/components/ui';
import { todayKey } from '@/lib/dates';
import { byStart, formatDuration, formatMoney, resolveEntry, summarize, type Resolved } from '@/lib/hours';
import { entryFromType, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { ShiftEntry } from '@/lib/types';

/** Work shifts calendar: everything on this screen counts towards hours and pay. */
export default function ShiftsScreen() {
  const t = useTheme();
  const { state, applyEntries } = useStore();
  const { weekStartsOn, currency } = state.settings;
  const [anchor, setAnchor] = useState(todayKey());
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const month = anchor.slice(0, 7);
  const typesById = useMemo(() => new Map(state.types.map((x) => [x.id, x])), [state.types]);
  const jobsById = useMemo(() => new Map(state.jobs.map((j) => [j.id, j])), [state.jobs]);

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
    const type = typesById.get(typeId);
    if (!type) return;
    applyEntries([...selected].map((date) => entryFromType(type, date)), idsOnSelected());
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
        {state.jobs.length === 0 && (
          <Card style={{ marginBottom: 8, gap: 10 }}>
            <Text style={{ color: t.text, fontWeight: '600' }}>Crea tu primer trabajo</Text>
            <Text style={{ color: t.sub }}>Define tu trabajo, sus turnos y su tarifa para empezar a apuntar horas.</Text>
            <Button label="Nuevo trabajo" onPress={() => router.push({ pathname: '/job/[id]', params: { id: 'new' } })} />
          </Card>
        )}

        <MonthGrid
          anchor={anchor}
          onAnchorChange={setAnchor}
          weekStartsOn={weekStartsOn}
          selected={selected}
          onPressDay={(key) => (selecting ? toggle(key) : router.push(`/day/${key}`))}
          belowBar={
            <Pressable style={styles.selectToggle} hitSlop={8} onPress={() => (selecting ? stopSelecting() : setSelecting(true))}>
              <Text style={{ color: t.accent, fontWeight: '600' }}>{selecting ? 'Cancelar selección' : 'Seleccionar varios días'}</Text>
            </Pressable>
          }
          renderDay={(key) => {
            const list = (entriesByDay.get(key) ?? [])
              .map((e) => resolveEntry(e, typesById, jobsById))
              .filter((r): r is Resolved => r !== null)
              .sort(byStart);
            return (
              <>
                {list.slice(0, 3).map((r) => (
                  <Pill key={r.entry.id} label={r.job.name} color={r.color} />
                ))}
                {list.length > 3 && <Text style={{ color: t.sub, fontSize: 10 }}>+{list.length - 3}</Text>}
              </>
            );
          }}
        />

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
              <TypePicker onPick={assign} />
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
  selectToggle: { alignSelf: 'center', paddingVertical: 4, marginBottom: 6 },
  summary: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  panel: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
