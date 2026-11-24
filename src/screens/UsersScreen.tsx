import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { colors } from '../config';
import { Card, Chip, FilterChips, PickerField, SearchInput } from '../shared/ui';

const SHOW = [
  { key: '1', label: 'Active' },
  { key: '', label: 'All' },
  { key: '0', label: 'Inactive' },
];

/** Team members and client logins. Read-only here: adding and changing users stays on the web. */
export function UsersScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [role, setRole] = useState('');
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [active, setActive] = useState('1');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/users', {
        params: { search: search || undefined, role: role || undefined, is_active: active || undefined, company_id: companyId ?? undefined },
      });
      setItems(res.data.data?.data || []);
      setRoles(res.data.roles || []);
      setCompanies(res.data.companies || []);
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, [search, role, active, companyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const roleFilters = [{ key: '', label: 'All roles' }, ...roles.map((r) => ({ key: r, label: r }))];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SearchInput value={search} onChangeText={setSearch} onSubmit={load} placeholder="Name, email or phone…" />
      {companies.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <PickerField
            label="Company"
            value={companyId}
            options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
            onChange={(v) => setCompanyId(v ? Number(v) : null)}
            placeholder="All companies"
            wrapperStyle={{ marginBottom: 0 }}
          />
        </View>
      )}
      {roles.length > 0 && <FilterChips options={roleFilters} value={role} onChange={setRole} />}
      <FilterChips options={SHOW} value={active} onChange={setActive} />
      {loaded && items.length > 0 && <Text style={styles.summary}>{items.length} user{items.length === 1 ? '' : 's'}</Text>}
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        data={items}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={loaded ? <Text style={styles.empty}>No users</Text> : null}
        renderItem={({ item }) => (
          <Card onPress={() => nav.navigate('UserDetail', { id: item.id })} style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{`${item.first_name?.[0] ?? ''}${item.last_name?.[0] ?? ''}`.toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{`${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || item.email}</Text>
              <Text style={styles.meta} numberOfLines={1}>{item.email}</Text>
              <View style={styles.chips}>
                {!!item.role && <Chip label={item.role} tone="default" />}
                <Chip label={item.is_internal ? 'TEAM' : item.company?.name || 'CLIENT'} tone="muted" />
                {!item.is_active && <Chip label="INACTIVE" tone="amber" />}
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800' },
  name: { fontWeight: '700', color: colors.navy },
  meta: { color: '#64748b', marginTop: 2, fontSize: 12 },
  chips: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  summary: { color: colors.muted, fontSize: 12, paddingHorizontal: 16, paddingBottom: 2 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
