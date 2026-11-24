import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, errorMessage, uploadPhoto } from '../api/client';
import { colors, storageUrl } from '../config';
import { promptPhotoSource } from '../shared/pickPhoto';
import { FormField, PhotoGrid, PrimaryButton, Section } from '../shared/ui';
import { showAlert } from '../shared/alert';

const SEVERITIES = ['minor', 'major', 'critical'];

export function DamageReportScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const shipmentId = route.params?.shipmentId;

  const [skus, setSkus] = useState<string[]>([]);
  const [productSku, setProductSku] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<string | undefined>(undefined);
  const [report, setReport] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api.get(`/shipments/${shipmentId}`);
      const items = res.data.data.items || [];
      setSkus(Array.from(new Set(items.map((i: any) => i.product?.sku).filter(Boolean))));
    })();
  }, [shipmentId]);

  async function submit() {
    if (!description.trim()) {
      showAlert('Description required', 'Describe the damage before saving.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(`/shipments/${shipmentId}/damage-reports`, {
        product_sku: productSku,
        quantity: Number(quantity) || 1,
        description,
        severity,
      });
      setReport(res.data.data);
    } catch (e: any) {
      showAlert('Failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function addPhoto() {
    promptPhotoSource(async (photo) => {
      try {
        const res = await uploadPhoto(`/shipments/${shipmentId}/damage-reports/${report.id}/photos`, photo);
        setPhotos((prev) => [...prev, res.data.data]);
      } catch (e: any) {
        showAlert('Upload failed', errorMessage(e));
      }
    });
  }

  if (report) {
    return (
      <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Damage report saved</Text>
        <Text style={styles.meta}>Attach photos of the damage, then finish.</Text>
        <Section title="Photos">
          <PhotoGrid photos={photos.map((p) => ({ id: p.id, url: storageUrl(p.file_asset?.path) }))} />
        </Section>
        <PrimaryButton title="+ Add photo" onPress={addPhoto} variant="outline" />
        <PrimaryButton title="Done" onPress={() => nav.goBack()} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Report damage</Text>

      {skus.length > 0 && (
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Product SKU (optional)</Text>
          <View style={styles.chipsRow}>
            {skus.map((sku) => (
              <Pressable
                key={sku}
                style={[styles.chip, productSku === sku && styles.chipActive]}
                onPress={() => setProductSku(productSku === sku ? undefined : sku)}
              >
                <Text style={[styles.chipText, productSku === sku && styles.chipTextActive]}>{sku}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <FormField label="Quantity damaged" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
      <FormField label="Description" value={description} onChangeText={setDescription} multiline numberOfLines={4} />

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Severity (optional)</Text>
        <View style={styles.chipsRow}>
          {SEVERITIES.map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, severity === s && styles.chipActive]}
              onPress={() => setSeverity(severity === s ? undefined : s)}
            >
              <Text style={[styles.chipText, severity === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <PrimaryButton title="Save damage report" onPress={submit} busy={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  meta: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  fieldWrap: { marginBottom: 14 },
  label: { marginBottom: 6, color: '#334155', fontWeight: '600', fontSize: 13 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#fff' },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { color: colors.navy, fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: '#fff' },
});
