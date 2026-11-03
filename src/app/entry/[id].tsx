import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TypePicker } from '@/components/TypePicker';
import { BreakField, Button, Field } from '@/components/ui';
import { formatDuration, normalizeTime, resolveEntry, shiftMinutes } from '@/lib/hours';
import { newId, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { ShiftEntry } from '@/lib/types';

type Selection = { jobId: string; typeId: string | null };

/**
 * Adds or edits one calendar entry. A shift type only suggests the hours: they start out as the
 * type's, and anything changed here applies to this day alone.
 */
export default function EntryScreen() {
  const t = useTheme();
  const { id, date, typeId: typeParam, jobId: jobParam } = useLocalSearchParams<{ id: string; date: string; typeId?: string; jobId?: string }>();
  const { state, saveEntry, deleteEntry } = useStore();
  const existing = state.entries.find((e) => e.id === id);

  const types = new Map(state.types.map((x) => [x.id, x]));
  const jobs = new Map(state.jobs.map((j) => [j.id, j]));
  const current = existing ? resolveEntry(existing, types, jobs) : null;

  const initialType = types.get(typeParam ?? existing?.typeId ?? '') ?? (jobParam || existing ? undefined : state.types[0]);
  const initialJobId = initialType?.jobId ?? existing?.jobId ?? jobParam ?? state.jobs[0]?.id;
  const [sel, setSel] = useState<Selection | null>(
    initialJobId ? { jobId: initialJobId, typeId: initialType?.id ?? null } : null,
  );

  const [start, setStart] = useState(current?.start ?? initialType?.start ?? '09:00');
  const [end, setEnd] = useState(current?.end ?? initialType?.end ?? '17:00');
  const initialBreak = current?.breakMin ?? initialType?.breakMin ?? 0;
  const [hasBreak, setHasBreak] = useState(initialBreak > 0);
  const [breakMin, setBreakMin] = useState(String(initialBreak));
  const [note, setNote] = useState(existing?.note ?? '');

  const type = sel?.typeId ? types.get(sel.typeId) : undefined;

  if (!sel || !jobs.has(sel.jobId)) {
    return (
      <View style={styles.content}>
        <Text style={{ color: t.sub }}>Crea primero un trabajo en la pestaña Trabajos.</Text>
      </View>
    );
  }

  const pickType = (next: string) => {
    const nextType = types.get(next);
    if (!nextType) return;
    setSel({ jobId: nextType.jobId, typeId: nextType.id });
    setStart(nextType.start);
    setEnd(nextType.end);
    setHasBreak(nextType.breakMin > 0);
    setBreakMin(String(nextType.breakMin));
  };

  const resetToType = () => {
    if (!type) return;
    setStart(type.start);
    setEnd(type.end);
    setHasBreak(type.breakMin > 0);
    setBreakMin(String(type.breakMin));
  };

  const s = normalizeTime(start);
  const e = normalizeTime(end);
  const brk = hasBreak ? Number(breakMin) : 0;
  const valid = s !== null && e !== null && Number.isInteger(brk) && brk >= 0;
  const preview = valid ? formatDuration(shiftMinutes(s, e, brk)) : '—';
  const edited = type !== undefined && valid && (s !== type.start || e !== type.end || brk !== type.breakMin);

  const save = () => {
    if (!valid) {
      Alert.alert('Datos no válidos', 'Usa el formato HH:mm (por ejemplo 07:30) y un descanso en minutos.');
      return;
    }
    const entry: ShiftEntry = {
      id: existing?.id ?? newId(),
      date: existing?.date ?? date,
      jobId: sel.jobId,
      typeId: sel.typeId,
      note: note.trim(),
      // With a type, keep only what differs from it so later edits to the type still apply.
      start: type && s === type.start ? undefined : s,
      end: type && e === type.end ? undefined : e,
      breakMin: type && brk === type.breakMin ? undefined : brk,
    };
    saveEntry(entry);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.section, { color: t.sub }]}>TURNO</Text>
        <TypePicker
          selectedId={sel.typeId}
          selectedOwnJobId={sel.typeId === null ? sel.jobId : null}
          onPick={pickType}
          onPickOwn={(jobId) => setSel({ jobId, typeId: null })}
        />

        <View style={{ height: 20 }} />
        <View style={styles.pair}>
          <Field label="Entrada" value={start} onChangeText={setStart} placeholder="07:00" keyboardType="numbers-and-punctuation" />
          <Field label="Salida" value={end} onChangeText={setEnd} placeholder="15:00" keyboardType="numbers-and-punctuation" />
        </View>
        <BreakField
          enabled={hasBreak}
          minutes={breakMin}
          onChange={(enabled, minutes) => {
            setHasBreak(enabled);
            setBreakMin(minutes);
          }}
        />
        {type && (
          <View style={styles.hint}>
            <Text style={{ color: t.sub, fontSize: 12, flex: 1 }}>
              Horas del turno «{type.name}»: {type.start} – {type.end}{type.breakMin > 0 ? `, ${type.breakMin} min de descanso` : ''}. Cambiarlas solo afecta a este día.
            </Text>
            {edited && (
              <Pressable hitSlop={8} onPress={resetToType}>
                <Text style={{ color: t.accent, fontWeight: '600' }}>Restablecer</Text>
              </Pressable>
            )}
          </View>
        )}
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
  pair: { flexDirection: 'row', gap: 12 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
});
