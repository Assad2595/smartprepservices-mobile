import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors, monoFont, statusColor } from '../config';
import { dateLabel, serviceTypeLabel } from '../shared/format';
import { CompanyFilterBanner } from '../shared/CompanyFilterBanner';
import { DateBox } from '../shared/DateBox';
import { Card, FilterChips, HeaderAction, PickerField, SearchInput, StatusBadge } from '../shared/ui';

/**
 * The portal's Inbound and Outbound lists, with the same filters
 * (ShipmentList.jsx in the dashboard):
 *  - Inbound: stage tabs All / New / Received / Completed / Cancelled, plus
 *    Overdue (the web's Overdue tile), company, and expected arrival from/to.
 *  - Outbound: any number of stages at once (the web's Status dropdown),
 *    company, and single products / with bundles.
 * A stage made of several statuses is sent comma-separated; the API filters on all.
 */
const INBOUND_STAGES = [
  { key: '', label: 'All' },
  { key: 'EXPECTED', label: 'New' },
  { key: 'RECEIVED,INSPECTION', label: 'Received' },
  { key: 'COMPLETED,DELIVERED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'LATE', label: 'Overdue' },
];

const OUTBOUND_STAGES = [
  { key: 'INSPECTION', label: 'New' },
  { key: 'FNSKU_APPLIED,PACKING,BOX_LABELS_APPLIED,PROCESSING,PENDING_CONSOLIDATION,CONSOLIDATED', label: 'Preparing' },
  { key: 'WAITING_FOR_FNSKU', label: 'Waiting for FNSKU' },
  { key: 'WAITING_FOR_BOX_LABELS', label: 'Waiting for box label' },
  { key: 'WAITING_FOR_CUSTOMER', label: 'Waiting for customer' },
  { key: 'WAITING_FOR_PAYMENT,PAYMENT_VERIFIED', label: 'Payment' },
  { key: 'READY_TO_SHIP,READY_FOR_SHIPMENT', label: 'Ready to ship' },
  { key: 'SHIPPED,DISPATCHED', label: 'Shipped' },
  { key: 'COMPLETED,DELIVERED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const KINDS = [
  { key: '', label: 'Single products and bundles' },
  { key: 'single', label: 'Single products only' },
  { key: 'bundles', label: 'With bundles' },
];

/** A dashboard tile passes one status; on Outbound, pick the stage holding it. */
const stageFor = (status?: string) => OUTBOUND_STAGES.filter((s) => status && s.key.split(',').includes(status)).map((s) => s.key);

export function ShipmentsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { can } = useAuth();
  const direction: 'inbound' | 'outbound' = route.name === 'Outbound' ? 'outbound' : 'inbound';
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<string>(route.params?.status ?? ''); // Inbound: one tab
  const [picked, setPicked] = useState<string[]>(stageFor(route.params?.status)); // Outbound: several
  const [kind, setKind] = useState('');
  const [arriveFrom, setArriveFrom] = useState('');
  const [arriveTo, setArriveTo] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  // Opened from a company: only that company's shipments, until cleared.
  const [companyId, setCompanyId] = useState<number | null>(route.params?.companyId ?? null);

  useEffect(() => {
    if (route.params?.status === undefined) return;
    if (direction === 'inbound') setStage(route.params.status);
    else setPicked(stageFor(route.params.status));
  }, [route.params?.status, direction]);

  useEffect(() => {
    if (route.params?.companyId !== undefined) setCompanyId(route.params.companyId);
  }, [route.params?.companyId]);

  useEffect(() => {
    api.get('/companies').then((res) => setCompanies(res.data.data || [])).catch(() => setCompanies([]));
  }, []);

  // New shipments are inbound: the goods arrive first. Outbound ones are made on the portal.
  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () =>
        direction === 'inbound' && (can('shipments.create') || can('packages.create')) ? (
          <HeaderAction title="+ New" onPress={() => nav.navigate('ShipmentCreate')} />
        ) : null,
    });
  }, [nav, can, direction]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const late = direction === 'inbound' && stage === 'LATE';
      const status = direction === 'inbound' ? (late ? '' : stage) : picked.join(',');
      const res = await api.get('/shipments', {
        params: {
          direction,
          status: status || undefined,
          late: late ? 1 : undefined,
          search: search || undefined,
          company_id: companyId ?? undefined,
          arrive_from: direction === 'inbound' ? arriveFrom || undefined : undefined,
          arrive_to: direction === 'inbound' ? arriveTo || undefined : undefined,
          kind: direction === 'outbound' ? kind || undefined : undefined,
        },
      });
      setItems(res.data.data?.data || res.data.data || []);
    } finally {
      setRefreshing(false);
    }
  }, [direction, stage, picked, search, companyId, arriveFrom, arriveTo, kind]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const togglePicked = (key: string) => setPicked((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  const companyName = companies.find((c) => c.id === companyId)?.name ?? route.params?.companyName;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SearchInput value={search} onChangeText={setSearch} onSubmit={load} placeholder="Search shipment, tracking, product ID, SKU, FNSKU or ASIN" scannable />

      {direction === 'inbound' ? (
        <FilterChips options={INBOUND_STAGES} value={stage} onChange={setStage} />
      ) : (
        // Several stages at once, like the web's Status dropdown. None picked = all.
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          <Pressable style={[styles.chip, picked.length === 0 && styles.chipOn]} onPress={() => setPicked([])}>
            <Text style={[styles.chipText, picked.length === 0 && styles.chipTextOn]}>All</Text>
          </Pressable>
          {OUTBOUND_STAGES.map((s) => {
            const on = picked.includes(s.key);
            return (
              <Pressable key={s.key} style={[styles.chip, on && styles.chipOn]} onPress={() => togglePicked(s.key)} accessibilityState={{ selected: on }}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{on ? '✓ ' : ''}{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.filters}>
        {companies.length > 0 ? (
          <PickerField
            label=""
            value={companyId}
            options={[{ value: '', label: 'All companies' }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
            onChange={(v) => setCompanyId(v ? Number(v) : null)}
            placeholder="All companies"
            wrapperStyle={{ marginBottom: 0 }}
          />
        ) : companyId !== null ? (
          <CompanyFilterBanner name={companyName} onClear={() => setCompanyId(null)} />
        ) : null}

        {direction === 'inbound' ? (
          <View style={styles.dates}>
            <Text style={styles.datesLabel}>Arrives</Text>
            <DateBox value={arriveFrom} onChange={setArriveFrom} placeholder="From" />
            <Text style={styles.datesLabel}>to</Text>
            <DateBox value={arriveTo} onChange={setArriveTo} placeholder="To" />
            {(arriveFrom || arriveTo) ? (
              <Pressable onPress={() => { setArriveFrom(''); setArriveTo(''); }} hitSlop={8} accessibilityLabel="Clear dates">
                <Ionicons name="close-circle" size={20} color={colors.muted2} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <FilterChips options={KINDS} value={kind} onChange={setKind} />
        )}
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: 24 }}
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={<Text style={styles.empty}>{refreshing ? '' : 'No shipments here.'}</Text>}
        renderItem={({ item }) => (
          <Card edge={statusColor(item.status)} onPress={() => nav.navigate('ShipmentDetail', { id: item.id })}>
            <View style={styles.rowTop}>
              <Text style={styles.title} numberOfLines={2}>
                <Text style={styles.company}>{item.company?.name || '—'}</Text>
                <Text style={styles.dot}> · </Text>
                <Text style={styles.ref}>{item.reference_code}</Text>
              </Text>
              <StatusBadge status={item.status} />
            </View>
            <View style={styles.rowLine}>
              <Ionicons name="car-outline" size={14} color={colors.muted} />
              {item.tracking_number ? (
                <Text style={styles.tracking} numberOfLines={1}>{item.tracking_number}</Text>
              ) : (
                <Text style={styles.meta}>No tracking yet</Text>
              )}
              <Text style={styles.dot}>·</Text>
              <Text style={styles.meta} numberOfLines={1}>{serviceTypeLabel(item.service_type)}</Text>
            </View>
            <View style={styles.rowBottom}>
              <Text style={styles.meta} numberOfLines={1}>
                {item.expected_arrival ? `Arrives ${dateLabel(item.expected_arrival)}` : ' '}
              </Text>
              <Text style={styles.count}>
                {item.items_count ?? 0} product{item.items_count === 1 ? '' : 's'}
              </Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: colors.panel },
  chipOn: { backgroundColor: colors.amber, borderColor: colors.amber },
  chipText: { color: colors.muted, fontWeight: '600', fontSize: 12 },
  chipTextOn: { color: colors.navy, fontWeight: '700' },
  filters: { paddingHorizontal: 16, gap: 8 },
  dates: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  datesLabel: { color: colors.muted, fontSize: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1 },
  company: { fontWeight: '700', fontSize: 14, color: colors.navy },
  ref: { fontFamily: monoFont, fontWeight: '600', fontSize: 12, color: colors.muted },
  dot: { color: colors.muted2, fontSize: 12 },
  rowLine: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9, paddingTop: 9,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  tracking: { fontFamily: monoFont, fontSize: 11, color: colors.navy, flexShrink: 1 },
  rowBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 9, paddingTop: 9,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  meta: { color: colors.muted, fontSize: 11.5, flexShrink: 1 },
  count: { fontFamily: monoFont, fontWeight: '700', fontSize: 12, color: colors.navy },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
});
