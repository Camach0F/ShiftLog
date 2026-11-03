import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { StoreProvider } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function RootLayout() {
  const t = useTheme();
  return (
    <StoreProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.card },
          headerTintColor: t.accent,
          headerTitleStyle: { color: t.text },
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Evento' }} />
        <Stack.Screen name="job/[id]" options={{ title: 'Trabajo' }} />
        <Stack.Screen name="day/[date]" options={{ title: 'Día' }} />
        <Stack.Screen name="entry/[id]" options={{ title: 'Turno' }} />
        <Stack.Screen name="type/[id]" options={{ title: 'Tipo de turno' }} />
        <Stack.Screen name="rotation/[id]" options={{ title: 'Rotación' }} />
      </Stack>
    </StoreProvider>
  );
}
