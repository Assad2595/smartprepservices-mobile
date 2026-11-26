import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, errorMessage, postForm, FilePart } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../config';
import { money } from '../shared/format';
import { promptPhotoSource } from '../shared/pickPhoto';
import { Chip, FormField, PickerField, PrimaryButton, Section } from '../shared/ui';
import { showAlert } from '../shared/alert';

const METHODS = ['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'ZELLE', 'PAYPAL', 'OTHER'];

/**
 * Record a payment. It is stored as Submitted and only credits the company
 * once someone with payments.verify checks it. An invoice is optional — a
 * company may pay onto its balance ahead of any invoice.
 */
export function PaymentFormScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { company: ownCompany } = useAuth();
  const presetInvoiceId: number | undefined = route.params?.invoiceId;

  const [invoices, setInvoices] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [invoiceId, setInvoiceId] = useState<number | null>(presetInvoiceId ?? null);
  const [companyId, setCompanyId] = useState<number | null>(ownCompany ? Number(ownCompany.id) : null);
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState<FilePart | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Only invoices with something outstanding are worth offering.
    Promise.all([
      api.get('/invoices', { params: { status: 'ISSUED' } }),
      api.get('/invoices', { params: { status: 'PARTIALLY_PAID' } }),
    ])
      .then(([a, b]) => {
        const rows = [...(a.data.data?.data || a.data.data || []), ...(b.data.data?.data || b.data.data || [])];
        setInvoices(rows);
      })
      .catch(() => setInvoices([]));
    if (!ownCompany) {
      api.get('/companies').then((res) => setCompanies(res.data.data || [])).catch(() => setCompanies([]));
    }
  }, [ownCompany]);

  const selectedInvoice = useMemo(() => invoices.find((i) => i.id === invoiceId), [invoices, invoiceId]);
  const outstanding = selectedInvoice ? Math.max(Number(selectedInvoice.total_amount) - Number(selectedInvoice.amount_paid || 0), 0) : 0;

  useEffect(() => {
    if (selectedInvoice) {
      setCompanyId(selectedInvoice.company_id);
      if (!amount) setAmount(outstanding.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInvoice]);

  async function submit() {
    if (!invoiceId && !companyId) return showAlert('Missing company', 'Choose an invoice, or the company paying onto its balance.');
    if (!(Number(amount) > 0)) return showAlert('Invalid amount', 'Enter an amount greater than zero.');
    if (!reference.trim()) return showAlert('Missing reference', 'Enter the receipt or transaction ID — it is what the payment is verified against.');

    setBusy(true);
    try {
      const res = await postForm(
        '/payments',
        {
          invoice_id: invoiceId ?? undefined,
          company_id: invoiceId ? undefined : companyId ?? undefined,
          method,
          amount: Number(amount),
          reference: reference.trim(),
          notes: notes || undefined,
        },
        proof ? [{ field: 'proof', file: proof }] : [],
      );
      nav.replace('PaymentDetail', { id: res.data.data.id });
    } catch (e: any) {
      showAlert('Could not record payment', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <PickerField
        label="Invoice"
        value={invoiceId}
        options={invoices.map((inv) => ({
          value: inv.id,
          label: `${inv.invoice_number} · ${money(inv.total_amount, inv.currency)}`,
          hint: `${inv.company?.name || ''} · ${money(Math.max(Number(inv.total_amount) - Number(inv.amount_paid || 0), 0), inv.currency)} outstanding`,
        }))}
        onChange={(v) => setInvoiceId(v ? Number(v) : null)}
        placeholder="None — pay onto balance"
      />
      {selectedInvoice && (
        <Text style={styles.hint}>
          {selectedInvoice.company?.name} · {money(outstanding, selectedInvoice.currency)} outstanding on {selectedInvoice.invoice_number}
        </Text>
      )}
      {!invoiceId && !ownCompany && (
        <PickerField
          label="Company *"
          value={companyId}
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(v) => setCompanyId(v ? Number(v) : null)}
          placeholder="Which company is paying?"
        />
      )}

      <PickerField label="Method *" value={method} options={METHODS.map((m) => ({ value: m, label: m.replaceAll('_', ' ') }))} onChange={(v) => v && setMethod(String(v))} />
      <FormField label="Amount *" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <FormField label="Reference / transaction ID *" value={reference} onChangeText={setReference} autoCapitalize="characters" />
      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      <Section title="Proof of payment (optional)">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {proof && <Image source={{ uri: proof.uri }} style={styles.thumb} />}
          <View style={{ flex: 1 }}>
            <PrimaryButton title={proof ? 'Replace photo' : 'Attach receipt photo'} variant="outline" onPress={() => promptPhotoSource(setProof)} />
          </View>
          {proof && <Chip label="ATTACHED" tone="success" />}
        </View>
      </Section>

      <PrimaryButton title="Submit payment" onPress={submit} busy={busy} />
      <Text style={[styles.hint, { marginTop: 10 }]}>The payment is recorded as submitted; the company's balance moves only once it is verified.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 12 },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#EFECE3' },
});
