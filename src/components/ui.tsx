import { Ionicons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { fromKey, isValidKey, toKey, todayKey } from '@/lib/dates';
import { normalizeTime } from '@/lib/hours';
import { formatDateInput, formatTimeInput } from '@/lib/input';
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
      android_ripple={{ color: variant === 'primary' ? '#FFFFFF44' : fg + '22' }}
      style={[styles.button, { backgroundColor: bg, borderColor: t.border }]}
    >
      <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, trailing, ...input }: { label: string; trailing?: ReactNode } & TextInputProps) {
  const t = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: t.sub }]}>{label}</Text>
      <View style={[styles.inputBox, { backgroundColor: t.card, borderColor: t.border }]}>
        <TextInput placeholderTextColor={t.sub} {...input} style={[styles.input, { color: t.text }]} />
        {trailing}
      </View>
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A round icon inside a field that opens the system picker. */
function PickerButton({ label, icon, onPress }: { label: string; icon: 'time-outline' | 'calendar-outline'; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      android_ripple={{ color: t.accent + '33', borderless: true, radius: 22 }}
      style={styles.pickerButton}
    >
      <Ionicons name={icon} size={22} color={t.accent} />
    </Pressable>
  );
}

/** "HH:mm" field: type digits with the number keyboard (the colon is added) or pick from the clock. */
export function TimeField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) {
  const openPicker = () => {
    const [h, m] = (normalizeTime(value) ?? '09:00').split(':').map(Number);
    const base = new Date();
    base.setHours(h, m, 0, 0);
    DateTimePickerAndroid.open({
      value: base,
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChangeText(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
      },
    });
  };
  return (
    <Field
      label={label}
      value={value}
      onChangeText={(v) => onChangeText(formatTimeInput(v))}
      keyboardType="number-pad"
      maxLength={5}
      placeholder="HH:mm"
      trailing={<PickerButton label={`Elegir ${label.toLowerCase()}`} icon="time-outline" onPress={openPicker} />}
    />
  );
}

/** "AAAA-MM-DD" field: type digits (the dashes are added) or pick from the calendar. */
export function DateField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) {
  const openPicker = () => {
    DateTimePickerAndroid.open({
      value: fromKey(isValidKey(value) ? value : todayKey()),
      mode: 'date',
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChangeText(toKey(date));
      },
    });
  };
  return (
    <Field
      label={label}
      value={value}
      onChangeText={(v) => onChangeText(formatDateInput(v))}
      keyboardType="number-pad"
      maxLength={10}
      placeholder="AAAA-MM-DD"
      trailing={<PickerButton label={`Elegir ${label.toLowerCase()}`} icon="calendar-outline" onPress={openPicker} />}
    />
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
      android_ripple={{ color: color + '44' }}
      style={[styles.chip, { borderColor: color, backgroundColor: selected ? color : 'transparent' }]}
    >
      <Text style={{ color: selected ? '#FFFFFF' : t.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { borderRadius: 14, padding: 14 },
  button: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 13, alignItems: 'center', overflow: 'hidden' },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  field: { marginBottom: 12, flex: 1 },
  fieldLabel: { fontSize: 13, marginBottom: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  pickerButton: { paddingHorizontal: 10, paddingVertical: 6 },
  chip: { borderWidth: 2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden' },
});
