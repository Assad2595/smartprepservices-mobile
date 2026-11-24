import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors, storageUrl } from '../config';
import { dateLabel, money } from '../shared/format';
import { statusLabel } from '../shipments/statusConfig';
import { Card, FormField, KeyValue, PhotoGrid, PrimaryButton, Section, StatusBadge } from '../shared/ui';
import { showAlert } from '../shared/alert';

export function PaymentDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const id = route.params?.id;
  const { can } = useAuth();
  const [payment, setPayment] = useState<any>(null);
  const [note, setNote] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<'verify' | 'reject' | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get(`/payments/${id}`);
      setPayment(res.data.data);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useLayoutEffect(() => {
    nav.setOptions({ title: payment?.payment_number || 'Payment' });
  }, [nav, payment]);

  if (!payment) {
    return (
      <View style={styles.wrap}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  const currency = payment.currency || 'USD';
  const companyName = payment.company?.name || payment.invoice?.company?.name || '—';
  const isSubmitted = payment.status === 'SUBMITTED';
  const proofUrl = storageUrl(payment.proof_file?.path);
  const proofIsImage = /\.(jpe?g|png|webp|gif)$/i.test(payment.proof_file?.path || '');

  function verify() {
    showAlert(
      'Verify this payment?',
      `${money(payment.amount, currency)} will be credited to ${companyName}'s balance${payment.invoice ? ` and applied to ${payment.invoice.invoice_number}` : ''}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            setBusy('verify');
            try {
              await api.post(`/payments/${id}/verify`, { verification_note: note || undefined });
              await load();
            } catch (e: any) {
              showAlert('Could not verify', errorMessage(e));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  function reject() {
    if (!note.trim()) {
      showAlert('Reason needed', 'Say why this payment is being rejected — the company will see this note.');
      return;
    }
    showAlert('Reject this payment?', 'No balance is affected. The company is notified with your note.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setBusy('reject');
          try {
            await api.post(`/payments/${id}/reject`, { verification_note: note.trim() });
            await load();
          } catch (e: any) {
            showAlert('Could not reject', errorMessage(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.wrap} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{money(payment.amount, currency)}</Text>
          <Text style={styles.meta}>{companyName}</Text>
        </View>
        <StatusBadge status={payment.status} />
      </View>

      {isSubmitted && can('payments.verify') && (
        <Section title="Verification">
          <Card>
            <Text style={styles.hint}>Check the reference against the bank/receipt before verifying. Verifying is what credits the company's balance.</Text>
            <FormField label="Note (required to reject)" value={note} onChangeText={setNote} multiline numberOfLines={2} />
            <PrimaryButton title="Verify payment" onPress={verify} busy={busy === 'verify'} disabled={busy === 'reject'} />
            <PrimaryButton title="Reject payment" variant="danger" onPress={reject} busy={busy === 'reject'} disabled={busy === 'verify'} />
          </Card>
        </Section>
      )}

      <Section title="Details">
        <KeyValue label="Payment #" value={payment.payment_number} />
        <KeyValue label="Method" value={statusLabel(payment.method)} />
        <KeyValue label="Reference" value={payment.reference} />
        <KeyValue
          label="Invoice"
          value={
            payment.invoice ? (
              <Pressable onPress={() => can('invoices.view') && nav.navigate('InvoiceDetail', { id: payment.invoice.id })}>
                <Text style={styles.link}>
                  {payment.invoice.invoice_number} · {money(payment.invoice.total_amount, currency)}
                </Text>
              </Pressable>
            ) : (
              'None — balance top-up'
            )
          }
        />
        {payment.shipment && (
          <KeyValue
            label="Shipment"
            value={
              <Pressable onPress={() => nav.navigate('ShipmentDetail', { id: payment.shipment.id })}>
                <Text style={styles.link}>{payment.shipment.reference_code || `#${payment.shipment.id}`}</Text>
              </Pressable>
            }
          />
        )}
        <KeyValue label="Submitted" value={`${dateLabel(payment.created_at, true)}${payment.created_by?.name ? ` by ${payment.created_by.name}` : ''}`} />
        {payment.verified_at && (
          <KeyValue
            label={payment.status === 'REJECTED' ? 'Rejected' : 'Verified'}
            value={`${dateLabel(payment.verified_at, true)}${payment.verified_by?.name ? ` by ${payment.verified_by.name}` : ''}`}
            tone={payment.status === 'REJECTED' ? 'danger' : 'success'}
          />
        )}
        {!!payment.verification_note && <KeyValue label="Verification note" value={payment.verification_note} />}
        {!!payment.notes && <KeyValue label="Notes" value={payment.notes} />}
      </Section>

      <Section title="Proof of payment">
        {!proofUrl && <Text style={styles.hint}>No proof attached.</Text>}
        {proofUrl && proofIsImage && <PhotoGrid photos={[{ id: payment.proof_file.id, url: proofUrl }]} />}
        {proofUrl && !proofIsImage && <KeyValue label="File" value={payment.proof_file?.original_name || payment.proof_file?.path?.split('/').pop()} />}
      </Section>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 26, fontWeight: '700', color: colors.navy },
  meta: { color: colors.muted, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 10 },
  link: { color: colors.amber, fontWeight: '700' },
});
