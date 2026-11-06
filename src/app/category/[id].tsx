import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Field } from '@/components/ui';
import { newId, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function CategoryScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, saveCategory, deleteCategory, saveJob } = useStore();
  const existing = state.categories.find((c) => c.id === id);
  const [name, setName] = useState(existing?.name ?? '');

  const inside = existing ? state.jobs.filter((j) => j.categoryId === existing.id) : [];
  const elsewhere = existing ? state.jobs.filter((j) => j.categoryId !== existing.id) : [];

  const save = () => {
    const trimmed = name.trim();
    if (trimmed === '') {
      Alert.alert('Datos no válidos', 'Escribe un nombre para la categoría.');
      return;
    }
    if (state.categories.some((c) => c.id !== existing?.id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Ya existe', `Ya tienes una categoría llamada «${trimmed}».`);
      return;
    }
    const category = { id: existing?.id ?? newId(), name: trimmed };
    saveCategory(category);
    if (existing) {
      router.back();
      return;
    }
    // A new category continues on its own page so jobs can be added right away.
    router.replace({ pathname: '/category/[id]', params: { id: category.id } });
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert(
      'Eliminar categoría',
      inside.length > 0
        ? `Sus ${inside.length} ${inside.length === 1 ? 'trabajo pasa' : 'trabajos pasan'} a «Sin categoría». No se borra ningún trabajo ni turno.`
        : 'Se eliminará la categoría.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteCategory(existing.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Hostelería, Clientes, Fines de semana…" />

        <Text style={[styles.section, { color: t.sub }]}>TRABAJOS DE LA CATEGORÍA</Text>
        {!existing ? (
          <Text style={{ color: t.sub }}>Guarda la categoría para poder añadirle trabajos.</Text>
        ) : (
          <>
            {inside.length > 0 && (
              <Card style={{ padding: 0, marginBottom: 12 }}>
                {inside.map((job, i) => (
                  <Pressable
                    key={job.id}
                    android_ripple={{ color: t.border }}
                    onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}
                    style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}
                  >
                    <View style={[styles.dot, { backgroundColor: job.color }]} />
                    <Text style={{ flex: 1, color: t.text, fontSize: 16, fontWeight: '600' }}>{job.name}</Text>
                    <Pressable
                      accessibilityLabel={`Sacar ${job.name} de la categoría`}
                      hitSlop={10}
                      onPress={() => saveJob({ ...job, categoryId: null })}
                    >
                      <Ionicons name="close-circle" size={22} color={t.sub} />
                    </Pressable>
                  </Pressable>
                ))}
              </Card>
            )}
            <Button
              label="Nuevo trabajo en esta categoría"
              onPress={() => router.push({ pathname: '/job/[id]', params: { id: 'new', categoryId: existing.id } })}
            />

            {elsewhere.length > 0 && (
              <>
                <Text style={[styles.section, { color: t.sub, marginTop: 24 }]}>AÑADIR UN TRABAJO QUE YA TIENES</Text>
                <View style={styles.chips}>
                  {elsewhere.map((job) => (
                    <Chip key={job.id} label={job.name} color={job.color} onPress={() => saveJob({ ...job, categoryId: existing.id })} />
                  ))}
                </View>
                <Text style={{ color: t.sub, fontSize: 12, marginTop: 8 }}>Al tocar un trabajo se mueve a esta categoría.</Text>
              </>
            )}
          </>
        )}

        <View style={{ marginTop: 28, gap: 10 }}>
          <Button label="Guardar" onPress={save} />
          {existing && <Button label="Eliminar categoría" variant="danger" onPress={remove} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, maxWidth: 700, width: '100%', alignSelf: 'center' },
  section: { fontSize: 12, marginBottom: 8, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dot: { width: 16, height: 16, borderRadius: 8 },
});
