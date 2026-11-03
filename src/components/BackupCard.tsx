import { useEffect, useMemo, useRef } from 'react';
import { Alert, AppState, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import {
  backupNow,
  connect,
  disconnect,
  expectRestore,
  fetchBackup,
  getBackupState,
  hashOf,
  initBackup,
  markRestoredAs,
  setAutomatic,
  useBackupState,
} from '@/lib/backup';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

const AUTO_DELAY_MS = 60000;

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'todavía ninguna';

/** Keeps the Drive backup up to date: a minute after the data changes, and when the app goes to the background. */
export function BackupAutoSave() {
  const { state, ready } = useStore();
  const backup = useBackupState();
  const json = useMemo(() => JSON.stringify(state), [state]);
  const latest = useRef({ state, json });
  useEffect(() => {
    latest.current = { state, json };
  });

  useEffect(() => {
    initBackup();
  }, []);

  // A restore replaces the data; what was just downloaded already is in Drive.
  useEffect(() => {
    if (backup.restoreTick > 0) markRestoredAs(latest.current.json);
  }, [backup.restoreTick]);

  const active = ready && backup.enabled && backup.account !== null && backup.conflict === null && backup.busy === 'idle';
  const dirty = backup.lastHash !== hashOf(json);

  useEffect(() => {
    if (!active || !dirty) return;
    const timer = setTimeout(() => backupNow(latest.current.state), AUTO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, dirty, json]);

  useEffect(() => {
    if (!active) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' && getBackupState().lastHash !== hashOf(latest.current.json)) backupNow(latest.current.state);
    });
    return () => sub.remove();
  }, [active]);

  return null;
}

/** Settings card: connect a Google account, see the last backup, back up or restore by hand. */
export function BackupCard() {
  const t = useTheme();
  const { state, restore } = useStore();
  const backup = useBackupState();
  const busy = backup.busy !== 'idle';

  const restoreFromDrive = async () => {
    const result = await fetchBackup();
    if (!result) return;
    Alert.alert('Restaurar copia', `Se reemplazarán los datos de este dispositivo por los de la copia del ${when(result.savedAt)}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Restaurar',
        style: 'destructive',
        onPress: () => {
          restore(result.data);
          expectRestore(result.savedAt);
        },
      },
    ]);
  };

  const confirmDisconnect = () =>
    Alert.alert('Desconectar', 'Se dejarán de hacer copias. La copia que ya está en tu Drive no se borra.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desconectar', onPress: disconnect },
    ]);

  if (!backup.account) {
    return (
      <View>
        <Text style={{ color: t.text, fontSize: 16 }}>Copia de seguridad en Google Drive</Text>
        <Text style={{ color: t.sub, fontSize: 12, marginTop: 2 }}>
          Guarda tus datos en una carpeta oculta de tu propio Drive, que solo ShiftLog puede ver, y recupéralos en otro móvil.
        </Text>
        {backup.error && <Text style={{ color: t.danger, marginTop: 8 }}>{backup.error}</Text>}
        <View style={{ marginTop: 10 }}>
          <Button label={backup.busy === 'connecting' ? 'Conectando…' : 'Conectar con Google'} onPress={() => !busy && connect(state)} />
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={{ color: t.text, fontSize: 16 }}>Conectado como {backup.account}</Text>
      <Text style={{ color: t.sub, marginTop: 2 }}>
        {backup.busy === 'saving' ? 'Guardando copia…' : `Última copia: ${when(backup.lastSyncedAt)}`}
      </Text>
      {backup.error && <Text style={{ color: t.danger, marginTop: 8 }}>{backup.error}</Text>}

      {backup.conflict && (
        <View style={{ marginTop: 12, gap: 10 }}>
          <Text style={{ color: t.text }}>
            Ya hay una copia en tu Drive, hecha desde otro móvil o instalación. Elige cuál quieres conservar.
          </Text>
          <Button label="Restaurar la copia de Drive" onPress={() => !busy && restoreFromDrive()} />
          <Button label="Sobrescribirla con los datos de este móvil" variant="secondary" onPress={() => !busy && backupNow(state, true)} />
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontSize: 16 }}>Copia automática</Text>
          <Text style={{ color: t.sub, fontSize: 12 }}>Un minuto después de cambiar algo, y al salir de la app.</Text>
        </View>
        <Switch value={backup.enabled} onValueChange={setAutomatic} />
      </View>

      <View style={{ marginTop: 14, gap: 10 }}>
        <Button label="Hacer copia ahora" variant="secondary" onPress={() => !busy && backupNow(state)} />
        <Button label="Restaurar desde Drive" variant="secondary" onPress={() => !busy && restoreFromDrive()} />
        <Button label="Desconectar" variant="danger" onPress={confirmDisconnect} />
      </View>
    </View>
  );
}
