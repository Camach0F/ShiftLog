import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { TypePicker } from '@/components/TypePicker';
import { Button, Chip, Field } from '@/components/ui';
import { isValidKey, todayKey } from '@/lib/dates';
import { normalizeTime, shiftMinutes } from '@/lib/hours';
import { newId, useStore } from '@/lib/store';
import { BUILT_IN_EVENT_TEMPLATES, isBuiltIn } from '@/lib/templates';
import { TYPE_COLORS, useTheme } from '@/lib/theme';
import type { EventTemplate } from '@/lib/types';

export default function EventScreen() {
  const t = useTheme();
  const { id, date: dateParam } = useLocalSearchParams<{ id: string; date?: string }>();
  const { state, saveEvent, deleteEvent, saveEventTemplate, deleteEventTemplate } = useStore();
  const existing = state.events.find((e) => e.id === id);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? dateParam ?? todayKey());
  const [allDay, setAllDay] = useState(existing?.allDay ?? true);
  const [start, setStart] = useState(existing?.start ?? '09:00');
  const [end, setEnd] = useState(existing?.end ?? '10:00');
  const [note, setNote] = useState(existing?.note ?? '');
  const [color, setColor] = useState(existing?.color ?? TYPE_COLORS[3]);
  const [remember, setRemember] = useState(true);

  const templates = [...BUILT_IN_EVENT_TEMPLATES, ...state.eventTemplates];

  const applyTemplate = (template: EventTemplate) => {
    setTitle(template.title);
    setAllDay(template.allDay);
    setStart(template.start);
    setEnd(template.end);
    setNote(template.note);
    setColor(template.color);
  };

  const confirmDeleteTemplate = (template: EventTemplate) => {
    if (isBuiltIn(template)) return;
    Alert.alert('Borrar plantilla', `¿Borrar la plantilla "${template.title}"? Los eventos ya creados no cambian.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => deleteEventTemplate(template.id) },
    ]);
  };

  /** Validates the form; returns what the event looks like or null after warning the user. */
  const read = () => {
    const s = normalizeTime(start);
    const e = normalizeTime(end);
    if (title.trim() === '' || !isValidKey(date)) {
      Alert.alert('Datos no válidos', 'Escribe un título y una fecha con el formato AAAA-MM-DD.');
      return null;
    }
    if (!allDay && (s === null || e === null || shiftMinutes(s, e, 0) === 0 || e < s)) {
      Alert.alert('Horas no válidas', 'Usa el formato HH:mm y que la hora de fin sea posterior a la de inicio.');
      return null;
    }
    return {
      title: title.trim(),
      allDay,
      start: allDay || !s ? '00:00' : s,
      end: allDay || !e ? '00:00' : e,
      note: note.trim(),
      color,
    };
  };

  /** Saves over a template with the same title instead of piling up copies. */
  const rememberAs = (template: Omit<EventTemplate, 'id'>) => {
    const same = state.eventTemplates.find((x) => x.title.toLowerCase() === template.title.toLowerCase());
    saveEventTemplate({ ...template, id: same?.id ?? newId() });
  };

  const save = () => {
    const fields = read();
    if (!fields) return;
    saveEvent({ id: existing?.id ?? newId(), date, ...fields });
    if (!existing && remember) rememberAs(fields);
    router.back();
  };

  const saveAsTemplate = () => {
    const fields = read();
    if (!fields) return;
    rememberAs(fields);
    Alert.alert('Plantilla guardada', `«${fields.title}» está disponible al crear un evento nuevo.`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!existing && (
          <>
            <Text style={[styles.section, { color: t.sub }]}>EMPEZAR DESDE UNA PLANTILLA</Text>
            <View style={styles.chips}>
              {templates.map((template) => (
                <Chip
                  key={template.id}
                  label={template.title}
                  color={template.color}
                  onPress={() => applyTemplate(template)}
                  onLongPress={() => confirmDeleteTemplate(template)}
                />
              ))}
            </View>
            <Text style={{ color: t.sub, fontSize: 12, marginTop: 8, marginBottom: 18 }}>
              Rellena el título, el horario y el color para que no tengas que escribirlos de nuevo. Mantén pulsada una plantilla tuya para borrarla.
            </Text>
          </>
        )}

        <Field label="Título" value={title} onChangeText={setTitle} placeholder="Médico, cumpleaños, reunión…" />
        <Field label="Fecha" value={date} onChangeText={setDate} placeholder="2026-11-03" autoCapitalize="none" />

        <View style={[styles.segmented, { backgroundColor: t.border }]}>
          {[
            { value: true, label: 'Todo el día' },
            { value: false, label: 'Turno' },
          ].map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => setAllDay(opt.value)}
              style={[styles.segment, allDay === opt.value && { backgroundColor: t.card }]}
            >
              <Text style={{ color: t.text, fontWeight: allDay === opt.value ? '700' : '400' }}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
        {!allDay && (
          <>
            {state.types.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.label, { color: t.sub }]}>Usa las horas de uno de tus turnos</Text>
                <TypePicker
                  onPick={(typeId) => {
                    const type = state.types.find((x) => x.id === typeId);
                    if (!type) return;
                    setStart(type.start);
                    setEnd(type.end);
                  }}
                />
              </View>
            )}
            <View style={styles.pair}>
              <Field label="Inicio" value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" />
              <Field label="Fin" value={end} onChangeText={setEnd} keyboardType="numbers-and-punctuation" />
            </View>
          </>
        )}

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

        <Field label="Nota" value={note} onChangeText={setNote} placeholder="Opcional" multiline />

        {!existing && (
          <View style={[styles.switchRow, { marginBottom: 20 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 16 }}>Recordar como plantilla</Text>
              <Text style={{ color: t.sub, fontSize: 12 }}>Para crear otro igual sin volver a escribir el título.</Text>
            </View>
            <Switch value={remember} onValueChange={setRemember} />
          </View>
        )}

        <View style={{ gap: 10 }}>
          <Button label="Guardar" onPress={save} />
          {existing && <Button label="Guardar como plantilla" variant="secondary" onPress={saveAsTemplate} />}
          {existing && (
            <Button
              label="Eliminar evento"
              variant="danger"
              onPress={() => {
                deleteEvent(existing.id);
                router.back();
              }}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, maxWidth: 700, width: '100%', alignSelf: 'center' },
  section: { fontSize: 12, marginBottom: 10, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pair: { flexDirection: 'row', gap: 12 },
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 2, marginBottom: 14 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  label: { fontSize: 13, marginBottom: 8 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
});
