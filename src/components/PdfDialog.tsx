import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Chip } from '@/components/ui';
import { endOfMonth, formatMonth, shiftAnchor, startOfMonth } from '@/lib/dates';
import { buildHtml, inCategory, pdfFileName, sharePdf, type CategoryScope } from '@/lib/export';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

/** Asks which month and which category the PDF report covers, then makes and shares it. */
export function PdfDialog({ visible, initialAnchor, onClose }: { visible: boolean; initialAnchor: string; onClose: () => void }) {
  const t = useTheme();
  const { state } = useStore();
  const [anchor, setAnchor] = useState(initialAnchor);
  const [categoryId, setCategoryId] = useState<string | 'all' | 'none'>('all');
  const [busy, setBusy] = useState(false);

  // A category deleted since the last time falls back to all of them.
  const chosen = categoryId === 'all' || categoryId === 'none' || state.categories.some((c) => c.id === categoryId) ? categoryId : 'all';
  const hasUncategorized = state.jobs.some((j) => !j.categoryId);
  const categoryName =
    chosen === 'all' ? undefined : chosen === 'none' ? 'Sin categoría' : state.categories.find((c) => c.id === chosen)?.name;

  const generate = async () => {
    setBusy(true);
    try {
      const scope: CategoryScope = chosen === 'all' ? 'all' : { categoryId: chosen === 'none' ? null : chosen };
      const html = buildHtml(inCategory(state, scope), startOfMonth(anchor), endOfMonth(anchor), formatMonth(anchor), null, categoryName && `Categoría: ${categoryName}`);
      await sharePdf(html, pdfFileName(anchor));
      onClose();
    } catch (e) {
      Alert.alert('No se pudo exportar', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={() => setAnchor(initialAnchor)}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: t.card }]} onPress={() => {}}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: t.text }]}>Generar PDF</Text>

            <Text style={[styles.label, { color: t.sub }]}>Mes</Text>
            <View style={styles.nav}>
              <Pressable accessibilityLabel="Mes anterior" hitSlop={12} onPress={() => setAnchor(shiftAnchor('month', anchor, -1))}>
                <Ionicons name="chevron-back" size={26} color={t.accent} />
              </Pressable>
              <Text style={{ color: t.text, fontSize: 18, fontWeight: '700' }}>{formatMonth(anchor)}</Text>
              <Pressable accessibilityLabel="Mes siguiente" hitSlop={12} onPress={() => setAnchor(shiftAnchor('month', anchor, 1))}>
                <Ionicons name="chevron-forward" size={26} color={t.accent} />
              </Pressable>
            </View>

            {state.categories.length > 0 && (
              <>
                <Text style={[styles.label, { color: t.sub }]}>Categoría</Text>
                <View style={styles.chips}>
                  <Chip label="Todas" color={t.accent} selected={chosen === 'all'} onPress={() => setCategoryId('all')} />
                  {state.categories.map((c) => (
                    <Chip key={c.id} label={c.name} color={t.accent} selected={chosen === c.id} onPress={() => setCategoryId(c.id)} />
                  ))}
                  {hasUncategorized && <Chip label="Sin categoría" color={t.accent} selected={chosen === 'none'} onPress={() => setCategoryId('none')} />}
                </View>
              </>
            )}

            <Text style={{ color: t.sub, fontSize: 12, marginTop: 14 }}>
              Se guardará como «{pdfFileName(anchor)}» y podrás enviarlo o guardarlo desde el menú de compartir.
            </Text>
            <View style={{ marginTop: 16, gap: 10 }}>
              <Button label={busy ? 'Generando…' : 'Generar PDF'} onPress={() => !busy && generate()} />
              <Button label="Cancelar" variant="secondary" onPress={onClose} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 20 },
  sheet: { borderRadius: 16, padding: 18, maxHeight: '90%', maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 14 },
  label: { fontSize: 13, marginBottom: 8, marginTop: 4 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
