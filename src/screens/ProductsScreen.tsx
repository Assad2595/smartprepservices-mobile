import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, Image, RefreshControl, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors, storageUrl } from '../config';
import { StockLine } from '../inventory/stock';
import { Card, Chip, FilterChips, HeaderAction, PickerField, SearchInput } from '../shared/ui';

// "In stock" is the useful default on a warehouse floor: what is on the shelves now.
const SHOW_FILTERS = [
  { key: 'stock', label: 'In stock' },
  { key: 'active', label: 'All active' },
  { key: 'all', label: 'All' },
  { key: 'inactive', label: 'Inactive' },
];

const SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'reference', label: 'Product ID' },
  { key: 'title', label: 'Name' },
];

export function ProductsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { can, company: ownCompany } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  // Opened from a company: that company is picked, and can be changed with the picker.
  const [companyId, setCompanyId] = useState<number | null>(route.params?.companyId ?? null);

  useEffect(() => {
    if (route.params?.companyId !== undefined) setCompanyId(route.params.companyId);
  }, [route.params?.companyId]);
  const [show, setShow] = useState('stock');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
      const res = await api.get('/products', {
        params: {
          search: search || undefined,
          company_id: companyId ?? undefined,
          is_active: show === 'inactive' ? '0' : show === 'all' ? undefined : '1',
          in_stock: show === 'stock' ? 1 : undefined,
          sort: sort === 'newest' ? undefined : sort,
        },
      });
      setItems(res.data.data?.data || res.data.data || []);
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, [search, show, sort, companyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalInWarehouse = items.reduce((sum, p) => sum + (p.stock?.in_warehouse ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SearchInput value={search} onChangeText={setSearch} onSubmit={load} placeholder="Product ID, name, SKU, ASIN, FNSKU…" />
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
      <FilterChips options={SHOW_FILTERS} value={show} onChange={setShow} />
      <FilterChips options={SORTS} value={sort} onChange={setSort} />
      {loaded && items.length > 0 && (
        <Text style={styles.summary}>
          {items.length} product{items.length === 1 ? '' : 's'} · {totalInWarehouse} units in warehouse
        </Text>
      )}
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        data={items}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={loaded ? <Text style={styles.empty}>{show === 'stock' ? 'Nothing in stock. Try “All active”.' : 'No products'}</Text> : null}
        renderItem={({ item }) => {
          const thumb = storageUrl(item.images?.[0]?.path);
          return (
            <Card onPress={() => nav.navigate('ProductDetail', { id: item.id })} style={styles.card}>
              {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.id}>{item.reference_code}</Text>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  SKU {item.sku}
                  {item.asin ? ` · ASIN ${item.asin}` : ''}
                </Text>
                {!!item.company?.name && <Text style={styles.meta}>{item.company.name}</Text>}
                <StockLine stock={item.stock} />
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
  thumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#E2E8F0' },
  thumbEmpty: { borderWidth: 1, borderColor: colors.border },
  id: { fontSize: 11, fontWeight: '800', color: colors.amber, letterSpacing: 0.4 },
  title: { fontWeight: '700', color: colors.navy, marginTop: 1 },
  meta: { color: '#64748b', marginTop: 2, fontSize: 12 },
  summary: { color: colors.muted, fontSize: 12, paddingHorizontal: 16, paddingBottom: 2 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
