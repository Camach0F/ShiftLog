import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { BackupCard } from '@/components/BackupCard';
import { CalendarCard } from '@/components/CalendarCard';
import { UpdateBanner } from '@/components/UpdateBanner';
import { UpdateCard } from '@/components/UpdateCard';
import { currentRelease, WhatsNewDialog } from '@/components/WhatsNew';
import { Button, Card, Field } from '@/components/ui';
import { DISCORD_URL } from '@/lib/links';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { openTour } from '@/lib/tour';
import type { Category, Job } from '@/lib/types';

const SHARE_MESSAGE =
  'ShiftLog: agenda y turnos de trabajo para Android. Gratis, sin anuncios y de código abierto.\nDescárgala aquí: https://github.com/Camach0F/ShiftLog/releases/latest';

export default function JobsScreen() {
  const t = useTheme();
  const { state, setSettings } = useStore();
  const { currency, weekStartsOn, quickAdd, checkUpdates } = state.settings;
  const [notesOpen, setNotesOpen] = useState(false);
  const jobColorOfType = (typeId: string | null) => {
    const type = state.types.find((x) => x.id === typeId);
    return state.jobs.find((j) => j.id === type?.jobId)?.color;
  };

  const jobRow = (job: Job, i: number) => {
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
  };

  // Jobs grouped under their category; those without one come last (and only show when needed).
  const groups: { category: Category | null; jobs: Job[] }[] = [
    ...state.categories.map((category) => ({ category, jobs: state.jobs.filter((j) => j.categoryId === category.id) })),
    { category: null, jobs: state.jobs.filter((j) => !j.categoryId) },
  ].filter((g) => g.category !== null || g.jobs.length > 0);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <UpdateBanner />
      <Text style={[styles.section, { color: t.sub }]}>TRABAJOS</Text>
      {state.jobs.length === 0 && state.categories.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 24 }}>
          <Ionicons name="briefcase-outline" size={32} color={t.sub} />
          <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>Aún no tienes trabajos</Text>
          <Text style={{ color: t.sub, textAlign: 'center' }}>
            Crea un trabajo con su nombre, color, tarifa y tipos de turno para empezar a apuntar horas.
          </Text>
        </Card>
      ) : (
        groups.map(({ category, jobs }) => (
          <View key={category?.id ?? 'none'} style={{ marginBottom: 14 }}>
            {state.categories.length > 0 && (
              <View style={styles.groupHeader}>
                <Text style={[styles.groupTitle, { color: t.text }]}>{category ? category.name : 'Sin categoría'}</Text>
                {category && (
                  <Pressable
                    accessibilityLabel={`Editar la categoría ${category.name}`}
                    hitSlop={10}
                    onPress={() => router.push({ pathname: '/category/[id]', params: { id: category.id } })}
                  >
                    <Ionicons name="create-outline" size={20} color={t.accent} />
                  </Pressable>
                )}
              </View>
            )}
            {jobs.length === 0 ? (
              <Text style={{ color: t.sub, marginLeft: 4 }}>Sin trabajos. Toca el lápiz para añadir alguno.</Text>
            ) : (
              <Card style={{ padding: 0 }}>{jobs.map(jobRow)}</Card>
            )}
          </View>
        ))
      )}
      <View style={{ marginTop: 12 }}>
        <Button label="Nuevo trabajo" onPress={() => router.push({ pathname: '/job/[id]', params: { id: 'new' } })} />
      </View>
      <View style={{ marginTop: 10 }}>
        <Button label="Nueva categoría" variant="secondary" onPress={() => router.push({ pathname: '/category/[id]', params: { id: 'new' } })} />
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

      <Text style={[styles.section, { color: t.sub, marginTop: 28 }]}>CALENDARIO DEL MÓVIL</Text>
      <Card>
        <CalendarCard />
      </Card>

      <Text style={[styles.section, { color: t.sub, marginTop: 28 }]}>COPIA DE SEGURIDAD</Text>
      <Card>
        <BackupCard />
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
        <View style={{ marginTop: 14 }}>
          <Button label="Ver novedades de esta versión" variant="secondary" onPress={() => setNotesOpen(true)} />
        </View>
      </Card>
      <WhatsNewDialog visible={notesOpen} release={currentRelease()} onClose={() => setNotesOpen(false)} />

      <Text style={[styles.section, { color: t.sub, marginTop: 28 }]}>AYUDA</Text>
      <Card>
        <Text style={{ color: t.text, fontSize: 16 }}>¿Te has perdido?</Text>
        <Text style={{ color: t.sub, fontSize: 12, marginTop: 2, marginBottom: 10 }}>
          Un recorrido rápido por la app, pantalla a pantalla. Si sigues con dudas, te ayudamos en Discord.
        </Text>
        <View style={{ gap: 10 }}>
          <Button label="Ver la guía de la app" variant="secondary" onPress={openTour} />
          <Button label="Soporte en Discord" variant="secondary" onPress={() => Linking.openURL(DISCORD_URL).catch(() => {})} />
        </View>
      </Card>

      <Text style={[styles.section, { color: t.sub, marginTop: 28 }]}>COMPARTIR</Text>
      <Card>
        <Text style={{ color: t.text, fontSize: 16 }}>¿Te gusta ShiftLog?</Text>
        <Text style={{ color: t.sub, fontSize: 12, marginTop: 2, marginBottom: 10 }}>
          Envía el enlace de descarga a quien pueda necesitarla.
        </Text>
        <Button label="Compartir ShiftLog" variant="secondary" onPress={() => Share.share({ message: SHARE_MESSAGE }).catch(() => {})} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, maxWidth: 700, width: '100%', alignSelf: 'center' },
  section: { fontSize: 12, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginHorizontal: 4 },
  groupTitle: { fontSize: 15, fontWeight: '700' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  miniDot: { width: 12, height: 12, borderRadius: 6 },
  pair: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
});
