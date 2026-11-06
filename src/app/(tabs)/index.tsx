import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MonthGrid, Pill } from '@/components/MonthGrid';
import { UpdateBanner } from '@/components/UpdateBanner';
import { Button, Card } from '@/components/ui';
import { formatLong, todayKey } from '@/lib/dates';
import { useLayout } from '@/lib/layout';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { AgendaEvent } from '@/lib/types';

const byTime = (a: AgendaEvent, b: AgendaEvent) =>
  Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title);

/** Personal agenda: appointments and reminders. Nothing here counts towards hours or pay. */
export default function AgendaScreen() {
  const t = useTheme();
  const { isWide } = useLayout();
  const { state } = useStore();
  const [anchor, setAnchor] = useState(todayKey());
  const [day, setDay] = useState(todayKey());

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const e of state.events) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    for (const list of map.values()) list.sort(byTime);
    return map;
  }, [state.events]);

  const events = eventsByDay.get(day) ?? [];

  const grid = (
    <MonthGrid
      anchor={anchor}
      onAnchorChange={setAnchor}
      weekStartsOn={state.settings.weekStartsOn}
      selected={new Set([day])}
      onPressDay={setDay}
      renderDay={(key) => {
        const list = eventsByDay.get(key) ?? [];
        return (
          <>
            {list.slice(0, 3).map((e) => (
              <Pill key={e.id} label={e.title} color={e.color} />
            ))}
            {list.length > 3 && <Text style={{ color: t.sub, fontSize: 10 }}>+{list.length - 3}</Text>}
          </>
        );
      }}
    />
  );

  const details = (
    <>
      <Text style={[styles.heading, { color: t.text }]}>{formatLong(day)}</Text>
      {events.length === 0 ? (
        <Text style={{ color: t.sub, marginBottom: 12 }}>Sin eventos este día.</Text>
      ) : (
        <View style={{ gap: 10, marginBottom: 12 }}>
          {events.map((e) => (
            <Pressable key={e.id} onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })}>
              <Card style={styles.event}>
                <View style={[styles.bar, { backgroundColor: e.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>{e.title}</Text>
                  <Text style={{ color: t.sub }}>{e.allDay ? 'Todo el día' : `${e.start} – ${e.end}`}</Text>
                  {e.note !== '' && <Text style={{ color: t.text, marginTop: 4 }}>{e.note}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.sub} />
              </Card>
            </Pressable>
          ))}
        </View>
      )}
      <Button label="Nuevo evento" onPress={() => router.push({ pathname: '/event/[id]', params: { id: 'new', date: day } })} />
      <Text style={{ color: t.sub, fontSize: 12, marginTop: 10, textAlign: 'center' }}>
        Los eventos de la agenda no cuentan en las horas ni en el resumen.
      </Text>
    </>
  );

  // On wide screens the calendar and the selected day sit side by side.
  if (isWide) {
    return (
      <View style={styles.columns}>
        <ScrollView style={{ flex: 3 }} contentContainerStyle={styles.column}>
          {grid}
        </ScrollView>
        <ScrollView style={[styles.side, { borderLeftColor: t.border }]} contentContainerStyle={styles.column}>
          <UpdateBanner />
          {details}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <UpdateBanner />
      {grid}
      {details}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 32, maxWidth: 900, width: '100%', alignSelf: 'center' },
  columns: { flex: 1, flexDirection: 'row' },
  column: { padding: 16, paddingBottom: 32 },
  side: { flex: 2, borderLeftWidth: StyleSheet.hairlineWidth },
  heading: { fontSize: 18, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bar: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
});
