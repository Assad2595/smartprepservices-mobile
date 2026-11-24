import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../config';
import { dateLabel, money } from '../shared/format';
import { statusLabel } from '../shipments/statusConfig';
import { Card, FilterChips, HeaderAction, SearchInput, StatusBadge } from '../shared/ui';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'SUBMITTED', label: 'To verify' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'REFUNDED', label: 'Refunded' },
];

export function PaymentsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { can } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState<string>(route.params?.status ?? '');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (route.params?.status !== undefined) setStatus(route.params.status);
  }, [route.params?.status]);

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (can('payments.create') ? <HeaderAction title="+ Record" onPress={() => nav.navigate('PaymentForm')} /> : null),
    });
  }, [nav, can]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/payments', { params: { status: status || undefined, search: search || undefined } });
      setItems(res.data.data?.data || res.data.data || []);
    } finally {
      setRefreshing(false);
    }
  }, [status, search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SearchInput value={search} onChangeText={setSearch} onSubmit={load} placeholder="Reference, payment #, invoice # or company…" />
      <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        data={items}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={<Text style={styles.empty}>No payments</Text>}
        renderItem={({ item }) => {
          const companyName = item.company?.name || item.invoice?.company?.name || '—';
          return (
            <Card onPress={() => nav.navigate('PaymentDetail', { id: item.id })}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.payment_number} · {money(item.amount, item.currency)}</Text>
                  <Text style={styles.meta}>{companyName}{item.invoice?.invoice_number ? ` · ${item.invoice.invoice_number}` : ' · balance top-up'}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.metaSmall}>
                {statusLabel(item.method)}{item.reference ? ` · ${item.reference}` : ''} · {dateLabel(item.created_at)}
              </Text>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { fontWeight: '700', color: colors.navy },
  meta: { color: '#64748b', marginTop: 4 },
  metaSmall: { color: colors.muted, fontSize: 12, marginTop: 6 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
