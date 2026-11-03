import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, Chip, Field } from '@/components/ui';
import { formatDuration, shiftMinutes } from '@/lib/hours';
import { defaultOvertime, newId, useStore } from '@/lib/store';
import { BUILT_IN_TEMPLATES, isBuiltIn, templateFromJob } from '@/lib/templates';
import { TYPE_COLORS, useTheme } from '@/lib/theme';
import type { JobTemplate, Overtime, TemplateShift } from '@/lib/types';

/** Optional positive number: empty commits null, an unparsable value commits nothing. */
function LimitField({ label, value, onCommit }: { label: string; value: number | null; onCommit: (v: number | null) => void }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  return (
    <Field
      label={label}
      value={text}
      keyboardType="decimal-pad"
      placeholder="Sin límite"
      onChangeText={(v) => {
        setText(v);
        if (v.trim() === '') return onCommit(null);
        const n = Number(v.replace(',', '.'));
        if (!Number.isNaN(n) && n > 0) onCommit(n);
      }}
    />
  );
}

const hoursLabel = (s: { start: string; end: string; breakMin: number }) =>
  s.start === s.end ? 'Sin horas' : `${s.start} – ${s.end} · ${formatDuration(shiftMinutes(s.start, s.end, s.breakMin))}`;

export default function JobScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, saveJob, deleteJob, saveType, saveTemplate, deleteTemplate } = useStore();
  const existing = state.jobs.find((j) => j.id === id);
  const types = existing ? state.types.filter((x) => x.jobId === existing.id) : [];

  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState(existing?.color ?? TYPE_COLORS[state.jobs.length % TYPE_COLORS.length]);
  const [rate, setRate] = useState(existing?.hourlyRate != null ? String(existing.hourlyRate) : '');
  const [overtime, setOvertime] = useState<Overtime>(existing?.overtime ?? defaultOvertime);
  const [multiplier, setMultiplier] = useState(String(overtime.multiplier));
  // New jobs only: shift types that will be created with the job, and whether to remember it.
  const [pending, setPending] = useState<TemplateShift[]>([]);
  const [remember, setRemember] = useState(true);
  // Bumped when a template fills the form, so the uncontrolled limit fields pick up its values.
  const [applied, setApplied] = useState(0);

  const templates = [...BUILT_IN_TEMPLATES, ...state.templates];

  const applyTemplate = (template: JobTemplate) => {
    setName(template.name);
    setColor(template.color);
    setRate(template.hourlyRate != null ? String(template.hourlyRate) : '');
    setOvertime(template.overtime);
    setMultiplier(String(template.overtime.multiplier));
    setPending(template.shifts);
    setApplied((n) => n + 1);
  };

  const confirmDeleteTemplate = (template: JobTemplate) => {
    if (isBuiltIn(template)) return;
    Alert.alert('Borrar plantilla', `¿Borrar la plantilla "${template.name}"? Los trabajos ya creados no cambian.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => deleteTemplate(template.id) },
    ]);
  };

  const rateNum = rate.trim() === '' ? null : Number(rate.replace(',', '.'));
  const multiplierNum = Number(multiplier.replace(',', '.'));
  const valid =
    name.trim() !== '' && (rateNum === null || (!Number.isNaN(rateNum) && rateNum >= 0)) && !Number.isNaN(multiplierNum) && multiplierNum >= 1;

  /** Saves over a template with the same name instead of piling up copies. */
  const rememberAs = (template: Omit<JobTemplate, 'id'>) => {
    const same = state.templates.find((x) => x.name.toLowerCase() === template.name.toLowerCase());
    saveTemplate({ ...template, id: same?.id ?? newId() });
  };

  const save = () => {
    if (!valid) {
      Alert.alert('Datos no válidos', 'Revisa el nombre, la tarifa y el multiplicador (mínimo 1).');
      return;
    }
    const job = {
      id: existing?.id ?? newId(),
      name: name.trim(),
      color,
      hourlyRate: rateNum,
      overtime: { ...overtime, multiplier: multiplierNum },
    };
    saveJob(job);
    if (existing) {
      router.back();
      return;
    }
    for (const { name, start, end, breakMin } of pending) saveType({ id: newId(), jobId: job.id, name, start, end, breakMin });
    if (remember) rememberAs({ name: job.name, color: job.color, hourlyRate: job.hourlyRate, overtime: job.overtime, shifts: pending });
    // A new job continues on its own page so more shift types can be added right away.
    router.replace({ pathname: '/job/[id]', params: { id: job.id } });
  };

  const saveAsTemplate = () => {
    if (!existing) return;
    rememberAs(templateFromJob(existing, types));
    Alert.alert('Plantilla guardada', `«${existing.name}» está disponible al crear un trabajo nuevo.`);
  };

  const remove = () => {
    if (!existing) return;
    const entries = state.entries.filter((e) => e.jobId === existing.id).length;
    Alert.alert(
      'Eliminar trabajo',
      `Se eliminarán también sus ${types.length} tipos de turno y ${entries} turnos del calendario.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteJob(existing.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!existing && (
          <>
            <Text style={[styles.section, { color: t.sub }]}>EMPEZAR DESDE UNA PLANTILLA</Text>
            <View style={styles.chips}>
              {templates.map((template) => (
                <Chip
                  key={template.id}
                  label={template.name}
                  color={template.color}
                  onPress={() => applyTemplate(template)}
                  onLongPress={() => confirmDeleteTemplate(template)}
                />
              ))}
            </View>
            <Text style={{ color: t.sub, fontSize: 12, marginTop: 8, marginBottom: 18 }}>
              Rellena el nombre, la tarifa y los turnos para que no tengas que escribirlos de nuevo. Mantén pulsada una plantilla tuya para borrarla.
            </Text>
          </>
        )}

        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Restaurante, Hospital, Cliente X…" />

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

        <Field
          label={`Tarifa por hora (${state.settings.currency}) — opcional`}
          value={rate}
          onChangeText={setRate}
          keyboardType="decimal-pad"
          placeholder="Sin tarifa"
        />
        <Text style={{ color: t.sub, fontSize: 12, marginBottom: 16 }}>Es la misma para todos los turnos de este trabajo.</Text>

        <Text style={[styles.section, { color: t.sub }]}>HORAS EXTRA</Text>
        <Card>
          <View style={styles.switchRow}>
            <Text style={{ color: t.text, flex: 1, fontSize: 16 }}>Calcular horas extra</Text>
            <Switch value={overtime.enabled} onValueChange={(enabled) => setOvertime({ ...overtime, enabled })} />
          </View>
          {overtime.enabled && (
            <View style={{ marginTop: 14 }}>
              <View style={styles.pair}>
                <LimitField
                  key={`d${applied}`}
                  label="Límite diario (h)"
                  value={overtime.dailyHours}
                  onCommit={(dailyHours) => setOvertime((o) => ({ ...o, dailyHours }))}
                />
                <LimitField
                  key={`w${applied}`}
                  label="Límite semanal (h)"
                  value={overtime.weeklyHours}
                  onCommit={(weeklyHours) => setOvertime((o) => ({ ...o, weeklyHours }))}
                />
              </View>
              <Field label="Multiplicador de pago (1.5 = +50%)" value={multiplier} onChangeText={setMultiplier} keyboardType="decimal-pad" />
              <Text style={{ color: t.sub, fontSize: 12 }}>
                Las horas por encima del límite diario y, después, las que superen el semanal se cuentan como extra. El recargo se aplica sobre la tarifa media de esas horas.
              </Text>
            </View>
          )}
        </Card>

        <Text style={[styles.section, { color: t.sub, marginTop: 24 }]}>TIPOS DE TURNO</Text>
        {existing ? (
          <>
            {types.length > 0 && (
              <Card style={{ padding: 0, marginBottom: 12 }}>
                {types.map((type, i) => (
                  <Pressable
                    key={type.id}
                    onPress={() => router.push({ pathname: '/type/[id]', params: { id: type.id } })}
                    style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}
                  >
                    <View style={[styles.dot, { backgroundColor: existing.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{type.name}</Text>
                      <Text style={{ color: t.sub }}>{hoursLabel(type)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={t.sub} />
                  </Pressable>
                ))}
              </Card>
            )}
            <Button
              label="Nuevo tipo de turno"
              variant="secondary"
              onPress={() => router.push({ pathname: '/type/[id]', params: { id: 'new', jobId: existing.id } })}
            />
          </>
        ) : pending.length > 0 ? (
          <>
            <Card style={{ padding: 0 }}>
              {pending.map((shift, i) => (
                <View
                  key={`${shift.name}-${i}`}
                  style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}
                >
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{shift.name}</Text>
                    <Text style={{ color: t.sub }}>{hoursLabel(shift)}</Text>
                  </View>
                  <Pressable accessibilityLabel={`Quitar ${shift.name}`} hitSlop={10} onPress={() => setPending((p) => p.filter((_, j) => j !== i))}>
                    <Ionicons name="close-circle" size={22} color={t.sub} />
                  </Pressable>
                </View>
              ))}
            </Card>
            <Text style={{ color: t.sub, fontSize: 12, marginTop: 8 }}>Se crearán al guardar el trabajo. Podrás editarlos después.</Text>
          </>
        ) : (
          <Text style={{ color: t.sub }}>Guarda el trabajo para poder añadirle tipos de turno, o elige antes una plantilla.</Text>
        )}

        {!existing && (
          <View style={[styles.switchRow, { marginTop: 24 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 16 }}>Recordar como plantilla</Text>
              <Text style={{ color: t.sub, fontSize: 12 }}>Para crear otro igual sin volver a escribir el nombre.</Text>
            </View>
            <Switch value={remember} onValueChange={setRemember} />
          </View>
        )}

        <View style={{ marginTop: 28, gap: 10 }}>
          <Button label="Guardar" onPress={save} />
          {existing && <Button label="Guardar como plantilla" variant="secondary" onPress={saveAsTemplate} />}
          {existing && <Button label="Eliminar trabajo" variant="danger" onPress={remove} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, maxWidth: 700, width: '100%', alignSelf: 'center' },
  label: { fontSize: 13, marginBottom: 8 },
  section: { fontSize: 12, marginBottom: 8, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  pair: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
