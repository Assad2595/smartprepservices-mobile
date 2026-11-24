import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api, errorMessage } from '../api/client';
import { colors } from '../config';
import { FormField, PickerField, PrimaryButton } from '../shared/ui';
import { showAlert } from '../shared/alert';

/**
 * Manual invoice — a charge with nothing to do with a shipment (a storage
 * fee, a one-off adjustment). Shipment invoices generate themselves when the
 * shipment reaches WAITING_FOR_PAYMENT.
 */
export function InvoiceFormScreen() {
  const nav = useNavigation<any>();
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/companies').then((res) => setCompanies(res.data.data || [])).catch(() => setCompanies([]));
  }, []);

  async function submit() {
    if (!companyId) return showAlert('Missing company', 'Select the company to invoice.');
    if (!description.trim()) return showAlert('Missing description', 'Say what this invoice is for.');
    if (!(Number(amount) > 0)) return showAlert('Invalid amount', 'Enter an amount greater than zero.');

    setBusy(true);
    try {
      const res = await api.post('/invoices', {
        company_id: companyId,
        description: description.trim(),
        total_amount: Number(amount),
        due_at: dueAt || undefined,
        notes: notes || undefined,
      });
      nav.replace('InvoiceDetail', { id: res.data.data.id });
    } catch (e: any) {
      showAlert('Could not create invoice', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.hint}>
        For a charge that is not tied to a shipment. The company is debited for the full amount as soon as the invoice is issued.
      </Text>
      <PickerField label="Company *" value={companyId} options={companies.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => setCompanyId(v ? Number(v) : null)} />
      <FormField label="Description *" value={description} onChangeText={setDescription} placeholder="e.g. Storage fee — September" />
      <FormField label="Amount (USD) *" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <FormField label="Due date (YYYY-MM-DD)" value={dueAt} onChangeText={setDueAt} placeholder="Defaults to 14 days from today" autoCapitalize="none" />
      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      <PrimaryButton title="Issue invoice" onPress={submit} busy={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 14 },
});
