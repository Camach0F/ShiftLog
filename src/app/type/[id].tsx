import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Field } from '@/components/ui';
import { formatDuration, normalizeTime, shiftMinutes } from '@/lib/hours';
import { newId, useStore } from '@/lib/store';
import { TYPE_COLORS, useTheme } from '@/lib/theme';

export default function TypeScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, saveType, deleteType } = useStore();
  const existing = state.types.find((x) => x.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState(existing?.color ?? TYPE_COLORS[3]);
  const [start, setStart] = useState(existing?.start ?? '09:00');
  const [end, setEnd] = useState(existing?.end ?? '17:00');
  const [breakMin, setBreakMin] = useState(String(existing?.breakMin ?? 0));
  const [rate, setRate] = useState(existing?.hourlyRate != null ? String(existing.hourlyRate) : '');

  const s = normalizeTime(start);
  const e = normalizeTime(end);
  const brk = Number(breakMin);
  const rateNum = rate.trim() === '' ? null : Number(rate.replace(',', '.'));
  const valid =
    name.trim() !== '' && s !== null && e !== null && Number.isInteger(brk) && brk >= 0 && (rateNum === null || (!Number.isNaN(rateNum) && rateNum >= 0));

  const save = () => {
    if (!valid) {
      Alert.alert('Datos no válidos', 'Revisa el nombre, las horas (HH:mm), el descanso y la tarifa.');
      return;
    }
    saveType({ id: existing?.id ?? newId(), name: name.trim(), color, start: s, end: e, breakMin: brk, hourlyRate: rateNum });
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
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Mañana" />

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

        <View style={styles.pair}>
          <Field label="Entrada" value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" />
          <Field label="Salida" value={end} onChangeText={setEnd} keyboardType="numbers-and-punctuation" />
        </View>
        <Text style={{ color: t.sub, fontSize: 12, marginBottom: 12 }}>
          Si la salida es anterior a la entrada, el turno cruza la medianoche. Con la misma hora de entrada y salida cuenta 0 horas (por ejemplo, un día libre).
        </Text>
        <Field label="Descanso (minutos)" value={breakMin} onChangeText={setBreakMin} keyboardType="number-pad" />
        <Field
          label={`Tarifa por hora (${state.settings.currency}) — opcional`}
          value={rate}
          onChangeText={setRate}
          keyboardType="decimal-pad"
          placeholder="Sin tarifa"
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
  label: { fontSize: 13, marginBottom: 8 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  pair: { flexDirection: 'row', gap: 12 },
});
