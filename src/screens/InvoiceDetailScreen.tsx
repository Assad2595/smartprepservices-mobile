import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../config';
import { dateLabel, money } from '../shared/format';
import { statusLabel } from '../shipments/statusConfig';
import { Card, EmptyRow, KeyValue, PrimaryButton, Section, StatusBadge } from '../shared/ui';
import { showAlert } from '../shared/alert';

export function InvoiceDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const id = route.params?.id;
  const { can } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data.data);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useLayoutEffect(() => {
    nav.setOptions({ title: invoice?.invoice_number || 'Invoice' });
  }, [nav, invoice]);

  if (!invoice) {
    return (
      <View style={[styles.wrap, styles.content]}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  const currency = invoice.currency || 'USD';
  const lines = invoice.line_items || [];
  const payments = invoice.payments || [];
  const outstanding = Math.max(Number(invoice.total_amount) - Number(invoice.amount_paid || 0), 0);
  const isOpen = ['ISSUED', 'PARTIALLY_PAID'].includes(invoice.status);

  function settleFromBalance() {
    showAlert(
      'Settle from balance?',
      `${invoice.invoice_number} will be marked paid using credit already on ${invoice.company?.name}'s account. No new charge is made.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle',
          onPress: async () => {
            setBusy(true);
            try {
              await api.post(`/invoices/${id}/settle-from-balance`);
              await load();
            } catch (e: any) {
              showAlert('Could not settle', errorMessage(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <View style={styles.headerRow}>
        <View style={styles.headerMain}>
          <Text style={styles.title}>{invoice.invoice_number}</Text>
          <Text style={styles.meta}>{invoice.company?.name || '—'}</Text>
        </View>
        <StatusBadge status={invoice.status} />
      </View>

      <Card style={{ marginTop: 14 }}>
        <Text style={styles.total}>{money(invoice.total_amount, currency)}</Text>
        <Text style={styles.metaSmall}>
          Paid {money(invoice.amount_paid, currency)}
          {outstanding > 0 && invoice.status !== 'VOID' ? ` · ${money(outstanding, currency)} outstanding` : ''}
        </Text>
        {invoice.settled_from_balance_at && <Text style={styles.metaSmall}>Settled from balance {dateLabel(invoice.settled_from_balance_at, true)}</Text>}
      </Card>

      {isOpen && (can('payments.create') || invoice.can_settle_from_balance) && (
        <Section title="Actions">
          {can('payments.create') && (
            <PrimaryButton title="Record payment" onPress={() => nav.navigate('PaymentForm', { invoiceId: invoice.id })} />
          )}
          {invoice.can_settle_from_balance && (
            <PrimaryButton title="Settle from company balance" variant="outline" onPress={settleFromBalance} busy={busy} />
          )}
        </Section>
      )}

      <Section title="Details">
        <KeyValue label="Issued" value={dateLabel(invoice.issued_at)} />
        <KeyValue label="Due" value={dateLabel(invoice.due_at)} tone={isOpen && invoice.due_at && new Date(invoice.due_at) < new Date() ? 'danger' : undefined} />
        {invoice.shipment && (
          <KeyValue
            label="Shipment"
            value={
              <Pressable onPress={() => nav.navigate('ShipmentDetail', { id: invoice.shipment.id })}>
                <Text style={styles.link}>{invoice.shipment.reference_code || `#${invoice.shipment.id}`}</Text>
              </Pressable>
            }
          />
        )}
        {invoice.company?.balance !== undefined && (
          <KeyValue label="Company balance" value={money(invoice.company.balance, currency)} tone={Number(invoice.company.balance) < 0 ? 'danger' : 'success'} />
        )}
        {!!invoice.notes && <KeyValue label="Notes" value={invoice.notes} />}
      </Section>

      <Section title="Line items">
        {lines.length === 0 && <EmptyRow text="No line items." />}
        {lines.map((line: any) => (
          <View key={line.id} style={styles.lineRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineTitle}>{line.description}</Text>
              <Text style={styles.metaSmall}>{Number(line.quantity)} × {money(line.unit_price, currency)}</Text>
            </View>
            <Text style={styles.lineTotal}>{money(line.line_total, currency)}</Text>
          </View>
        ))}
        {lines.length > 0 && (
          <>
            <KeyValue label="Subtotal" value={money(invoice.subtotal, currency)} />
            {Number(invoice.tax_amount) > 0 && <KeyValue label="Tax" value={money(invoice.tax_amount, currency)} />}
            <KeyValue label="Total" value={money(invoice.total_amount, currency)} />
          </>
        )}
      </Section>

      <Section title="Payments">
        {payments.length === 0 && <EmptyRow text="No payments recorded." />}
        {payments.map((p: any) => (
          <Pressable key={p.id} style={styles.lineRow} onPress={() => can('payments.view') && nav.navigate('PaymentDetail', { id: p.id })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineTitle}>{p.payment_number} · {money(p.amount, p.currency || currency)}</Text>
              <Text style={styles.metaSmall}>{statusLabel(p.method)}{p.reference ? ` · ${p.reference}` : ''} · {dateLabel(p.created_at)}</Text>
            </View>
            <StatusBadge status={p.status} />
          </Pressable>
        ))}
      </Section>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  // Keeps at least this much room; otherwise the badge drops to the next line.
  headerMain: { flexGrow: 1, flexShrink: 1, flexBasis: 160 },
  title: { fontSize: 22, fontWeight: '700', color: colors.navy },
  meta: { color: colors.muted, marginTop: 4 },
  metaSmall: { color: colors.muted, fontSize: 12, marginTop: 2 },
  total: { fontSize: 26, fontWeight: '700', color: colors.navy },
  link: { color: colors.amber, fontWeight: '700' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  lineTitle: { fontWeight: '600', color: colors.navy },
  lineTotal: { fontWeight: '700', color: colors.navy },
});
