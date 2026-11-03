import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useLayout } from '@/lib/layout';
import { useTheme } from '@/lib/theme';

export default function TabsLayout() {
  const t = useTheme();
  const { isWide } = useLayout();
  return (
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
  );
}
