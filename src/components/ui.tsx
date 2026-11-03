import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/lib/theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card }, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.accent : t.card;
  const fg = variant === 'primary' ? t.onAccent : variant === 'danger' ? t.danger : t.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, borderColor: t.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...input }: { label: string } & TextInputProps) {
  const t = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: t.sub }]}>{label}</Text>
      <TextInput
        placeholderTextColor={t.sub}
        {...input}
        style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }]}
      />
    </View>
  );
}

/** Optional break of a shift: off by default; when on, asks for the minutes that are subtracted. */
export function BreakField({
  enabled,
  minutes,
  onChange,
}: {
  enabled: boolean;
  minutes: string;
  onChange: (enabled: boolean, minutes: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={styles.breakRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontSize: 16 }}>Descanso</Text>
          <Text style={{ color: t.sub, fontSize: 12 }}>Opcional. Se resta de las horas del turno.</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={(next) => onChange(next, next && (minutes.trim() === '' || minutes === '0') ? '30' : minutes)}
        />
      </View>
      {enabled && (
        <View style={{ marginTop: 10 }}>
          <Field label="Minutos de descanso" value={minutes} onChangeText={(v) => onChange(true, v)} keyboardType="number-pad" />
        </View>
      )}
    </View>
  );
}

export function Chip({
  label,
  color,
  selected,
  onPress,
  onLongPress,
}: {
  label: string;
  color: string;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.chip, { borderColor: color, backgroundColor: selected ? color : 'transparent' }]}
    >
      <Text style={{ color: selected ? '#FFFFFF' : t.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { borderRadius: 14, padding: 14 },
  button: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 13, alignItems: 'center' },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  field: { marginBottom: 12, flex: 1 },
  fieldLabel: { fontSize: 13, marginBottom: 4 },
  input: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  chip: { borderWidth: 2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
});
