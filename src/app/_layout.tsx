import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoreProvider } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function RootLayout() {
  const t = useTheme();
  // Screens draw under the navigation bar: their content stops above it, so the last button of a form can be pressed.
  const insets = useSafeAreaInsets();
  return (
    <StoreProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.card },
          headerTintColor: t.accent,
          headerTitleStyle: { color: t.text },
          contentStyle: { backgroundColor: t.bg, paddingBottom: insets.bottom },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Evento' }} />
        <Stack.Screen name="job/[id]" options={{ title: 'Trabajo' }} />
        <Stack.Screen name="category/[id]" options={{ title: 'Categoría' }} />
        <Stack.Screen name="day/[date]" options={{ title: 'Día' }} />
        <Stack.Screen name="entry/[id]" options={{ title: 'Turno' }} />
        <Stack.Screen name="type/[id]" options={{ title: 'Tipo de turno' }} />
        <Stack.Screen name="rotation/[id]" options={{ title: 'Rotación' }} />
      </Stack>
    </StoreProvider>
  );
}
