import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BreakField, Button, Field } from '@/components/ui';
import { formatDuration, normalizeTime, shiftMinutes } from '@/lib/hours';
import { newId, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function TypeScreen() {
  const t = useTheme();
  const { id, jobId } = useLocalSearchParams<{ id: string; jobId?: string }>();
  const { state, saveType, deleteType } = useStore();
  const existing = state.types.find((x) => x.id === id);
  const job = state.jobs.find((j) => j.id === (existing?.jobId ?? jobId));

  const [name, setName] = useState(existing?.name ?? '');
  const [start, setStart] = useState(existing?.start ?? '09:00');
  const [end, setEnd] = useState(existing?.end ?? '17:00');
  const [hasBreak, setHasBreak] = useState((existing?.breakMin ?? 0) > 0);
  const [breakMin, setBreakMin] = useState(String(existing?.breakMin ?? 0));
  const [rate, setRate] = useState(existing?.hourlyRate != null ? String(existing.hourlyRate) : '');

  if (!job) {
    return (
      <View style={styles.content}>
        <Text style={{ color: t.sub }}>Este tipo de turno no pertenece a ningún trabajo.</Text>
      </View>
    );
  }

  const s = normalizeTime(start);
  const e = normalizeTime(end);
  const brk = hasBreak ? Number(breakMin) : 0;
  const rateNum = rate.trim() === '' ? null : Number(rate.replace(',', '.'));
  const valid =
    name.trim() !== '' && s !== null && e !== null && Number.isInteger(brk) && brk >= 0 && (rateNum === null || (!Number.isNaN(rateNum) && rateNum >= 0));

  const save = () => {
    if (!valid) {
      Alert.alert('Datos no válidos', 'Revisa el nombre, las horas (HH:mm), el descanso y la tarifa.');
      return;
    }
    saveType({ id: existing?.id ?? newId(), jobId: job.id, name: name.trim(), start: s, end: e, breakMin: brk, hourlyRate: rateNum });
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const used = state.entries.filter((x) => x.typeId === existing.id).length;
    Alert.alert(
      'Eliminar tipo de turno',
      used > 0 ? `Se eliminarán también los ${used} turnos de este tipo del calendario.` : `¿Eliminar "${existing.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteType(existing.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.jobRow}>
          <View style={[styles.jobDot, { backgroundColor: job.color }]} />
          <Text style={{ color: t.sub }}>{job.name}</Text>
        </View>

        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Mañana" />

        <View style={styles.pair}>
          <Field label="Entrada" value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" />
          <Field label="Salida" value={end} onChangeText={setEnd} keyboardType="numbers-and-punctuation" />
        </View>
        <Text style={{ color: t.sub, fontSize: 12, marginBottom: 12 }}>
          Si la salida es anterior a la entrada, el turno cruza la medianoche. Con la misma hora de entrada y salida cuenta 0 horas (por ejemplo, un día libre).
        </Text>
        <BreakField
          enabled={hasBreak}
          minutes={breakMin}
          onChange={(enabled, minutes) => {
            setHasBreak(enabled);
            setBreakMin(minutes);
          }}
        />
        <Field
          label={`Tarifa por hora (${state.settings.currency}) — opcional`}
          value={rate}
          onChangeText={setRate}
          keyboardType="decimal-pad"
          placeholder={job.hourlyRate != null ? `Como el trabajo (${job.hourlyRate})` : 'Sin tarifa'}
        />

        <Text style={{ color: t.text, fontSize: 16, fontWeight: '600', marginVertical: 8 }}>
          Duración: {s && e && Number.isInteger(brk) ? formatDuration(shiftMinutes(s, e, brk)) : '—'}
        </Text>

        <Button label="Guardar" onPress={save} />
        {existing && (
          <View style={{ marginTop: 10 }}>
            <Button label="Eliminar tipo" variant="danger" onPress={remove} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, maxWidth: 700, width: '100%', alignSelf: 'center' },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  jobDot: { width: 10, height: 10, borderRadius: 5 },
  pair: { flexDirection: 'row', gap: 12 },
});
