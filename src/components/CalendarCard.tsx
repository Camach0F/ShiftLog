import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import {
  disableSync,
  enableSync,
  initCalendarSync,
  listCalendars,
  syncEvents,
  useCalendarSyncState,
  type CalendarOption,
} from '@/lib/calendar';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

const SYNC_DELAY_MS = 1500;

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'todavía ninguna';

/** Keeps the phone's calendar in line with the agenda: a moment after an event is added, changed or deleted. */
export function CalendarAutoSync() {
  const { state, ready } = useStore();
  const sync = useCalendarSyncState();

  useEffect(() => {
    initCalendarSync();
  }, []);

  useEffect(() => {
    if (!ready || !sync.loaded || !sync.enabled) return;
    const timer = setTimeout(() => syncEvents(state.events), SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ready, sync.loaded, sync.enabled, state.events]);

  return null;
}

/** Settings card: pick the phone calendar that receives the agenda events (a Google one shows up in Google Calendar). */
export function CalendarCard() {
  const t = useTheme();
  const { state } = useStore();
  const sync = useCalendarSyncState();
  const [options, setOptions] = useState<CalendarOption[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const choose = async () => {
    setMessage(null);
    try {
      const found = await listCalendars();
      if (found.length === 0) setMessage('No hay ningún calendario en el que se pueda escribir. Añade una cuenta de Google al móvil o crea un calendario.');
      setOptions(found);
    } catch {
      setMessage('ShiftLog no tiene permiso para usar el calendario. Actívalo en los ajustes de Android de la app.');
    }
  };

  const pick = async (option: CalendarOption) => {
    setOptions(null);
    await enableSync(option, state.events);
  };

  const confirmDisable = () =>
    Alert.alert('Dejar de sincronizar', '¿Qué hago con los eventos que ShiftLog ya ha puesto en tu calendario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Dejarlos', onPress: () => disableSync(false) },
      { text: 'Quitarlos', style: 'destructive', onPress: () => disableSync(true) },
    ]);

  const error = sync.error ?? message;

  return (
    <View>
      {sync.enabled ? (
        <>
          <Text style={{ color: t.text, fontSize: 16 }}>Sincronizando con {sync.calendarName}</Text>
          <Text style={{ color: t.sub, marginTop: 2 }}>
            {sync.busy
              ? 'Sincronizando…'
              : `${sync.count} ${sync.count === 1 ? 'evento' : 'eventos'} · última vez: ${when(sync.lastSyncedAt)}`}
          </Text>
        </>
      ) : (
        <>
          <Text style={{ color: t.text, fontSize: 16 }}>Eventos de la agenda en tu calendario</Text>
          <Text style={{ color: t.sub, fontSize: 12, marginTop: 2 }}>
            Copia los eventos de la agenda (no los turnos) en un calendario de tu móvil. Si eliges el de tu cuenta de Google, aparecen también en Google Calendar.
          </Text>
        </>
      )}
      {error && <Text style={{ color: t.danger, marginTop: 8 }}>{error}</Text>}

      {options && options.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: t.sub, fontSize: 13, marginBottom: 6 }}>Elige el calendario</Text>
          {options.map((option, i) => (
            <Pressable
              key={option.id}
              android_ripple={{ color: t.border }}
              onPress={() => pick(option)}
              style={[styles.option, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}
            >
              <Ionicons name={option.google ? 'logo-google' : 'calendar-outline'} size={20} color={t.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 16 }}>{option.title}</Text>
                {option.account !== '' && option.account !== option.title && <Text style={{ color: t.sub }}>{option.account}</Text>}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ marginTop: 12, gap: 10 }}>
        {sync.enabled ? (
          <>
            <Button label="Sincronizar ahora" variant="secondary" onPress={() => !sync.busy && syncEvents(state.events)} />
            <Button label="Cambiar de calendario" variant="secondary" onPress={() => !sync.busy && choose()} />
            <Button label="Dejar de sincronizar" variant="danger" onPress={() => !sync.busy && confirmDisable()} />
          </>
        ) : (
          <Button label={sync.busy ? 'Conectando…' : 'Elegir calendario'} onPress={() => !sync.busy && choose()} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
});
