import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../config';
import { dateLabel, money } from '../shared/format';
import { Card, FilterChips, HeaderAction, SearchInput, StatusBadge } from '../shared/ui';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'ISSUED', label: 'Issued' },
  { key: 'PARTIALLY_PAID', label: 'Partially paid' },
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'PAID', label: 'Paid' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'VOID', label: 'Void' },
];

export function InvoicesScreen() {
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
      headerRight: () => (can('invoices.create') ? <HeaderAction title="+ New" onPress={() => nav.navigate('InvoiceForm')} /> : null),
    });
  }, [nav, can]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      // "Overdue" is a fact about the due date, not a status — the API takes it as its own flag.
      const params = status === 'OVERDUE'
        ? { overdue: '1', search: search || undefined }
        : { status: status || undefined, search: search || undefined };
      const res = await api.get('/invoices', { params });
      setItems(res.data.data?.data || res.data.data || []);
    } finally {
      setRefreshing(false);
    }
  }, [status, search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SearchInput value={search} onChangeText={setSearch} onSubmit={load} placeholder="Invoice #, company or shipment…" />
      <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        data={items}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={<Text style={styles.empty}>No invoices</Text>}
        renderItem={({ item }) => {
          const outstanding = Number(item.total_amount) - Number(item.amount_paid || 0);
          return (
            <Card onPress={() => nav.navigate('InvoiceDetail', { id: item.id })}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.invoice_number}</Text>
                  <Text style={styles.meta}>{item.company?.name || '—'}{item.shipment?.reference_code ? ` · ${item.shipment.reference_code}` : ''}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <View style={styles.rowBottom}>
                <Text style={styles.amount}>{money(item.total_amount, item.currency)}</Text>
                <Text style={styles.metaSmall}>
                  {outstanding > 0 && item.status !== 'VOID' ? `${money(outstanding, item.currency)} outstanding` : 'Settled'}
                  {item.due_at ? ` · due ${dateLabel(item.due_at)}` : ''}
                </Text>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 },
  title: { fontWeight: '700', color: colors.navy },
  meta: { color: '#64748b', marginTop: 4 },
  metaSmall: { color: colors.muted, fontSize: 12, flexShrink: 1, textAlign: 'right' },
  amount: { fontWeight: '700', color: colors.navy, fontSize: 16 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
