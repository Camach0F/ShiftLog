import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, Field } from '@/components/ui';
import { formatDuration, shiftMinutes } from '@/lib/hours';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

/** Optional positive number: empty commits null, an unparsable value commits nothing. */
function LimitField({ label, value, onCommit }: { label: string; value: number | null; onCommit: (v: number | null) => void }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  return (
    <Field
      label={label}
      value={text}
      keyboardType="decimal-pad"
      placeholder="Sin límite"
      onChangeText={(v) => {
        setText(v);
        if (v.trim() === '') return onCommit(null);
        const n = Number(v.replace(',', '.'));
        if (!Number.isNaN(n) && n > 0) onCommit(n);
      }}
    />
  );
}

export default function TypesScreen() {
  const t = useTheme();
  const { state, setSettings } = useStore();
  const { currency, weekStartsOn, overtime } = state.settings;
  const setOvertime = (patch: Partial<typeof overtime>) => setSettings({ overtime: { ...overtime, ...patch } });
  const [multiplier, setMultiplier] = useState(String(overtime.multiplier));

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.section, { color: t.sub }]}>TIPOS DE TURNO</Text>
      <Card style={{ padding: 0 }}>
        {state.types.map((type, i) => (
          <Pressable
            key={type.id}
            onPress={() => router.push(`/type/${type.id}`)}
            style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}
          >
            <View style={[styles.dot, { backgroundColor: type.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{type.name}</Text>
              <Text style={{ color: t.sub }}>
                {type.start === type.end ? 'Sin horas' : `${type.start} – ${type.end} · ${formatDuration(shiftMinutes(type.start, type.end, type.breakMin))}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.sub} />
          </Pressable>
        ))}
      </Card>
      <View style={{ marginTop: 12 }}>
        <Button label="Nuevo tipo de turno" onPress={() => router.push('/type/new')} />
      </View>

      <Text style={[styles.section, { color: t.sub, marginTop: 28 }]}>ROTACIONES</Text>
      {state.rotations.length > 0 && (
        <Card style={{ padding: 0, marginBottom: 12 }}>
          {state.rotations.map((r, i) => (
            <Pressable
              key={r.id}
              onPress={() => router.push(`/rotation/${r.id}`)}
              style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{r.name}</Text>
                <View style={styles.dots}>
                  {r.cycle.map((c, j) => (
                    <View
                      key={j}
                      style={[styles.miniDot, { backgroundColor: state.types.find((x) => x.id === c)?.color ?? t.border }]}
                    />
                  ))}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.sub} />
            </Pressable>
          ))}
        </Card>
      )}
      <Button label="Nueva rotación" variant="secondary" onPress={() => router.push('/rotation/new')} />

      <Text style={[styles.section, { color: t.sub, marginTop: 28 }]}>HORAS EXTRA</Text>
      <Card>
        <View style={styles.switchRow}>
          <Text style={{ color: t.text, flex: 1, fontSize: 16 }}>Calcular horas extra</Text>
          <Switch value={overtime.enabled} onValueChange={(enabled) => setOvertime({ enabled })} />
        </View>
        {overtime.enabled && (
          <View style={{ marginTop: 14 }}>
            <View style={styles.pair}>
              <LimitField label="Límite diario (h)" value={overtime.dailyHours} onCommit={(dailyHours) => setOvertime({ dailyHours })} />
              <LimitField label="Límite semanal (h)" value={overtime.weeklyHours} onCommit={(weeklyHours) => setOvertime({ weeklyHours })} />
            </View>
            <Field
              label="Multiplicador de pago (1.5 = +50%)"
              value={multiplier}
              keyboardType="decimal-pad"
              onChangeText={(v) => {
                setMultiplier(v);
                const n = Number(v.replace(',', '.'));
                if (!Number.isNaN(n) && n >= 1) setOvertime({ multiplier: n });
              }}
            />
            <Text style={{ color: t.sub, fontSize: 12 }}>
              Las horas por encima del límite diario y, después, las que superen el semanal se cuentan como extra. El recargo se aplica sobre la tarifa media de esas horas.
            </Text>
          </View>
        )}
      </Card>

      <Text style={[styles.section, { color: t.sub, marginTop: 28 }]}>AJUSTES</Text>
      <Card>
        <Field label="Moneda" value={currency} maxLength={4} onChangeText={(v) => setSettings({ currency: v })} />
        <Text style={{ color: t.sub, fontSize: 13, marginBottom: 6 }}>La semana empieza en</Text>
        <View style={styles.pair}>
          <View style={{ flex: 1 }}>
            <Button label={`${weekStartsOn === 1 ? '✓ ' : ''}Lunes`} variant="secondary" onPress={() => setSettings({ weekStartsOn: 1 })} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={`${weekStartsOn === 0 ? '✓ ' : ''}Domingo`} variant="secondary" onPress={() => setSettings({ weekStartsOn: 0 })} />
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, maxWidth: 700, width: '100%', alignSelf: 'center' },
  section: { fontSize: 12, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  miniDot: { width: 12, height: 12, borderRadius: 6 },
  pair: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
