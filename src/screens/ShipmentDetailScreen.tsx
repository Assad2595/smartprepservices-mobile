import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors, storageUrl } from '../config';
import { dateLabel, money, serviceTypeLabel } from '../shared/format';
import { normalizeTransitions, statusLabel } from '../shipments/statusConfig';
import { Card, Chip, EmptyRow, KeyValue, PhotoGrid, Section, StatusBadge } from '../shared/ui';
import { showAlert } from '../shared/alert';

const SERVICE_STATUS_CYCLE = ['pending', 'in_progress', 'done'];

function partyLine(p: any): string {
  if (!p) return '';
  return [p.name, p.company_name, p.phone, p.email, p.address_line_1, p.address_line_2, [p.city, p.state, p.zip].filter(Boolean).join(' '), p.country]
    .filter((v) => v && String(v).trim() !== '')
    .join(' · ');
}

export function ShipmentDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const id = route.params?.id;
  const { can } = useAuth();
  const [shipment, setShipment] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get(`/shipments/${id}`);
      setShipment(res.data.data);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!shipment) {
    return (
      <View style={styles.wrap}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  const isAmazonPrep = shipment.service_type === 'amazon_prep';
  const transitions = normalizeTransitions(shipment.allowedTransitions);
  const timeline = shipment.timeline || [];
  const items = shipment.items || [];
  const services = shipment.requested_services || [];
  const boxes = shipment.boxes || [];
  const boxLabels = shipment.box_labels || [];
  const receivingRecords = shipment.receiving_records || [];
  const inspectionReports = shipment.inspection_reports || [];
  const damageReports = shipment.damage_reports || [];
  const labelFiles = shipment.label_files || [];
  const invoices = shipment.invoices || [];
  const payments = shipment.payments || [];
  const canReceive = can('shipments.receive') || can('packages.receive');
  const canInspect = can('shipments.inspect') || can('packages.edit');
  const canPack = can('shipments.packing') || can('master_shipments.edit');
  const canEditServices = can('shipments.packing') || can('shipments.edit') || can('packages.edit');

  async function runAction(key: string, fn: () => Promise<void>) {
    try {
      setBusyKey(key);
      await fn();
      await load();
    } catch (e: any) {
      showAlert('Failed', errorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  function confirmTransition(to: { value: string; label: string }) {
    showAlert(`Move to ${to.label}?`, `Shipment ${shipment.reference_code} will be marked ${to.label}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: to.value === 'CANCELLED' ? 'destructive' : 'default',
        onPress: () => runAction(`transition-${to.value}`, async () => {
          await api.post(`/shipments/${id}/transition`, { to_status: to.value });
        }),
      },
    ]);
  }

  async function cycleServiceStatus(service: any) {
    const idx = SERVICE_STATUS_CYCLE.indexOf(service.status);
    const next = SERVICE_STATUS_CYCLE[(idx + 1) % SERVICE_STATUS_CYCLE.length];
    await runAction(`service-${service.id}`, async () => {
      await api.post(`/shipments/${id}/services/${service.id}/status`, { status: next });
    });
  }

  const boxLabelFor = (boxId: number) => boxLabels.find((l: any) => l.box_id === boxId);

  return (
    <ScrollView style={styles.wrap} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      {/* Header */}
      <Text style={styles.ref}>{shipment.reference_code}</Text>
      <View style={styles.headerRow}>
        <StatusBadge status={shipment.status} />
        <Chip label={serviceTypeLabel(shipment.service_type)} tone="muted" />
      </View>
      <Text style={styles.meta}>{shipment.company?.name}</Text>
      <Text style={styles.metaSmall}>
        Created {dateLabel(shipment.created_at)}
        {shipment.expected_arrival ? ` · expected ${dateLabel(shipment.expected_arrival)}` : ''}
        {shipment.tracking_number ? ` · ${shipment.tracking_number}` : ''}
        {shipment.suite?.suite_number ? ` · suite ${shipment.suite.suite_number}` : ''}
      </Text>
      {!!shipment.notes && <Text style={[styles.metaSmall, { marginTop: 6 }]}>{shipment.notes}</Text>}

      {/* Status transitions — already filtered by the backend for this user */}
      {transitions.length > 0 && (
        <Section title="Advance status">
          {transitions.map((to) => (
            <Pressable
              key={to.value}
              disabled={busyKey === `transition-${to.value}`}
              style={[styles.btn, to.value === 'CANCELLED' && styles.btnDanger]}
              onPress={() => confirmTransition(to)}
            >
              <Text style={styles.btnText}>{to.value === 'CANCELLED' ? 'Cancel shipment' : `Advance → ${to.label}`}</Text>
            </Pressable>
          ))}
        </Section>
      )}

      {/* Quick actions */}
      {(canReceive || canInspect || canPack || can('payments.create')) && (
        <Section title="Record activity">
          <View style={styles.actionsGrid}>
            {canReceive && (
              <Pressable style={styles.actionCard} onPress={() => nav.navigate('Receiving', { shipmentId: id })}>
                <Text style={styles.actionText}>Record{'\n'}Receiving</Text>
              </Pressable>
            )}
            {canInspect && (
              <Pressable style={styles.actionCard} onPress={() => nav.navigate('Inspection', { shipmentId: id })}>
                <Text style={styles.actionText}>Record{'\n'}Inspection</Text>
              </Pressable>
            )}
            {canInspect && (
              <Pressable style={styles.actionCard} onPress={() => nav.navigate('DamageReport', { shipmentId: id })}>
                <Text style={styles.actionText}>Report{'\n'}Damage</Text>
              </Pressable>
            )}
            {canPack && (
              <Pressable style={styles.actionCard} onPress={() => nav.navigate('BoxForm', { shipmentId: id })}>
                <Text style={styles.actionText}>Add{'\n'}Box</Text>
              </Pressable>
            )}
            {can('payments.create') && invoices.some((inv: any) => ['ISSUED', 'PARTIALLY_PAID'].includes(inv.status)) && (
              <Pressable
                style={styles.actionCard}
                onPress={() => nav.navigate('PaymentForm', { invoiceId: invoices.find((inv: any) => ['ISSUED', 'PARTIALLY_PAID'].includes(inv.status))?.id })}
              >
                <Text style={styles.actionText}>Record{'\n'}Payment</Text>
              </Pressable>
            )}
          </View>
        </Section>
      )}

      {/* Products */}
      <Section title="Products">
        {items.length === 0 && <EmptyRow text="No products on this shipment." />}
        {items.map((item: any) => (
          <Pressable key={item.id} style={styles.row} onPress={() => item.product_id && nav.navigate('ProductDetail', { id: item.product_id })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.product?.title || `Item #${item.id}`}</Text>
              <Text style={styles.metaSmall}>
                SKU {item.product?.sku || '—'}
                {item.tracking_number ? ` · ${item.tracking_number}` : ''}
              </Text>
            </View>
            <View style={styles.qtyGroup}>
              <Text style={styles.qtyText}>Exp {item.qty_expected ?? 0}</Text>
              <Text style={styles.qtyText}>Rec {item.qty_received ?? 0}</Text>
              {!!item.qty_damaged && <Text style={[styles.qtyText, { color: colors.danger }]}>Dmg {item.qty_damaged}</Text>}
            </View>
          </Pressable>
        ))}
      </Section>

      {/* Sender / receiver */}
      {(shipment.sender || shipment.receiver) && (
        <Section title="Sender & receiver">
          {shipment.sender && <KeyValue label="Sender" value={partyLine(shipment.sender)} />}
          {shipment.receiver && <KeyValue label="Receiver" value={partyLine(shipment.receiver)} />}
        </Section>
      )}

      {/* Services */}
      <Section title="Services">
        {services.length === 0 && <EmptyRow text="No services selected." />}
        {services.map((svc: any) => {
          const rule = svc.pricing_rule;
          const name = svc.custom_name || rule?.service?.name || rule?.name || 'Service';
          const price = svc.price_override ?? rule?.unit_price;
          return (
            <Pressable
              key={svc.id}
              style={styles.row}
              disabled={!canEditServices || busyKey === `service-${svc.id}`}
              onPress={() => cycleServiceStatus(svc)}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={styles.rowTitle}>{name}</Text>
                  {svc.is_addon && <Chip label="ADD-ON" tone="amber" />}
                </View>
                <Text style={styles.metaSmall}>
                  {rule?.name && rule?.service?.name ? `${rule.name} · ` : ''}qty {svc.quantity}
                  {price != null ? ` · ${money(price, rule?.currency || 'USD')}` : ''}
                </Text>
                {!!svc.notes && <Text style={styles.metaSmall}>{svc.notes}</Text>}
              </View>
              <Chip
                label={statusLabel(svc.status).toUpperCase()}
                tone={svc.status === 'done' ? 'success' : svc.status === 'in_progress' ? 'amber' : 'muted'}
              />
            </Pressable>
          );
        })}
        {services.length > 0 && canEditServices && <Text style={styles.hint}>Tap a service to advance its status.</Text>}
      </Section>

      {/* Label files */}
      {labelFiles.length > 0 && (
        <Section title="Labels & documents">
          {labelFiles.map((f: any) => (
            <KeyValue key={f.id} label={statusLabel(f.purpose)} value={f.original_name || f.file_name || f.path?.split('/').pop() || 'file'} />
          ))}
        </Section>
      )}

      {/* Receiving records */}
      <Section title="Receiving">
        {receivingRecords.length === 0 && <EmptyRow text="Not received yet." />}
        {receivingRecords.map((rec: any) => (
          <Card key={rec.id}>
            <Text style={styles.rowTitle}>{rec.carrier_name || 'Carrier not specified'}</Text>
            <Text style={styles.metaSmall}>
              {rec.tracking_number ? `Tracking ${rec.tracking_number} · ` : ''}
              {rec.package_count} package{rec.package_count === 1 ? '' : 's'} · {dateLabel(rec.received_at, true)}
            </Text>
            {!!rec.notes && <Text style={styles.metaSmall}>{rec.notes}</Text>}
            <View style={{ marginTop: 8 }}>
              <PhotoGrid photos={(rec.photos || []).map((p: any) => ({ id: p.id, url: storageUrl(p.file_asset?.path), caption: p.caption }))} />
            </View>
            {canReceive && (
              <Pressable style={styles.linkBtn} onPress={() => nav.navigate('ReceivingPhoto', { shipmentId: id, recordId: rec.id })}>
                <Text style={styles.linkText}>+ Add photo</Text>
              </Pressable>
            )}
          </Card>
        ))}
      </Section>

      {/* Inspection reports */}
      <Section title="Inspection">
        {inspectionReports.length === 0 && <EmptyRow text="Not inspected yet." />}
        {inspectionReports.map((ins: any) => (
          <Card key={ins.id}>
            <Chip label={ins.passed ? 'PASSED' : 'FAILED'} tone={ins.passed ? 'success' : 'amber'} />
            {!!ins.summary && <Text style={[styles.metaSmall, { marginTop: 6 }]}>{ins.summary}</Text>}
            {ins.inspected_at && <Text style={styles.metaSmall}>{dateLabel(ins.inspected_at, true)}</Text>}
          </Card>
        ))}
      </Section>

      {/* Damage reports */}
      <Section title="Damage reports">
        {damageReports.length === 0 && <EmptyRow text="No damage reported." />}
        {damageReports.map((dmg: any) => (
          <Card key={dmg.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.rowTitle}>Qty {dmg.quantity} damaged</Text>
              {!!dmg.severity && <Chip label={String(dmg.severity).toUpperCase()} tone="amber" />}
            </View>
            {!!dmg.product_sku && <Text style={styles.metaSmall}>SKU {dmg.product_sku}</Text>}
            <Text style={styles.metaSmall}>{dmg.description}</Text>
            <View style={{ marginTop: 8 }}>
              <PhotoGrid photos={(dmg.photos || []).map((p: any) => ({ id: p.id, url: storageUrl(p.file_asset?.path), caption: p.caption }))} />
            </View>
            {canInspect && (
              <Pressable style={styles.linkBtn} onPress={() => nav.navigate('DamagePhoto', { shipmentId: id, reportId: dmg.id })}>
                <Text style={styles.linkText}>+ Add photo</Text>
              </Pressable>
            )}
          </Card>
        ))}
      </Section>

      {/* Boxes */}
      <Section title="Boxes">
        {boxes.length === 0 && <EmptyRow text="Not packed yet." />}
        {boxes.map((box: any) => {
          const label = boxLabelFor(box.id);
          return (
            <Card key={box.id}>
              <Text style={styles.rowTitle}>Box #{box.box_number}</Text>
              <Text style={styles.metaSmall}>
                {box.length_in}×{box.width_in}×{box.height_in} in · {box.weight_lb} lb
              </Text>
              {(box.items || []).map((bi: any) => (
                <Text key={bi.id} style={styles.metaSmall}>
                  · {bi.product?.title || `Item #${bi.product_id}`} × {bi.quantity}
                </Text>
              ))}
              {isAmazonPrep && (
                <View style={{ marginTop: 8 }}>
                  {label ? (
                    <Chip label={`LABEL APPLIED${label.label_code ? ` · ${label.label_code}` : ''}`} tone="success" />
                  ) : can('shipments.packing') ? (
                    <Pressable style={styles.linkBtn} onPress={() => nav.navigate('BoxLabel', { shipmentId: id, boxId: box.id, boxNumber: box.box_number })}>
                      <Text style={styles.linkText}>Apply box label</Text>
                    </Pressable>
                  ) : (
                    <Chip label="LABEL PENDING" tone="muted" />
                  )}
                </View>
              )}
            </Card>
          );
        })}
      </Section>

      {/* Invoices & payments */}
      <Section title="Invoices & payments">
        {invoices.length === 0 && <EmptyRow text="Not invoiced yet." />}
        {invoices.map((inv: any) => (
          <Pressable key={inv.id} style={styles.row} onPress={() => can('invoices.view') && nav.navigate('InvoiceDetail', { id: inv.id })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{inv.invoice_number}</Text>
              <Text style={styles.metaSmall}>
                {money(inv.total_amount, inv.currency)} · paid {money(inv.amount_paid, inv.currency)}
                {inv.due_at ? ` · due ${dateLabel(inv.due_at)}` : ''}
              </Text>
            </View>
            <StatusBadge status={inv.status} />
          </Pressable>
        ))}
        {payments.map((p: any) => (
          <Pressable key={`p-${p.id}`} style={styles.row} onPress={() => can('payments.view') && nav.navigate('PaymentDetail', { id: p.id })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{p.payment_number} · {money(p.amount, p.currency)}</Text>
              <Text style={styles.metaSmall}>{statusLabel(p.method)}{p.reference ? ` · ${p.reference}` : ''} · {dateLabel(p.created_at)}</Text>
            </View>
            <StatusBadge status={p.status} />
          </Pressable>
        ))}
      </Section>

      {/* Timeline */}
      <Section title="History & timeline">
        {timeline.length === 0 && <EmptyRow text="No events yet." />}
        {timeline.map((e: any) => (
          <Card key={e.id}>
            <Text style={styles.eventTitle}>{e.title}</Text>
            {!!e.message && <Text style={styles.metaSmall}>{e.message}</Text>}
            <Text style={styles.actor}>
              {[e.actor_name, e.actor_role, e.actor_type].filter(Boolean).join(' · ')}
            </Text>
            {e.actor_company_name ? <Text style={styles.metaSmall}>{e.actor_company_name}</Text> : null}
            <Text style={styles.when}>{e.created_at_human}</Text>
          </Card>
        ))}
      </Section>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  ref: { fontSize: 22, fontWeight: '700', color: colors.navy },
  headerRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  meta: { color: colors.muted, marginTop: 8 },
  metaSmall: { color: colors.muted, fontSize: 12, marginTop: 2 },
  btn: { backgroundColor: colors.navy, borderRadius: 10, padding: 12, marginTop: 8 },
  btnDanger: { backgroundColor: colors.danger },
  btnText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  actionText: { color: colors.navy, fontWeight: '700', textAlign: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 10,
  },
  rowTitle: { fontWeight: '700', color: colors.navy },
  qtyGroup: { alignItems: 'flex-end', gap: 2 },
  qtyText: { fontSize: 12, color: colors.muted },
  eventTitle: { fontWeight: '700', color: colors.navy },
  actor: { marginTop: 6, fontWeight: '600', color: colors.navy, fontSize: 12 },
  when: { marginTop: 4, color: '#94a3b8', fontSize: 12 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  linkBtn: { marginTop: 8 },
  linkText: { color: colors.amber, fontWeight: '700' },
});
