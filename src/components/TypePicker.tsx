import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

/** Shift type chips grouped by job (the job headings only show when there is more than one job). */
export function TypePicker({
  selectedId,
  onPick,
  allowNone = false,
}: {
  selectedId?: string | null;
  onPick: (typeId: string | null) => void;
  allowNone?: boolean;
}) {
  const t = useTheme();
  const { state } = useStore();
  const groups = state.jobs
    .map((job) => ({ job, types: state.types.filter((x) => x.jobId === job.id) }))
    .filter((g) => g.types.length > 0);

  if (groups.length === 0) {
    return (
      <View style={styles.group}>
        {allowNone && <Chip label="Nada" color={t.sub} selected={selectedId === null} onPress={() => onPick(null)} />}
        <Text style={{ color: t.sub }}>
          {state.jobs.length === 0
            ? 'Aún no tienes trabajos. Crea uno en la pestaña Trabajos.'
            : 'Tus trabajos no tienen turnos. Añádelos en la pestaña Trabajos.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {allowNone && (
        <View style={styles.group}>
          <Chip label="Nada" color={t.sub} selected={selectedId === null} onPress={() => onPick(null)} />
        </View>
      )}
      {groups.map(({ job, types }) => (
        <View key={job.id} style={{ gap: 8 }}>
          {state.jobs.length > 1 && (
            <View style={styles.heading}>
              <View style={[styles.dot, { backgroundColor: job.color }]} />
              <Text style={{ color: t.sub, fontWeight: '600' }}>{job.name}</Text>
            </View>
          )}
          <View style={styles.group}>
            {types.map((type) => (
              <Chip key={type.id} label={type.name} color={type.color} selected={selectedId === type.id} onPress={() => onPick(type.id)} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
