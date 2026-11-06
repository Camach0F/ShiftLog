import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';

import { BackupAutoSave } from '@/components/BackupCard';
import { CalendarAutoSync } from '@/components/CalendarCard';
import { useLayout } from '@/lib/layout';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { checkForUpdate } from '@/lib/updates';

export default function TabsLayout() {
  const t = useTheme();
  const { isWide } = useLayout();
  const { ready, state } = useStore();
  const { checkUpdates } = state.settings;

  // Once per launch, after the saved settings are loaded.
  useEffect(() => {
    if (ready && checkUpdates) checkForUpdate();
  }, [ready, checkUpdates]);

  return (
    <>
      <BackupAutoSave />
      <CalendarAutoSync />
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
