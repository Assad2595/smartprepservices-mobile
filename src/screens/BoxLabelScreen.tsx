import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, errorMessage } from '../api/client';
import { colors } from '../config';
import { FormField, PrimaryButton } from '../shared/ui';
import { showAlert } from '../shared/alert';

export function BoxLabelScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { shipmentId, boxId, boxNumber } = route.params;

  const [labelCode, setLabelCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api.post(`/shipments/${shipmentId}/boxes/${boxId}/box-label`, {
        label_code: labelCode || undefined,
      });
      nav.goBack();
    } catch (e: any) {
      showAlert('Failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Apply box label — Box #{boxNumber}</Text>
      <Text style={styles.meta}>Confirm the label has been physically applied to this box.</Text>
      <FormField label="Label code (optional)" value={labelCode} onChangeText={setLabelCode} autoCapitalize="characters" />
      <PrimaryButton title="Confirm applied" onPress={submit} busy={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  meta: { color: colors.muted, fontSize: 12, marginBottom: 16 },
});
