import React, { useCallback, useLayoutEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors, storageUrl } from '../config';
import { AdjustStockSheet, HistoryEntry, Stock, StockHistory, StockTiles } from '../inventory/stock';
import { dateLabel } from '../shared/format';
import { Chip, HeaderAction, KeyValue, PhotoGrid, PrimaryButton, Section } from '../shared/ui';

export function ProductDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const id = route.params?.id;
  const { can } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adjusting, setAdjusting] = useState(false);

  // A count correction returns the new figures, so the screen updates without another fetch.
  const applyAdjustment = (result: { stock: Stock; free_to_send: number; history: HistoryEntry[] }) =>
    setProduct((p: any) => ({ ...p, stock: result.stock, free_to_send: result.free_to_send, history: result.history, has_stock: true }));

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get(`/products/${id}`);
      setProduct(res.data.data);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useLayoutEffect(() => {
    nav.setOptions({
      title: product?.reference_code || 'Product',
      headerRight: () => (can('products.edit') && product ? <HeaderAction title="Edit" onPress={() => nav.navigate('ProductForm', { product })} /> : null),
    });
  }, [nav, can, product]);

  if (!product) {
    return (
      <View style={[styles.wrap, styles.content]}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  const weightUnit = product.weight_unit || 'lb';
  const dimUnit = product.dimension_unit || 'in';

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Text style={styles.title}>{product.title}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip label={product.is_active ? 'ACTIVE' : 'INACTIVE'} tone={product.is_active ? 'success' : 'muted'} />
        {!!product.company?.name && <Chip label={product.company.name} tone="muted" />}
      </View>

      <Section title="Stock">
        <StockTiles stock={product.stock} freeToSend={product.free_to_send} />
        {can('products.adjust_stock') && (
          <PrimaryButton title="Adjust stock" variant="outline" onPress={() => setAdjusting(true)} />
        )}
      </Section>

      <Section title="Photos">
        <PhotoGrid photos={(product.images || []).map((img: any) => ({ id: img.id, url: storageUrl(img.path) }))} />
      </Section>

      <Section title="Identifiers">
        <KeyValue label="Reference" value={product.reference_code} />
        <KeyValue label="SKU" value={product.sku} />
        <KeyValue label="ASIN" value={product.asin} />
        <KeyValue label="FNSKU" value={product.fnsku} />
        <KeyValue label="Brand" value={product.brand} />
      </Section>

      <Section title="Measurements">
        <KeyValue label="Weight" value={`${product.weight_lb} ${weightUnit}`} />
        <KeyValue label="Dimensions" value={`${product.length_in} × ${product.width_in} × ${product.height_in} ${dimUnit}`} />
      </Section>

      {!!product.description && (
        <Section title="Description">
          <Text style={styles.body}>{product.description}</Text>
        </Section>
      )}

      <Section title="Stock history">
        <StockHistory entries={product.history || []} onOpenShipment={(shipmentId) => nav.navigate('ShipmentDetail', { id: shipmentId })} />
      </Section>

      <Section title="Record">
        <KeyValue label="Created" value={dateLabel(product.created_at, true)} />
        <KeyValue label="Updated" value={dateLabel(product.updated_at, true)} />
      </Section>
      <View style={{ height: 32 }} />

      <AdjustStockSheet
        productId={product.id}
        title={`${product.reference_code} · ${product.title}`}
        freeToSend={product.free_to_send ?? 0}
        visible={adjusting}
        onClose={() => setAdjusting(false)}
        onDone={applyAdjustment}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy },
  body: { color: '#1B2430', lineHeight: 20 },
});
