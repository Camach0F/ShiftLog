import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { BackupAutoSave } from '@/components/BackupCard';
import { CalendarAutoSync } from '@/components/CalendarCard';
import { TourHost } from '@/components/Tour';
import { WhatsNewAuto } from '@/components/WhatsNew';
import { useLayout } from '@/lib/layout';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { checkForUpdate, checkForUpdateIfStale } from '@/lib/updates';

const RECHECK_AFTER_MS = 6 * 60 * 60 * 1000;

export default function TabsLayout() {
  const t = useTheme();
  const { isWide } = useLayout();
  const { ready, state } = useStore();
  const { checkUpdates } = state.settings;

  // Once per launch, after the saved settings are loaded.
  useEffect(() => {
    if (ready && checkUpdates) checkForUpdate();
  }, [ready, checkUpdates]);

  // An app left in the background for days looks again when it comes back.
  useEffect(() => {
    if (!ready || !checkUpdates) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') checkForUpdateIfStale(RECHECK_AFTER_MS);
    });
    return () => sub.remove();
  }, [ready, checkUpdates]);

  return (
    <>
      <BackupAutoSave />
      <CalendarAutoSync />
      <WhatsNewAuto />
      <TourHost />
      <Tabs
        screenOptions={{
          tabBarPosition: isWide ? 'left' : 'bottom',
          // Beside the content the active item is a highlighted row; keep its text readable and the bar narrow.
          ...(isWide && { tabBarActiveBackgroundColor: t.accent + '22', tabBarVariant: 'material' as const }),
          tabBarActiveTintColor: t.accent,
          tabBarInactiveTintColor: t.sub,
          tabBarStyle: isWide ? { backgroundColor: t.card, borderRightColor: t.border, width: 220 } : { backgroundColor: t.card, borderTopColor: t.border },
          headerStyle: { backgroundColor: t.card },
          headerTitleStyle: { color: t.text },
          sceneStyle: { backgroundColor: t.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Agenda', tabBarIcon: ({ focused, size }) => <Ionicons name="calendar" color={focused ? t.accent : t.sub} size={size} /> }}
        />
        <Tabs.Screen
          name="shifts"
          options={{ title: 'Turnos', tabBarIcon: ({ focused, size }) => <Ionicons name="time" color={focused ? t.accent : t.sub} size={size} /> }}
        />
        <Tabs.Screen
          name="summary"
          options={{ title: 'Resumen', tabBarIcon: ({ focused, size }) => <Ionicons name="stats-chart" color={focused ? t.accent : t.sub} size={size} /> }}
        />
        <Tabs.Screen
          name="jobs"
          options={{ title: 'Trabajos', tabBarIcon: ({ focused, size }) => <Ionicons name="briefcase" color={focused ? t.accent : t.sub} size={size} /> }}
        />
      </Tabs>
    </>
  );
}
