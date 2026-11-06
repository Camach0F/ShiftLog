import { useEffect, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { CHANGELOG, releaseFor, type Release } from '@/lib/changelog';
import { DISCORD_URL } from '@/lib/links';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { installedVersion } from '@/lib/updates';
import { readLastSeenVersion, shouldShowWhatsNew, writeLastSeenVersion } from '@/lib/whatsnew';

/** The notes to show for the installed version; a build without its own entry falls back to the newest one. */
export const currentRelease = (): Release => releaseFor(installedVersion) ?? CHANGELOG[0];

/** What changed in a version, a reminder that support is on Discord, and a button to go there. */
export function WhatsNewDialog({ visible, release, onClose }: { visible: boolean; release: Release; onClose: () => void }) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: t.card }]}>
          <ScrollView>
            <Text style={[styles.title, { color: t.text }]}>Novedades de la versión {release.version}</Text>
            <View style={{ gap: 8 }}>
              {release.changes.map((change) => (
                <View key={change} style={styles.change}>
                  <Text style={{ color: t.accent, fontSize: 16 }}>•</Text>
                  <Text style={{ color: t.text, flex: 1, fontSize: 15 }}>{change}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.support, { backgroundColor: t.bg, borderColor: t.border }]}>
              <Text style={{ color: t.text, fontWeight: '700' }}>Soporte en Discord</Text>
              <Text style={{ color: t.sub, marginTop: 2 }}>
                Estaremos dando soporte en nuestro Discord. Si tienes dudas, encuentras un fallo o quieres proponer algo, pásate por allí.
              </Text>
            </View>
            <View style={{ marginTop: 16, gap: 10 }}>
              <Button label="Unirme al Discord" variant="secondary" onPress={() => Linking.openURL(DISCORD_URL).catch(() => {})} />
              <Button label="Aceptar" onPress={onClose} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Shows the popup once after the app was updated. A fresh install records the version and shows nothing. */
export function WhatsNewAuto() {
  const { state, ready } = useStore();
  const [visible, setVisible] = useState(false);
  const release = releaseFor(installedVersion);
  const hasData = state.jobs.length + state.entries.length + state.events.length > 0;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const stored = await readLastSeenVersion();
      if (cancelled) return;
      if (shouldShowWhatsNew(stored, installedVersion, hasData, release !== null)) setVisible(true);
      else if (stored !== installedVersion) await writeLastSeenVersion(installedVersion);
    })();
    return () => {
      cancelled = true;
    };
    // Decided once per launch, from the data that was loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!release) return null;
  return (
    <WhatsNewDialog
      visible={visible}
      release={release}
      onClose={() => {
        setVisible(false);
        writeLastSeenVersion(installedVersion);
      }}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 20 },
  sheet: { borderRadius: 16, padding: 18, maxHeight: '90%', maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 14 },
  change: { flexDirection: 'row', gap: 8 },
  support: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, marginTop: 16 },
});
