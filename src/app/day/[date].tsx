import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TypePicker } from '@/components/TypePicker';
import { Card } from '@/components/ui';
import { formatLong } from '@/lib/dates';
import { byStart, formatDuration, resolveEntry, type Resolved } from '@/lib/hours';
import { entryFromType, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function DayScreen() {
  const t = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { state, saveEntry, deleteEntry } = useStore();
  const types = new Map(state.types.map((x) => [x.id, x]));
  const jobs = new Map(state.jobs.map((j) => [j.id, j]));
  const entries = state.entries
    .filter((e) => e.date === date)
    .map((e) => resolveEntry(e, types, jobs))
    .filter((r): r is Resolved => r !== null)
    .sort(byStart);

  // Tapping a shift type opens the editor with its hours so they can be adjusted before saving.
  const addType = (typeId: string) => {
    const type = types.get(typeId);
    if (!type) return;
    if (state.settings.quickAdd) saveEntry(entryFromType(type, date));
    else router.push({ pathname: '/entry/[id]', params: { id: 'new', date, typeId } });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: formatLong(date) }} />

      {entries.length === 0 && <Text style={{ color: t.sub, textAlign: 'center', marginBottom: 16 }}>Sin turnos este día.</Text>}

      <View style={{ gap: 10 }}>
        {entries.map((r) => {
          const entry = r.entry;
          return (
            <Card key={entry.id} style={styles.entry}>
              <Pressable
                style={styles.entryMain}
                onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id, date } })}
              >
                <View style={[styles.bar, { backgroundColor: r.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontSize: 17, fontWeight: '700' }}>{r.name}</Text>
                  {(state.jobs.length > 1 || !r.type) && (
                    <Text style={{ color: t.sub, fontSize: 12 }}>{r.type ? r.job.name : 'Horario propio'}</Text>
                  )}
                  <Text style={{ color: t.sub }}>
                    {r.minutes > 0 ? `${r.start} – ${r.end} · ${formatDuration(r.minutes)}` : 'Sin horas'}
                  </Text>
                  {entry.note !== '' && <Text style={{ color: t.text, marginTop: 4 }}>{entry.note}</Text>}
                </View>
              </Pressable>
              <Pressable
                accessibilityLabel="Eliminar turno"
                hitSlop={10}
                onPress={() =>
                  Alert.alert('Eliminar turno', `¿Eliminar "${r.name}" de este día?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => deleteEntry(entry.id) },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={22} color={t.danger} />
              </Pressable>
            </Card>
          );
        })}
      </View>

      <Text style={[styles.section, { color: t.sub }]}>AÑADIR TURNO</Text>
      <TypePicker
        onPick={addType}
        onPickOwn={(jobId) => router.push({ pathname: '/entry/[id]', params: { id: 'new', date, jobId } })}
      />
      <Text style={{ color: t.sub, marginTop: 14, fontSize: 13 }}>
        Los turnos solo sugieren las horas: al añadirlos puedes ajustarlas, o elegir «Otro horario» para escribir las tuyas. Toca un turno ya añadido para cambiarlo.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, maxWidth: 700, width: '100%', alignSelf: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryMain: { flex: 1, flexDirection: 'row', gap: 12 },
  bar: { width: 5, borderRadius: 3 },
  section: { fontSize: 12, marginTop: 24, marginBottom: 10, marginLeft: 4 },
});
