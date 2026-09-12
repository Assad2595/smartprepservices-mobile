import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { colors } from '../config';
import { FormField, PrimaryButton } from '../shared/ui';

export function BoxLabelScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { shipmentId, cartonId, cartonNumber } = route.params;

  const [labelCode, setLabelCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api.post(`/shipments/${shipmentId}/cartons/${cartonId}/box-label`, {
        label_code: labelCode || undefined,
      });
      nav.goBack();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Apply box label — Carton #{cartonNumber}</Text>
      <Text style={styles.meta}>Confirm the label has been physically applied to this carton.</Text>
      <FormField label="Label code (optional)" value={labelCode} onChangeText={setLabelCode} autoCapitalize="characters" />
      <PrimaryButton title="Confirm applied" onPress={submit} busy={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  meta: { color: colors.muted, fontSize: 12, marginBottom: 16 },
});
