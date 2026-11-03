import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Chip, Field } from '@/components/ui';
import { formatDuration, normalizeTime, shiftMinutes } from '@/lib/hours';
import { newId, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { ShiftEntry } from '@/lib/types';

export default function EntryScreen() {
  const t = useTheme();
  const { id, date } = useLocalSearchParams<{ id: string; date: string }>();
  const { state, saveEntry, deleteEntry } = useStore();
  const existing = state.entries.find((e) => e.id === id);

  const firstType = state.types.find((x) => x.id === existing?.typeId) ?? state.types[0];
  const [typeId, setTypeId] = useState(firstType?.id ?? '');
  const type = state.types.find((x) => x.id === typeId);

  const [start, setStart] = useState(existing?.start ?? firstType?.start ?? '09:00');
  const [end, setEnd] = useState(existing?.end ?? firstType?.end ?? '17:00');
  const [breakMin, setBreakMin] = useState(String(existing?.breakMin ?? firstType?.breakMin ?? 0));
  const [note, setNote] = useState(existing?.note ?? '');

  if (!type) {
    return (
      <View style={styles.content}>
        <Text style={{ color: t.sub }}>Crea primero un tipo de turno en la pestaña Turnos.</Text>
      </View>
    );
  }

  const pickType = (next: string) => {
    const nextType = state.types.find((x) => x.id === next);
    if (!nextType) return;
    setTypeId(next);
    setStart(nextType.start);
    setEnd(nextType.end);
    setBreakMin(String(nextType.breakMin));
  };

  const s = normalizeTime(start);
  const e = normalizeTime(end);
  const brk = Number(breakMin);
  const valid = s !== null && e !== null && Number.isInteger(brk) && brk >= 0;
  const preview = valid ? formatDuration(shiftMinutes(s, e, brk)) : '—';

  const save = () => {
    if (!valid) {
      Alert.alert('Datos no válidos', 'Usa el formato HH:mm (por ejemplo 07:30) y un descanso en minutos.');
      return;
    }
    const entry: ShiftEntry = {
      id: existing?.id ?? newId(),
      date: existing?.date ?? date,
      typeId,
      note: note.trim(),
      // Keep only what differs from the type, so later edits to the type still apply.
      start: s === type.start ? undefined : s,
      end: e === type.end ? undefined : e,
      breakMin: brk === type.breakMin ? undefined : brk,
    };
    saveEntry(entry);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.section, { color: t.sub }]}>TIPO</Text>
        <View style={styles.chips}>
          {state.types.map((x) => (
            <Chip key={x.id} label={x.name} color={x.color} selected={x.id === typeId} onPress={() => pickType(x.id)} />
          ))}
        </View>

        <View style={{ height: 20 }} />
        <View style={styles.pair}>
          <Field label="Entrada" value={start} onChangeText={setStart} placeholder="07:00" keyboardType="numbers-and-punctuation" />
          <Field label="Salida" value={end} onChangeText={setEnd} placeholder="15:00" keyboardType="numbers-and-punctuation" />
        </View>
        <Field label="Descanso (minutos)" value={breakMin} onChangeText={setBreakMin} keyboardType="number-pad" />
        <Field label="Nota" value={note} onChangeText={setNote} placeholder="Opcional" multiline />

        <Text style={{ color: t.text, fontSize: 16, fontWeight: '600', marginVertical: 8 }}>Total: {preview}</Text>

        <Button label="Guardar" onPress={save} />
        {existing && (
          <View style={{ marginTop: 10 }}>
            <Button
              label="Eliminar turno"
              variant="danger"
              onPress={() => {
                deleteEntry(existing.id);
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
  section: { fontSize: 12, marginBottom: 10, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pair: { flexDirection: 'row', gap: 12 },
});
