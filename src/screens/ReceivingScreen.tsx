import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, errorMessage, uploadPhoto } from '../api/client';
import { colors, storageUrl } from '../config';
import { promptPhotoSource } from '../shared/pickPhoto';
import { FormField, PhotoGrid, PrimaryButton, Section } from '../shared/ui';
import { showAlert } from '../shared/alert';

export function ReceivingScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const shipmentId = route.params?.shipmentId;

  const [items, setItems] = useState<any[]>([]);
  const [carrierName, setCarrierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [packageCount, setPackageCount] = useState('1');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState<Record<number, string>>({});
  const [record, setRecord] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api.get(`/shipments/${shipmentId}`);
      const shipmentItems = res.data.data.items || [];
      setItems(shipmentItems);
      const initial: Record<number, string> = {};
      shipmentItems.forEach((it: any) => { initial[it.id] = String(it.qty_received ?? it.qty_expected ?? 0); });
      setQty(initial);
    })();
  }, [shipmentId]);

  async function submit() {
    setBusy(true);
    try {
      const res = await api.post(`/shipments/${shipmentId}/receiving`, {
        carrier_name: carrierName || undefined,
        tracking_number: trackingNumber || undefined,
        package_count: Number(packageCount) || 1,
        notes: notes || undefined,
        items: items.map((it) => ({ shipment_item_id: it.id, qty_received: Number(qty[it.id] || 0) })),
      });
      setRecord(res.data.data);
    } catch (e: any) {
      showAlert('Failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function addPhoto() {
    promptPhotoSource(async (photo) => {
      try {
        const res = await uploadPhoto(`/shipments/${shipmentId}/receiving/${record.id}/photos`, photo);
        setPhotos((prev) => [...prev, res.data.data]);
      } catch (e: any) {
        showAlert('Upload failed', errorMessage(e));
      }
    });
  }

  if (record) {
    return (
      <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Receiving recorded</Text>
        <Text style={styles.meta}>Attach photos of the received packages, then finish.</Text>
        <Section title="Photos">
          <PhotoGrid photos={photos.map((p) => ({ id: p.id, url: storageUrl(p.file_asset?.path) }))} />
        </Section>
        <PrimaryButton title="+ Add photo" onPress={addPhoto} variant="outline" />
        <PrimaryButton title="Done" onPress={() => nav.goBack()} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Record receiving</Text>
      <FormField label="Carrier" value={carrierName} onChangeText={setCarrierName} placeholder="e.g. UPS" />
      <FormField label="Tracking number" value={trackingNumber} onChangeText={setTrackingNumber} autoCapitalize="characters" />
      <FormField label="Package count" value={packageCount} onChangeText={setPackageCount} keyboardType="number-pad" />
      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      <Section title="Quantity received">
        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.product?.title || `Item #${item.id}`}</Text>
              <Text style={styles.meta}>Expected {item.qty_expected ?? 0}</Text>
            </View>
            <FormField
              label="Received"
              value={qty[item.id] ?? ''}
              onChangeText={(v) => setQty((prev) => ({ ...prev, [item.id]: v }))}
              keyboardType="number-pad"
              wrapperStyle={{ marginBottom: 0, minWidth: 90 }}
            />
          </View>
        ))}
      </Section>

      <PrimaryButton title="Save receiving" onPress={submit} busy={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  meta: { color: colors.muted, fontSize: 12 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
    borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  itemTitle: { fontWeight: '700', color: colors.navy },
});
