import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, errorMessage } from '../api/client';
import { colors } from '../config';
import { FormField, PrimaryButton } from '../shared/ui';
import { showAlert } from '../shared/alert';

export function InspectionScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const shipmentId = route.params?.shipmentId;

  const [passed, setPassed] = useState<boolean | null>(null);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (passed === null) {
      showAlert('Choose a result', 'Mark this inspection as passed or failed.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/shipments/${shipmentId}/inspection`, { passed, summary: summary || undefined });
      nav.goBack();
    } catch (e: any) {
      showAlert('Failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Record inspection</Text>

      <Text style={styles.label}>Result</Text>
      <Pressable style={[styles.choice, passed === true && styles.choicePass]} onPress={() => setPassed(true)}>
        <Text style={[styles.choiceText, passed === true && styles.choiceTextActive]}>Pass</Text>
      </Pressable>
      <Pressable style={[styles.choice, passed === false && styles.choiceFail]} onPress={() => setPassed(false)}>
        <Text style={[styles.choiceText, passed === false && styles.choiceTextActive]}>Fail</Text>
      </Pressable>

      <FormField label="Summary (optional)" value={summary} onChangeText={setSummary} multiline numberOfLines={4} />

      <PrimaryButton title="Save inspection" onPress={submit} busy={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  label: { marginBottom: 6, color: '#4A4A40', fontWeight: '600', fontSize: 13 },
  choice: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, marginBottom: 8, backgroundColor: '#fff' },
  choicePass: { backgroundColor: colors.success, borderColor: colors.success },
  choiceFail: { backgroundColor: colors.danger, borderColor: colors.danger },
  choiceText: { textAlign: 'center', fontWeight: '700', color: colors.navy },
  choiceTextActive: { color: '#fff' },
});
