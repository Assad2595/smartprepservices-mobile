import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../config';
import { dateLabel, serviceTypeLabel } from '../shared/format';
import { Card, Chip, FilterChips, HeaderAction, SearchInput, StatusBadge } from '../shared/ui';

const TYPE_FILTERS = [
  { key: '', label: 'All types' },
  { key: 'amazon_prep', label: 'Amazon Prep' },
  { key: 'receiving_forwarding', label: 'Forwarding' },
];

const STATUS_FILTERS = [
  { key: 'OPEN', label: 'Open' },
  { key: '', label: 'All' },
  { key: 'EXPECTED', label: 'Expected' },
  { key: 'RECEIVED', label: 'Received' },
  { key: 'INSPECTION', label: 'Inspection' },
  { key: 'WAITING_FOR_FNSKU', label: 'Awaiting FNSKU' },
  { key: 'PACKING', label: 'Packing' },
  { key: 'WAITING_FOR_BOX_LABELS', label: 'Awaiting box labels' },
  { key: 'WAITING_FOR_PAYMENT', label: 'Awaiting payment' },
  { key: 'READY_TO_SHIP', label: 'Ready to ship' },
  { key: 'PENDING_CONSOLIDATION', label: 'Pending consolidation' },
  { key: 'CONSOLIDATED', label: 'Consolidated' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export function ShipmentsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { can } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState('');
  const [status, setStatus] = useState<string>(route.params?.status ?? 'OPEN');
  const [search, setSearch] = useState('');

  // A dashboard tile can open this tab pre-filtered.
  useEffect(() => {
    if (route.params?.status !== undefined) setStatus(route.params.status);
  }, [route.params?.status]);

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () =>
        can('shipments.create') || can('packages.create') ? (
          <HeaderAction title="+ New" onPress={() => nav.navigate('ShipmentCreate')} />
        ) : null,
    });
  }, [nav, can]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/shipments', { params: { service_type: type || undefined, status: status || undefined, search: search || undefined } });
      setItems(res.data.data?.data || res.data.data || []);
    } finally {
      setRefreshing(false);
    }
  }, [type, status, search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SearchInput value={search} onChangeText={setSearch} onSubmit={load} placeholder="Reference, tracking, company or product…" />
      <FilterChips options={TYPE_FILTERS} value={type} onChange={setType} />
      <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={<Text style={styles.empty}>No shipments</Text>}
        renderItem={({ item }) => (
          <Card onPress={() => nav.navigate('ShipmentDetail', { id: item.id })}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ref}>{item.reference_code}</Text>
                <Text style={styles.meta}>{item.company?.name || '—'}</Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
            <View style={styles.rowBottom}>
              <Chip label={serviceTypeLabel(item.service_type)} tone="muted" />
              <Text style={styles.metaSmall}>
                {item.items_count ?? 0} product{item.items_count === 1 ? '' : 's'}
                {item.tracking_number ? ` · ${item.tracking_number}` : ''}
                {item.expected_arrival ? ` · due ${dateLabel(item.expected_arrival)}` : ''}
              </Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  ref: { fontWeight: '700', color: colors.navy },
  meta: { color: '#64748b', marginTop: 4 },
  metaSmall: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
