import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/lib/theme';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.sub,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        headerStyle: { backgroundColor: t.card },
        headerTitleStyle: { color: t.text },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Calendario', tabBarIcon: ({ focused, size }) => <Ionicons name="calendar" color={focused ? t.accent : t.sub} size={size} /> }}
      />
      <Tabs.Screen
        name="summary"
        options={{ title: 'Resumen', tabBarIcon: ({ focused, size }) => <Ionicons name="stats-chart" color={focused ? t.accent : t.sub} size={size} /> }}
      />
      <Tabs.Screen
        name="types"
        options={{ title: 'Turnos', tabBarIcon: ({ focused, size }) => <Ionicons name="color-palette" color={focused ? t.accent : t.sub} size={size} /> }}
      />
    </Tabs>
  );
}
