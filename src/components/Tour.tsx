import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { DISCORD_URL } from '@/lib/links';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { closeTour, openTour, readTourSeen, TOUR_STEPS, useTourState, writeTourSeen } from '@/lib/tour';

/**
 * The guided tour. It lives in the tabs layout so it can switch tabs behind the card; the Settings
 * button opens it with openTour(). On a fresh install it opens by itself, once.
 */
export function TourHost() {
  const t = useTheme();
  const { state, ready } = useStore();
  const { open } = useTourState();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const startedAt = useRef('/');
  const hasData = state.jobs.length + state.entries.length + state.events.length > 0;

  // A fresh install (nothing saved, tour never seen) starts it; for an existing user it is only in Settings.
  useEffect(() => {
    if (!ready) return;
    (async () => {
      if (await readTourSeen()) return;
      if (hasData) await writeTourSeen();
      else openTour();
    })();
    // Decided once per launch, from the data that was loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!open) return;
    startedAt.current = pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const route = TOUR_STEPS[step].route;
    if (route) router.navigate(route);
  }, [open, step]);

  const close = () => {
    closeTour();
    setStep(0);
    writeTourSeen();
    router.navigate(startedAt.current as '/');
  };

  const current = TOUR_STEPS[step];
  const last = step === TOUR_STEPS.length - 1;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      {/* The card sits at the bottom: keep it clear of the navigation bar (and the taskbar of tablets). */}
      <View style={[styles.backdrop, { paddingBottom: 16 + insets.bottom }]}>
        <View style={[styles.card, { backgroundColor: t.card }]}>
          <View style={styles.top}>
            <Text style={{ color: t.sub, fontSize: 12 }}>
              {step + 1} de {TOUR_STEPS.length}
            </Text>
            {!last && (
              <Pressable accessibilityRole="button" hitSlop={10} onPress={close}>
                <Text style={{ color: t.accent, fontWeight: '600' }}>Saltar guía</Text>
              </Pressable>
            )}
          </View>
          <View style={[styles.icon, { backgroundColor: t.accent + '22' }]}>
            <Ionicons name={current.icon} size={30} color={t.accent} />
          </View>
          <Text style={[styles.title, { color: t.text }]}>{current.title}</Text>
          <Text style={{ color: t.sub, fontSize: 15, lineHeight: 21 }}>{current.text}</Text>

          <View style={styles.dots}>
            {TOUR_STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i === step ? t.accent : t.border }]} />
            ))}
          </View>

          <View style={{ gap: 10 }}>
            {last && <Button label="Unirme al Discord" variant="secondary" onPress={() => Linking.openURL(DISCORD_URL).catch(() => {})} />}
            <View style={styles.pair}>
              {step > 0 && (
                <View style={{ flex: 1 }}>
                  <Button label="Atrás" variant="secondary" onPress={() => setStep(step - 1)} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Button label={last ? 'Empezar' : 'Siguiente'} onPress={() => (last ? close() : setStep(step + 1))} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Light enough to still see the screen the step is about.
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end', padding: 16 },
  card: { borderRadius: 18, padding: 18, maxWidth: 520, width: '100%', alignSelf: 'center', gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pair: { flexDirection: 'row', gap: 10 },
});
