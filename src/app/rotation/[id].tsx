import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { TypePicker } from '@/components/TypePicker';
import { Button, Card, Field } from '@/components/ui';
import { addDays, daysBetween, isValidKey, todayKey } from '@/lib/dates';
import { entryFromType, newId, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { Rotation, ShiftEntry } from '@/lib/types';

const MAX_DAYS = 28;
const MAX_APPLY_DAYS = 366 * 2;

export default function RotationScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, saveRotation, deleteRotation, applyEntries } = useStore();
  const existing = state.rotations.find((r) => r.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [cycle, setCycle] = useState<(string | null)[]>(existing?.cycle ?? [null, null, null, null, null, null, null]);
  const [from, setFrom] = useState(todayKey());
  const [to, setTo] = useState(addDays(todayKey(), 55));
  const [replace, setReplace] = useState(false);

  const setDay = (i: number, typeId: string | null) => setCycle((c) => c.map((v, j) => (j === i ? typeId : v)));

  const build = (): Rotation | null => {
    if (name.trim() === '' || !cycle.some((c) => c !== null)) {
      Alert.alert('Rotación incompleta', 'Escribe un nombre y asigna al menos un turno a algún día del ciclo.');
      return null;
    }
    return { id: existing?.id ?? newId(), name: name.trim(), cycle };
  };

  const save = () => {
    const rotation = build();
    if (!rotation) return;
    saveRotation(rotation);
    router.back();
  };

  const apply = () => {
    const rotation = build();
    if (!rotation) return;
    if (!isValidKey(from) || !isValidKey(to) || to < from) {
      Alert.alert('Fechas no válidas', 'Usa el formato AAAA-MM-DD y que "Hasta" no sea anterior a "Desde".');
      return;
    }
    const span = daysBetween(from, to) + 1;
    if (span > MAX_APPLY_DAYS) {
      Alert.alert('Rango demasiado largo', `Aplica la rotación en tramos de como máximo ${MAX_APPLY_DAYS} días.`);
      return;
    }

    const busy = new Map<string, string[]>();
    for (const e of state.entries) busy.set(e.date, [...(busy.get(e.date) ?? []), e.id]);

    const add: ShiftEntry[] = [];
    const removeIds: string[] = [];
    for (let i = 0; i < span; i++) {
      const typeId = rotation.cycle[i % rotation.cycle.length];
      if (typeId === null) continue;
      const date = addDays(from, i);
      const current = busy.get(date) ?? [];
      if (current.length > 0 && !replace) continue;
      removeIds.push(...current);
      const type = state.types.find((x) => x.id === typeId);
      if (!type) continue;
      add.push(entryFromType(type, date));
    }

    saveRotation(rotation);
    applyEntries(add, removeIds);
    Alert.alert('Rotación aplicada', `${add.length} turnos añadidos al calendario.`, [{ text: 'OK', onPress: () => router.back() }]);
  };

  const remove = () => {
    if (!existing) return;
    deleteRotation(existing.id);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="4 días de trabajo, 2 libres" />

        <Text style={[styles.section, { color: t.sub }]}>CICLO ({cycle.length} DÍAS)</Text>
        <View style={{ gap: 10 }}>
          {cycle.map((typeId, i) => (
            <Card key={i} style={{ gap: 8 }}>
              <Text style={{ color: t.text, fontWeight: '600' }}>Día {i + 1}</Text>
              <TypePicker noneSelected={typeId === null} onNone={() => setDay(i, null)} selectedId={typeId} onPick={(next) => setDay(i, next)} />
            </Card>
          ))}
        </View>
        <View style={styles.pair}>
          <View style={{ flex: 1 }}>
            <Button
              label="Añadir día"
              variant="secondary"
              onPress={() => cycle.length < MAX_DAYS && setCycle((c) => [...c, null])}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Quitar último"
              variant="secondary"
              onPress={() => cycle.length > 1 && setCycle((c) => c.slice(0, -1))}
            />
          </View>
        </View>

        <Text style={[styles.section, { color: t.sub }]}>APLICAR AL CALENDARIO</Text>
        <Text style={{ color: t.sub, fontSize: 13, marginBottom: 10 }}>
          El día 1 del ciclo cae en la fecha «Desde» y el patrón se repite hasta la fecha «Hasta».
        </Text>
        <View style={styles.pair}>
          <Field label="Desde" value={from} onChangeText={setFrom} placeholder="2026-11-03" autoCapitalize="none" />
          <Field label="Hasta" value={to} onChangeText={setTo} placeholder="2026-12-31" autoCapitalize="none" />
        </View>
        <View style={styles.switchRow}>
          <Text style={{ color: t.text, flex: 1 }}>Reemplazar turnos existentes en esos días</Text>
          <Switch value={replace} onValueChange={setReplace} />
        </View>
        <Button label="Aplicar rotación" onPress={apply} />

        <View style={{ marginTop: 24, gap: 10 }}>
          <Button label="Guardar sin aplicar" variant="secondary" onPress={save} />
          {existing && <Button label="Eliminar rotación" variant="danger" onPress={remove} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, maxWidth: 700, width: '100%', alignSelf: 'center' },
  section: { fontSize: 12, marginTop: 14, marginBottom: 10, marginLeft: 4 },
  pair: { flexDirection: 'row', gap: 12, marginTop: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
});
