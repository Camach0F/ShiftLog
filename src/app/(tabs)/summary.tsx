import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip } from '@/components/ui';
import { rangeFor, shiftAnchor, todayKey, type RangeMode } from '@/lib/dates';
import { buildCsv, buildHtml, shareCsv, sharePdf } from '@/lib/export';
import { formatDuration, formatMoney, summarize } from '@/lib/hours';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

const MODES: { mode: RangeMode; label: string }[] = [
  { mode: 'week', label: 'Semana' },
  { mode: 'month', label: 'Mes' },
  { mode: 'year', label: 'Año' },
];

export default function SummaryScreen() {
  const t = useTheme();
  const { state } = useStore();
  const { weekStartsOn, currency } = state.settings;
  const [mode, setMode] = useState<RangeMode>('month');
  const [anchor, setAnchor] = useState(todayKey());
  const [jobFilter, setJobFilter] = useState<string | null>(null);
  // A filter on a job that has since been deleted falls back to all jobs.
  const jobId = state.jobs.some((j) => j.id === jobFilter) ? jobFilter : null;

  const { from, to, label } = rangeFor(mode, anchor, weekStartsOn);
  const totals = summarize(state, from, to, jobId);
  const maxMinutes = Math.max(1, ...totals.rows.map((r) => r.minutes));

  const exportAs = async (kind: 'csv' | 'pdf') => {
    try {
      if (kind === 'csv') await shareCsv(buildCsv(state, from, to, jobId), label);
      else await sharePdf(buildHtml(state, from, to, label, jobId));
    } catch (e) {
      Alert.alert('No se pudo exportar', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.segmented, { backgroundColor: t.border }]}>
        {MODES.map((m) => (
          <Pressable
            key={m.mode}
            onPress={() => setMode(m.mode)}
            style={[styles.segment, mode === m.mode && { backgroundColor: t.card }]}
          >
            <Text style={{ color: t.text, fontWeight: mode === m.mode ? '700' : '400' }}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.nav}>
        <Pressable hitSlop={12} onPress={() => setAnchor(shiftAnchor(mode, anchor, -1))}>
          <Ionicons name="chevron-back" size={26} color={t.accent} />
        </Pressable>
        <Text style={[styles.label, { color: t.text }]}>{label}</Text>
        <Pressable hitSlop={12} onPress={() => setAnchor(shiftAnchor(mode, anchor, 1))}>
          <Ionicons name="chevron-forward" size={26} color={t.accent} />
        </Pressable>
      </View>

      {state.jobs.length > 1 && (
        <View style={styles.filter}>
          <Chip label="Todos" color={t.accent} selected={jobId === null} onPress={() => setJobFilter(null)} />
          {state.jobs.map((job) => (
            <Chip key={job.id} label={job.name} color={job.color} selected={jobId === job.id} onPress={() => setJobFilter(job.id)} />
          ))}
        </View>
      )}

      <Card style={styles.totals}>
        <Text style={[styles.big, { color: t.text }]}>{formatDuration(totals.minutes)}</Text>
        <Text style={{ color: t.sub }}>
          {(totals.minutes / 60).toFixed(2)} h · {totals.worked} {totals.worked === 1 ? 'turno' : 'turnos'}
        </Text>
        {totals.overtimeMinutes > 0 && (
          <Text style={{ color: t.text, fontWeight: '600', marginTop: 4 }}>
            Horas extra: {formatDuration(totals.overtimeMinutes)}
            {totals.overtimePay > 0 ? ` (+${formatMoney(totals.overtimePay, currency)})` : ''}
          </Text>
        )}
        {totals.pay > 0 && <Text style={[styles.pay, { color: t.accent }]}>{formatMoney(totals.pay, currency)}</Text>}
      </Card>

      {jobId === null && totals.jobRows.length > 1 && (
        <>
          <Text style={[styles.section, { color: t.sub }]}>POR TRABAJO</Text>
          <Card style={{ gap: 12 }}>
            {totals.jobRows.map((r) => (
              <View key={r.job.id} style={styles.rowTop}>
                <View style={styles.jobName}>
                  <View style={[styles.dot, { backgroundColor: r.job.color }]} />
                  <Text style={{ color: t.text, fontWeight: '600' }}>{r.job.name}</Text>
                </View>
                <Text style={{ color: t.sub }}>
                  {formatDuration(r.minutes)}
                  {r.pay > 0 ? ` · ${formatMoney(r.pay, currency)}` : ''}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      <Text style={[styles.section, { color: t.sub }]}>POR TURNO</Text>
      {totals.rows.length === 0 ? (
        <Text style={{ color: t.sub, textAlign: 'center', marginTop: 12 }}>No hay turnos en este periodo.</Text>
      ) : (
        <Card style={{ gap: 14 }}>
          {totals.rows.map((r) => (
            <View key={r.key}>
              <View style={styles.rowTop}>
                <Text style={{ color: t.text, fontWeight: '600' }}>
                  {jobId === null && state.jobs.length > 1 ? `${r.job.name} · ${r.name}` : r.name}
                </Text>
                <Text style={{ color: t.sub }}>
                  {r.count}× · {formatDuration(r.minutes)}
                  {r.pay > 0 ? ` · ${formatMoney(r.pay, currency)}` : ''}
                </Text>
              </View>
              <View style={[styles.bar, { backgroundColor: t.border }]}>
                <View style={{ width: `${(r.minutes / maxMinutes) * 100}%`, height: 8, borderRadius: 4, backgroundColor: r.color }} />
              </View>
            </View>
          ))}
        </Card>
      )}

      <Text style={[styles.section, { color: t.sub }]}>EXPORTAR {label.toUpperCase()}</Text>
      <View style={styles.exportRow}>
        <View style={{ flex: 1 }}>
          <Button label="PDF" variant="secondary" onPress={() => exportAs('pdf')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="CSV (Excel)" variant="secondary" onPress={() => exportAs('csv')} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, maxWidth: 700, width: '100%', alignSelf: 'center' },
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 2 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  label: { fontSize: 18, fontWeight: '700' },
  totals: { alignItems: 'center', gap: 4, paddingVertical: 22 },
  big: { fontSize: 40, fontWeight: '800' },
  pay: { fontSize: 20, fontWeight: '700', marginTop: 6 },
  section: { fontSize: 12, marginTop: 22, marginBottom: 8, marginLeft: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  filter: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  jobName: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  exportRow: { flexDirection: 'row', gap: 12 },
});
