import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, Image, RefreshControl, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors, storageUrl } from '../config';
import { Card, Chip, FilterChips, HeaderAction, PickerField, SearchInput } from '../shared/ui';

const ACTIVE_FILTERS = [
  { key: '1', label: 'Active' },
  { key: '', label: 'All' },
  { key: '0', label: 'Inactive' },
];

export function ProductsScreen() {
  const nav = useNavigation<any>();
  const { can, company: ownCompany } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [active, setActive] = useState('1');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (can('products.create') ? <HeaderAction title="+ New" onPress={() => nav.navigate('ProductForm')} /> : null),
    });
  }, [nav, can]);

  useEffect(() => {
    if (ownCompany || !(can('shipments.create') || can('products.create') || can('invoices.create') || can('payments.create'))) return;
    api.get('/companies').then((res) => setCompanies(res.data.data || [])).catch(() => setCompanies([]));
  }, [ownCompany, can]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/products', { params: { search: search || undefined, is_active: active || undefined, company_id: companyId ?? undefined } });
      setItems(res.data.data?.data || res.data.data || []);
    } finally {
      setRefreshing(false);
    }
  }, [search, active, companyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SearchInput value={search} onChangeText={setSearch} onSubmit={load} placeholder="Title, SKU, ASIN, FNSKU, brand…" />
      {companies.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <PickerField
            label="Company"
            value={companyId}
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => setCompanyId(v ? Number(v) : null)}
            placeholder="All companies"
            wrapperStyle={{ marginBottom: 0 }}
          />
        </View>
      )}
      <FilterChips options={ACTIVE_FILTERS} value={active} onChange={setActive} />
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        data={items}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={<Text style={styles.empty}>No products</Text>}
        renderItem={({ item }) => {
          const thumb = storageUrl(item.images?.[0]?.path);
          return (
            <Card onPress={() => nav.navigate('ProductDetail', { id: item.id })} style={styles.card}>
              {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.meta}>
                  {item.reference_code} · SKU {item.sku}
                  {item.asin ? ` · ASIN ${item.asin}` : ''}
                </Text>
                {!!item.fnsku && <Text style={styles.meta}>FNSKU {item.fnsku}</Text>}
                {!!item.company?.name && <Text style={styles.meta}>{item.company.name}</Text>}
              </View>
              {!item.is_active && <Chip label="INACTIVE" tone="muted" />}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#E2E8F0' },
  thumbEmpty: { borderWidth: 1, borderColor: colors.border },
  title: { fontWeight: '700', color: colors.navy },
  meta: { color: '#64748b', marginTop: 2, fontSize: 12 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
