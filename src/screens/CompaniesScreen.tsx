import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { colors } from '../config';
import { money } from '../shared/format';
import { Card, Chip, FilterChips, SearchInput } from '../shared/ui';

const SHOW = [
  { key: '1', label: 'Active' },
  { key: '', label: 'All' },
  { key: '0', label: 'Inactive' },
];

/** The clients. A negative balance means the company owes money, as on the web. */
export function CompaniesScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<any[]>([]);
  const [active, setActive] = useState('1');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/companies/directory', { params: { search: search || undefined, is_active: active || undefined } });
      setItems(res.data.data?.data || []);
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, [search, active]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const owed = items.reduce((sum, c) => sum + Math.min(Number(c.balance) || 0, 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SearchInput value={search} onChangeText={setSearch} onSubmit={load} placeholder="Name, contact, email, Amazon seller ID…" />
      <FilterChips options={SHOW} value={active} onChange={setActive} />
      {loaded && items.length > 0 && (
        <Text style={styles.summary}>
          {items.length} compan{items.length === 1 ? 'y' : 'ies'}
          {owed < 0 ? ` · ${money(Math.abs(owed))} owed in total` : ''}
        </Text>
      )}
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        data={items}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={loaded ? <Text style={styles.empty}>No companies</Text> : null}
        renderItem={({ item }) => {
          const balance = Number(item.balance) || 0;
          return (
            <Card onPress={() => nav.navigate('CompanyDetail', { id: item.id })}>
              <View style={styles.top}>
                <View style={styles.who}>
                  <Text style={styles.name}>{item.name}</Text>
                  {!!item.contact_person && <Text style={styles.meta}>{item.contact_person}</Text>}
                  {!!item.email && <Text style={styles.meta} numberOfLines={1}>{item.email}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.balance, balance < 0 && { color: colors.danger }]}>{money(balance)}</Text>
                  <Text style={styles.balanceLabel}>{balance < 0 ? 'owes' : 'balance'}</Text>
                </View>
              </View>
              <View style={styles.bottom}>
                {!item.is_active && <Chip label="INACTIVE" tone="muted" />}
                {item.balance_is_low && <Chip label="LOW BALANCE" tone="amber" />}
                <Text style={styles.counts}>
                  {item.shipments_count ?? 0} shipments · {item.products_count ?? 0} products · {item.users_count ?? 0} users
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
  top: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' },
  who: { flexGrow: 1, flexShrink: 1, flexBasis: 140 },
  name: { fontWeight: '700', color: colors.navy, fontSize: 15 },
  meta: { color: '#7C7768', marginTop: 2, fontSize: 12 },
  balance: { fontWeight: '800', color: colors.navy, fontSize: 16 },
  balanceLabel: { color: colors.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  counts: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  summary: { color: colors.muted, fontSize: 12, paddingHorizontal: 16, paddingBottom: 2 },
  empty: { textAlign: 'center', color: '#7C7768', marginTop: 40 },
});
