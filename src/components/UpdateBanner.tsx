import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme';
import { useInstallUpdate, useUpdateState } from '@/lib/updates';

/**
 * A strip at the top of every main screen while a newer version is published: it says so and
 * has an "Instalar" button that downloads the APK and opens Android's installer.
 */
export function UpdateBanner() {
  const t = useTheme();
  const { status, update } = useUpdateState();
  const { downloading, install } = useInstallUpdate();
  if (status !== 'available' || !update) return null;

  return (
    <View style={[styles.banner, { backgroundColor: t.accent }]}>
      <Ionicons name="arrow-down-circle" size={26} color={t.onAccent} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.onAccent, fontSize: 15, fontWeight: '700' }}>Hay una actualización: V{update.version}</Text>
        <Text style={{ color: t.onAccent, fontSize: 12, opacity: 0.9 }}>Tus datos se conservan.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => install(update)}
        android_ripple={{ color: '#00000022' }}
        style={[styles.button, { backgroundColor: t.onAccent }]}
      >
        <Text style={{ color: t.accent, fontWeight: '700' }}>{downloading ? 'Descargando…' : 'Instalar'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12, marginBottom: 12 },
  button: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, overflow: 'hidden' },
});
