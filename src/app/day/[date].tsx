import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chip } from '@/components/ui';
import { formatLong } from '@/lib/dates';
import { effective, entryMinutes, formatDuration } from '@/lib/hours';
import { newId, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function DayScreen() {
  const t = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { state, saveEntry, deleteEntry } = useStore();
  const entries = state.entries.filter((e) => e.date === date);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: formatLong(date) }} />

      {entries.length === 0 && <Text style={{ color: t.sub, textAlign: 'center', marginBottom: 16 }}>Sin turnos este día.</Text>}

      <View style={{ gap: 10 }}>
        {entries.map((entry) => {
          const type = state.types.find((x) => x.id === entry.typeId);
          if (!type) return null;
          const { start, end } = effective(entry, type);
          const minutes = entryMinutes(entry, type);
          return (
            <Card key={entry.id} style={styles.entry}>
              <Pressable
                style={styles.entryMain}
                onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id, date } })}
              >
                <View style={[styles.bar, { backgroundColor: type.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontSize: 17, fontWeight: '700' }}>{type.name}</Text>
                  <Text style={{ color: t.sub }}>
                    {minutes > 0 ? `${start} – ${end} · ${formatDuration(minutes)}` : 'Sin horas'}
                  </Text>
                  {entry.note !== '' && <Text style={{ color: t.text, marginTop: 4 }}>{entry.note}</Text>}
                </View>
              </Pressable>
              <Pressable
                accessibilityLabel="Eliminar turno"
                hitSlop={10}
                onPress={() =>
                  Alert.alert('Eliminar turno', `¿Eliminar "${type.name}" de este día?`, [
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
      <View style={styles.chips}>
        {state.types.map((type) => (
          <Chip
            key={type.id}
            label={type.name}
            color={type.color}
            onPress={() => saveEntry({ id: newId(), date, typeId: type.id, note: '' })}
          />
        ))}
      </View>
      <Text style={{ color: t.sub, marginTop: 14, fontSize: 13 }}>
        Toca un turno para cambiar su horario, descanso o añadir una nota.
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
