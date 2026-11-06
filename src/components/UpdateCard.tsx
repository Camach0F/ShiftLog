import { Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { checkForUpdate, dismissUpdate, installedVersion, useInstallUpdate, useUpdateState } from '@/lib/updates';

/**
 * Notice for a new version published on GitHub, with a button that downloads it and opens
 * Android's installer. `notice` shows only when there is an update (for the home screen);
 * otherwise the card also reports the version and lets the user check by hand.
 */
export function UpdateCard({ notice = false }: { notice?: boolean }) {
  const t = useTheme();
  const { status, update, dismissed } = useUpdateState();
  const { downloading, install } = useInstallUpdate();

  if (status === 'available' && update) {
    if (notice && dismissed) return null;
    return (
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>Hay una versión nueva: V{update.version}</Text>
        <Text style={{ color: t.sub, marginTop: 2 }}>
          Tienes la {installedVersion} · {update.sizeMb} MB
        </Text>
        {update.notes !== '' && <Text style={{ color: t.text, marginTop: 10 }}>{update.notes}</Text>}
        <View style={{ marginTop: 14, gap: 10 }}>
          <Button label={downloading ? 'Descargando…' : 'Descargar e instalar'} onPress={() => install(update)} />
          {notice && <Button label="Ahora no" variant="secondary" onPress={dismissUpdate} />}
        </View>
        <Text style={{ color: t.sub, fontSize: 12, marginTop: 10 }}>
          Android te pedirá confirmar la instalación. Tus datos se conservan.
        </Text>
      </Card>
    );
  }

  if (notice) return null;

  const message =
    status === 'checking'
      ? 'Buscando…'
      : status === 'upToDate'
        ? 'Tienes la última versión.'
        : status === 'error'
          ? 'No se pudo comprobar. Revisa la conexión.'
          : null;
  return (
    <View>
      <Text style={{ color: t.text, fontSize: 16 }}>Versión {installedVersion}</Text>
      {message && <Text style={{ color: t.sub, marginTop: 2 }}>{message}</Text>}
      <View style={{ marginTop: 10 }}>
        <Button label="Buscar actualizaciones" variant="secondary" onPress={() => status !== 'checking' && checkForUpdate()} />
      </View>
    </View>
  );
}
