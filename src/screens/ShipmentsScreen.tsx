import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { colors } from '../config';
import { StatusBadge } from '../shared/ui';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'EXPECTED', label: 'Expected' },
  { key: 'RECEIVED', label: 'Received' },
  { key: 'INSPECTION', label: 'Inspection' },
  { key: 'PACKING', label: 'Packing' },
  { key: 'WAITING_FOR_PAYMENT', label: 'Awaiting payment' },
  { key: 'READY_TO_SHIP', label: 'Ready to ship' },
  { key: 'COMPLETED', label: 'Completed' },
];

export function ShipmentsScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/shipments');
      setItems(res.data.data?.data || res.data.data || []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    if (filter === 'ALL') return items;
    if (filter === 'OPEN') return items.filter((i) => !['COMPLETED', 'CANCELLED'].includes(i.status));
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 10 }}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#64748b', marginTop: 40 }}>No shipments</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => nav.navigate('ShipmentDetail', { id: item.id })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ref}>{item.reference_code}</Text>
              <Text style={styles.meta}>{item.company?.name || '—'}</Text>
            </View>
            <StatusBadge status={item.status} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  filterChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  filterText: { color: colors.navy, fontWeight: '600', fontSize: 12 },
  filterTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border,
  },
  ref: { fontWeight: '700', color: colors.navy },
  meta: { color: '#64748b', marginTop: 4 },
});
