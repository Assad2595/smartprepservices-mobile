import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, errorMessage } from '../api/client';
import { colors } from '../config';
import { FormField, PrimaryButton, Section } from '../shared/ui';
import { showAlert } from '../shared/alert';

export function BoxFormScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const shipmentId = route.params?.shipmentId;

  const [items, setItems] = useState<any[]>([]);
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api.get(`/shipments/${shipmentId}`);
      setItems(res.data.data.items || []);
    })();
  }, [shipmentId]);

  async function submit() {
    if (!length || !width || !height || !weight) {
      showAlert('Missing dimensions', 'Enter length, width, height and weight.');
      return;
    }
    setBusy(true);
    try {
      const boxItems = items
        .filter((it) => Number(qty[it.id] || 0) > 0)
        .map((it) => ({ shipment_item_id: it.id, product_id: it.product_id, quantity: Number(qty[it.id]) }));

      await api.post(`/shipments/${shipmentId}/boxes`, {
        length_in: Number(length),
        width_in: Number(width),
        height_in: Number(height),
        weight_lb: Number(weight),
        notes: notes || undefined,
        items: boxItems.length ? boxItems : undefined,
      });
      nav.goBack();
    } catch (e: any) {
      showAlert('Failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Add box</Text>

      <View style={styles.dimsRow}>
        <FormField label="Length (in)" value={length} onChangeText={setLength} keyboardType="decimal-pad" wrapperStyle={styles.dimField} />
        <FormField label="Width (in)" value={width} onChangeText={setWidth} keyboardType="decimal-pad" wrapperStyle={styles.dimField} />
        <FormField label="Height (in)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" wrapperStyle={styles.dimField} />
      </View>
      <FormField label="Weight (lb)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      {items.length > 0 && (
        <Section title="Items in this box (optional)">
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.product?.title || `Item #${item.id}`}</Text>
                <Text style={styles.meta}>Received {item.qty_received ?? 0}</Text>
              </View>
              <FormField
                label="Qty"
                value={qty[item.id] ?? ''}
                onChangeText={(v) => setQty((prev) => ({ ...prev, [item.id]: v }))}
                keyboardType="number-pad"
                wrapperStyle={{ marginBottom: 0, minWidth: 70 }}
              />
            </View>
          ))}
        </Section>
      )}

      <PrimaryButton title="Save box" onPress={submit} busy={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  meta: { color: colors.muted, fontSize: 12 },
  dimsRow: { flexDirection: 'row', gap: 8 },
  dimField: { flex: 1 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
    borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  itemTitle: { fontWeight: '700', color: colors.navy },
});
