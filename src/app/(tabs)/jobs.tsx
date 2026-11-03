import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { UpdateCard } from '@/components/UpdateCard';
import { Button, Card, Field } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function JobsScreen() {
  const t = useTheme();
  const { state, setSettings } = useStore();
  const { currency, weekStartsOn, quickAdd, checkUpdates } = state.settings;
  const jobColorOfType = (typeId: string | null) => {
    const type = state.types.find((x) => x.id === typeId);
    return state.jobs.find((j) => j.id === type?.jobId)?.color;
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.section, { color: t.sub }]}>TRABAJOS</Text>
      {state.jobs.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 24 }}>
          <Ionicons name="briefcase-outline" size={32} color={t.sub} />
          <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>Aún no tienes trabajos</Text>
          <Text style={{ color: t.sub, textAlign: 'center' }}>
            Crea un trabajo con su nombre, color, tarifa y tipos de turno para empezar a apuntar horas.
          </Text>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {state.jobs.map((job, i) => {
            const count = state.types.filter((x) => x.jobId === job.id).length;
            return (
              <Pressable
                key={job.id}
                android_ripple={{ color: t.border }}
                onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}
                style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}
              >
                <View style={[styles.dot, { backgroundColor: job.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{job.name}</Text>
                  <Text style={{ color: t.sub }}>
                    {count} {count === 1 ? 'tipo de turno' : 'tipos de turno'}
                    {job.payType === 'fixed'
                      ? job.fixedRate != null
                        ? ` · ${job.fixedRate} ${currency} por trabajo`
                        : ''
                      : job.hourlyRate != null
                        ? ` · ${job.hourlyRate} ${currency}/h`
                        : ''}
                    {job.payType !== 'fixed' && job.overtime.enabled ? ' · horas extra' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.sub} />
              </Pressable>
            );
          })}
        </Card>
      )}
      <View style={{ marginTop: 12 }}>
        <Button label="Nuevo trabajo" onPress={() => router.push({ pathname: '/job/[id]', params: { id: 'new' } })} />
      </View>

      <Text style={[styles.section, { color: t.sub, marginTop: 28 }]}>ROTACIONES</Text>
      {state.rotations.length > 0 && (
        <Card style={{ padding: 0, marginBottom: 12 }}>
          {state.rotations.map((r, i) => (
            <Pressable
              key={r.id}
              android_ripple={{ color: t.border }}
              onPress={() => router.push({ pathname: '/rotation/[id]', params: { id: r.id } })}
              style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{r.name}</Text>
                <View style={styles.dots}>
                  {r.cycle.map((c, j) => (
                    <View
                      key={j}
                      style={[styles.miniDot, { backgroundColor: jobColorOfType(c) ?? t.border }]}
                    />
                  ))}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.sub} />
            </Pressable>
          ))}
        </Card>
      )}
      <Button label="Nueva rotación" variant="secondary" onPress={() => router.push({ pathname: '/rotation/[id]', params: { id: 'new' } })} />

      <Text style={[styles.section, { color: t.sub, marginTop: 28 }]}>AJUSTES</Text>
      <Card>
        <Field label="Moneda" value={currency} maxLength={4} onChangeText={(v) => setSettings({ currency: v })} />
        <Text style={{ color: t.sub, fontSize: 13, marginBottom: 6 }}>La semana empieza en</Text>
        <View style={styles.pair}>
          <View style={{ flex: 1 }}>
            <Button label={`${weekStartsOn === 1 ? '✓ ' : ''}Lunes`} variant="secondary" onPress={() => setSettings({ weekStartsOn: 1 })} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={`${weekStartsOn === 0 ? '✓ ' : ''}Domingo`} variant="secondary" onPress={() => setSettings({ weekStartsOn: 0 })} />
          </View>
        </View>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 16 }}>Añadir turnos sin editar</Text>
            <Text style={{ color: t.sub, fontSize: 12 }}>
              Al tocar un turno en un día se añade con sus horas por defecto, sin abrir el editor.
            </Text>
          </View>
          <Switch value={quickAdd} onValueChange={(v) => setSettings({ quickAdd: v })} />
        </View>
      </Card>

      <Text style={[styles.section, { color: t.sub, marginTop: 28 }]}>ACTUALIZACIONES</Text>
      <Card>
        <UpdateCard />
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 16 }}>Avisar de versiones nuevas</Text>
            <Text style={{ color: t.sub, fontSize: 12 }}>
              Al abrir la app consulta en GitHub si hay una versión nueva. No se envía ningún dato tuyo.
            </Text>
          </View>
          <Switch value={checkUpdates} onValueChange={(v) => setSettings({ checkUpdates: v })} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, maxWidth: 700, width: '100%', alignSelf: 'center' },
  section: { fontSize: 12, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  miniDot: { width: 12, height: 12, borderRadius: 6 },
  pair: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
});
