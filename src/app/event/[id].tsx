import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Field } from '@/components/ui';
import { isValidKey, todayKey } from '@/lib/dates';
import { normalizeTime, shiftMinutes } from '@/lib/hours';
import { newId, useStore } from '@/lib/store';
import { TYPE_COLORS, useTheme } from '@/lib/theme';

export default function EventScreen() {
  const t = useTheme();
  const { id, date: dateParam } = useLocalSearchParams<{ id: string; date?: string }>();
  const { state, saveEvent, deleteEvent } = useStore();
  const existing = state.events.find((e) => e.id === id);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? dateParam ?? todayKey());
  const [allDay, setAllDay] = useState(existing?.allDay ?? true);
  const [start, setStart] = useState(existing?.start ?? '09:00');
  const [end, setEnd] = useState(existing?.end ?? '10:00');
  const [note, setNote] = useState(existing?.note ?? '');
  const [color, setColor] = useState(existing?.color ?? TYPE_COLORS[3]);

  const save = () => {
    const s = normalizeTime(start);
    const e = normalizeTime(end);
    if (title.trim() === '' || !isValidKey(date)) {
      Alert.alert('Datos no válidos', 'Escribe un título y una fecha con el formato AAAA-MM-DD.');
      return;
    }
    if (!allDay && (s === null || e === null || shiftMinutes(s, e, 0) === 0 || e < s)) {
      Alert.alert('Horas no válidas', 'Usa el formato HH:mm y que la hora de fin sea posterior a la de inicio.');
      return;
    }
    saveEvent({
      id: existing?.id ?? newId(),
      date,
      title: title.trim(),
      allDay,
      start: allDay || !s ? '00:00' : s,
      end: allDay || !e ? '00:00' : e,
      note: note.trim(),
      color,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Título" value={title} onChangeText={setTitle} placeholder="Médico, cumpleaños, reunión…" />
        <Field label="Fecha" value={date} onChangeText={setDate} placeholder="2026-11-03" autoCapitalize="none" />

        <View style={styles.switchRow}>
          <Text style={{ color: t.text, flex: 1, fontSize: 16 }}>Todo el día</Text>
          <Switch value={allDay} onValueChange={setAllDay} />
        </View>
        {!allDay && (
          <View style={styles.pair}>
            <Field label="Inicio" value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" />
            <Field label="Fin" value={end} onChangeText={setEnd} keyboardType="numbers-and-punctuation" />
          </View>
        )}

        <Text style={[styles.label, { color: t.sub }]}>Color</Text>
        <View style={styles.colors}>
          {TYPE_COLORS.map((c) => (
            <Pressable
              key={c}
              accessibilityLabel={`Color ${c}`}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c, borderColor: c === color ? t.text : 'transparent' }]}
            />
          ))}
        </View>

        <Field label="Nota" value={note} onChangeText={setNote} placeholder="Opcional" multiline />

        <Button label="Guardar" onPress={save} />
        {existing && (
          <View style={{ marginTop: 10 }}>
            <Button
              label="Eliminar evento"
              variant="danger"
              onPress={() => {
                deleteEvent(existing.id);
                router.back();
              }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, maxWidth: 700, width: '100%', alignSelf: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pair: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, marginBottom: 8 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
});
