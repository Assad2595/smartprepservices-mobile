import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors, storageUrl } from '../config';
import { actorMayTransitionTo, allowedTransitions, statusLabel } from '../shipments/statusConfig';
import { Chip, EmptyRow, PhotoGrid, PrimaryButton, Section, StatusBadge } from '../shared/ui';

const SERVICE_STATUS_CYCLE = ['pending', 'in_progress', 'done'];

export function ShipmentDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const id = route.params?.id;
  const { can, hasRole, permissions } = useAuth();
  const [shipment, setShipment] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const isSuperAdmin = hasRole('Super Admin');

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [shipmentRes, invoiceRes] = await Promise.all([
        api.get(`/shipments/${id}`),
        api.get('/invoices').catch(() => null),
      ]);
      setShipment(shipmentRes.data.data);
      const allInvoices = invoiceRes?.data.data?.data ?? invoiceRes?.data.data ?? [];
      setInvoices(allInvoices.filter((inv: any) => inv.shipment_id === id));
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

  const transitions: string[] = shipment.allowedTransitions || allowedTransitions(shipment.status);
  const timeline = shipment.timeline || [];
  const items = shipment.items || [];
  const services = shipment.requestedServices || [];
  const cartons = shipment.cartons || [];
  const boxLabels = shipment.boxLabels || [];
  const receivingRecords = shipment.receivingRecords || [];
  const inspectionReports = shipment.inspectionReports || [];
  const damageReports = shipment.damageReports || [];

  async function runAction(key: string, fn: () => Promise<void>) {
    try {
      setBusyKey(key);
      await fn();
      await load();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message || e.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function cycleServiceStatus(service: any) {
    const idx = SERVICE_STATUS_CYCLE.indexOf(service.status);
    const next = SERVICE_STATUS_CYCLE[(idx + 1) % SERVICE_STATUS_CYCLE.length];
    await runAction(`service-${service.id}`, async () => {
      await api.post(`/shipments/${id}/services/${service.id}/status`, { status: next });
    });
  }

  function boxLabelFor(cartonId: number) {
    return boxLabels.find((l: any) => l.carton_id === cartonId);
  }

  function applyBoxLabel(carton: any) {
    nav.navigate('BoxLabel', { shipmentId: id, cartonId: carton.id, cartonNumber: carton.carton_number });
  }

  return (
    <ScrollView style={styles.wrap} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      {/* Header */}
      <Text style={styles.ref}>{shipment.reference_code}</Text>
      <View style={styles.headerRow}>
        <StatusBadge status={shipment.status} />
        <Chip label={shipment.service_type === 'amazon_prep' ? 'Amazon Prep' : shipment.service_type} tone="muted" />
      </View>
      <Text style={styles.meta}>{shipment.company?.name}</Text>
      {shipment.created_at ? (
        <Text style={styles.metaSmall}>Created {new Date(shipment.created_at).toLocaleDateString()}</Text>
      ) : null}

      {/* Status transitions */}
      {transitions.length > 0 && (
        <Section title="Advance status">
          {transitions.map((to) => {
            const allowed = actorMayTransitionTo(to, { isSuperAdmin, permissions });
            return (
              <Pressable
                key={to}
                disabled={!allowed || busyKey === `transition-${to}`}
                style={[styles.btn, !allowed && styles.btnDisabled]}
                onPress={() =>
                  runAction(`transition-${to}`, async () => {
                    await api.post(`/shipments/${id}/transition`, { to_status: to });
                  })
                }
              >
                <Text style={styles.btnText}>
                  {allowed ? `Advance → ${statusLabel(to)}` : `${statusLabel(to)} (needs permission)`}
                </Text>
              </Pressable>
            );
          })}
        </Section>
      )}

      {/* Quick actions */}
      <Section title="Record activity">
        <View style={styles.actionsGrid}>
          {can('shipments.receive') && (
            <Pressable style={styles.actionCard} onPress={() => nav.navigate('Receiving', { shipmentId: id })}>
              <Text style={styles.actionText}>Record{'\n'}Receiving</Text>
            </Pressable>
          )}
          {can('shipments.inspect') && (
            <Pressable style={styles.actionCard} onPress={() => nav.navigate('Inspection', { shipmentId: id })}>
              <Text style={styles.actionText}>Record{'\n'}Inspection</Text>
            </Pressable>
          )}
          {can('shipments.inspect') && (
            <Pressable style={styles.actionCard} onPress={() => nav.navigate('DamageReport', { shipmentId: id })}>
              <Text style={styles.actionText}>Report{'\n'}Damage</Text>
            </Pressable>
          )}
          {can('shipments.packing') && (
            <Pressable style={styles.actionCard} onPress={() => nav.navigate('CartonForm', { shipmentId: id })}>
              <Text style={styles.actionText}>Add{'\n'}Carton</Text>
            </Pressable>
          )}
        </View>
      </Section>

      {/* Products */}
      <Section title="Products">
        {items.length === 0 && <EmptyRow text="No products on this shipment." />}
        {items.map((item: any) => (
          <View key={item.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.product?.title || `Item #${item.id}`}</Text>
              <Text style={styles.metaSmall}>SKU {item.product?.sku || '—'}</Text>
            </View>
            <View style={styles.qtyGroup}>
              <Text style={styles.qtyText}>Exp {item.qty_expected ?? 0}</Text>
              <Text style={styles.qtyText}>Rec {item.qty_received ?? 0}</Text>
              {!!item.qty_damaged && <Text style={[styles.qtyText, { color: colors.danger }]}>Dmg {item.qty_damaged}</Text>}
            </View>
          </View>
        ))}
      </Section>

      {/* Services */}
      <Section title="Services">
        {services.length === 0 && <EmptyRow text="No services selected." />}
        {services.map((svc: any) => (
          <Pressable
            key={svc.id}
            style={styles.row}
            disabled={!can('shipments.packing') || busyKey === `service-${svc.id}`}
            onPress={() => cycleServiceStatus(svc)}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Text style={styles.rowTitle}>{svc.pricingRule?.service?.name || svc.pricingRule?.name || 'Service'}</Text>
                {svc.is_addon && <Chip label="ADD-ON" tone="amber" />}
              </View>
              {!!svc.notes && <Text style={styles.metaSmall}>{svc.notes}</Text>}
            </View>
            <Chip
              label={statusLabel(svc.status).toUpperCase()}
              tone={svc.status === 'done' ? 'success' : svc.status === 'in_progress' ? 'amber' : 'muted'}
            />
          </Pressable>
        ))}
        {services.length > 0 && can('shipments.packing') && (
          <Text style={styles.hint}>Tap a service to advance its status.</Text>
        )}
      </Section>

      {/* Receiving records */}
      <Section title="Receiving">
        {receivingRecords.length === 0 && <EmptyRow text="Not received yet." />}
        {receivingRecords.map((rec: any) => (
          <View key={rec.id} style={styles.card}>
            <Text style={styles.rowTitle}>{rec.carrier_name || 'Carrier not specified'}</Text>
            <Text style={styles.metaSmall}>
              {rec.tracking_number ? `Tracking ${rec.tracking_number} · ` : ''}
              {rec.package_count} package{rec.package_count === 1 ? '' : 's'}
            </Text>
            {!!rec.notes && <Text style={styles.metaSmall}>{rec.notes}</Text>}
            <View style={{ marginTop: 8 }}>
              <PhotoGrid
                photos={(rec.photos || []).map((p: any) => ({ id: p.id, url: storageUrl(p.fileAsset?.path), caption: p.caption }))}
              />
            </View>
            {can('shipments.receive') && (
              <Pressable
                style={styles.linkBtn}
                onPress={() => nav.navigate('ReceivingPhoto', { shipmentId: id, recordId: rec.id })}
              >
                <Text style={styles.linkText}>+ Add photo</Text>
              </Pressable>
            )}
          </View>
        ))}
      </Section>

      {/* Inspection reports */}
      <Section title="Inspection">
        {inspectionReports.length === 0 && <EmptyRow text="Not inspected yet." />}
        {inspectionReports.map((ins: any) => (
          <View key={ins.id} style={styles.card}>
            <Chip label={ins.passed ? 'PASSED' : 'FAILED'} tone={ins.passed ? 'success' : 'amber'} />
            {!!ins.summary && <Text style={[styles.metaSmall, { marginTop: 6 }]}>{ins.summary}</Text>}
            {ins.inspected_at && (
              <Text style={styles.metaSmall}>{new Date(ins.inspected_at).toLocaleString()}</Text>
            )}
          </View>
        ))}
      </Section>

      {/* Damage reports */}
      <Section title="Damage reports">
        {damageReports.length === 0 && <EmptyRow text="No damage reported." />}
        {damageReports.map((dmg: any) => (
          <View key={dmg.id} style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.rowTitle}>Qty {dmg.quantity} damaged</Text>
              {!!dmg.severity && <Chip label={dmg.severity.toUpperCase()} tone="amber" />}
            </View>
            {!!dmg.product_sku && <Text style={styles.metaSmall}>SKU {dmg.product_sku}</Text>}
            <Text style={styles.metaSmall}>{dmg.description}</Text>
            <View style={{ marginTop: 8 }}>
              <PhotoGrid
                photos={(dmg.photos || []).map((p: any) => ({ id: p.id, url: storageUrl(p.fileAsset?.path), caption: p.caption }))}
              />
            </View>
            {can('shipments.inspect') && (
              <Pressable
                style={styles.linkBtn}
                onPress={() => nav.navigate('DamagePhoto', { shipmentId: id, reportId: dmg.id })}
              >
                <Text style={styles.linkText}>+ Add photo</Text>
              </Pressable>
            )}
          </View>
        ))}
      </Section>

      {/* Cartons */}
      <Section title="Cartons">
        {cartons.length === 0 && <EmptyRow text="Not packed yet." />}
        {cartons.map((carton: any) => {
          const label = boxLabelFor(carton.id);
          return (
            <View key={carton.id} style={styles.card}>
              <Text style={styles.rowTitle}>Carton #{carton.carton_number}</Text>
              <Text style={styles.metaSmall}>
                {carton.length_in}×{carton.width_in}×{carton.height_in} in · {carton.weight_lb} lb
              </Text>
              {(carton.items || []).map((ci: any) => (
                <Text key={ci.id} style={styles.metaSmall}>
                  · {ci.product?.title || `Item #${ci.product_id}`} × {ci.quantity}
                </Text>
              ))}
              <View style={{ marginTop: 8 }}>
                {label ? (
                  <Chip label={`LABEL APPLIED${label.label_code ? ` · ${label.label_code}` : ''}`} tone="success" />
                ) : can('shipments.packing') ? (
                  <Pressable style={styles.linkBtn} onPress={() => applyBoxLabel(carton)}>
                    <Text style={styles.linkText}>Apply box label</Text>
                  </Pressable>
                ) : (
                  <Chip label="LABEL PENDING" tone="muted" />
                )}
              </View>
            </View>
          );
        })}
      </Section>

      {/* Invoices */}
      <Section title="Invoice & payment">
        {invoices.length === 0 && <EmptyRow text="Not invoiced yet." />}
        {invoices.map((inv: any) => (
          <View key={inv.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{inv.invoice_number}</Text>
              <Text style={styles.metaSmall}>${inv.total_amount}</Text>
            </View>
            <Chip label={inv.status} tone={inv.status === 'PAID' ? 'success' : 'amber'} />
          </View>
        ))}
      </Section>

      {/* Timeline */}
      <Section title="History & timeline">
        {timeline.length === 0 && <EmptyRow text="No events yet." />}
        {timeline.map((e: any) => (
          <View key={e.id} style={styles.card}>
            <Text style={styles.eventTitle}>{e.title}</Text>
            {!!e.message && <Text style={styles.metaSmall}>{e.message}</Text>}
            <Text style={styles.actor}>
              {e.actor_name} · {e.actor_role} · {e.actor_type}
            </Text>
            {e.actor_company_name ? <Text style={styles.metaSmall}>{e.actor_company_name}</Text> : null}
            <Text style={styles.when}>{e.created_at_human}</Text>
          </View>
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
  btnDisabled: { backgroundColor: '#94A3B8' },
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
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  eventTitle: { fontWeight: '700', color: colors.navy },
  actor: { marginTop: 6, fontWeight: '600', color: colors.navy, fontSize: 12 },
  when: { marginTop: 4, color: '#94a3b8', fontSize: 12 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  linkBtn: { marginTop: 8 },
  linkText: { color: colors.amber, fontWeight: '700' },
});
