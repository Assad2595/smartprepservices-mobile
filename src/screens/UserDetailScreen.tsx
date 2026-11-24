import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../config';
import { dateLabel } from '../shared/format';
import { Chip, KeyValue, Section } from '../shared/ui';

export function UserDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { can } = useAuth();
  const id = route.params?.id;
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get(`/users/${id}`);
      setUser(res.data.data);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const fullName = user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email : '';

  useLayoutEffect(() => {
    nav.setOptions({ title: fullName || 'User' });
  }, [nav, fullName]);

  if (!user) {
    return (
      <View style={styles.wrap}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{`${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.title}>{fullName}</Text>
        <View style={styles.chips}>
          {!!user.role && <Chip label={user.role} tone="default" />}
          <Chip label={user.is_active ? 'ACTIVE' : 'INACTIVE'} tone={user.is_active ? 'success' : 'amber'} />
          <Chip label={user.is_internal ? 'TEAM' : 'CLIENT'} tone="muted" />
        </View>
      </View>

      <Section title="Contact">
        <KeyValue label="Email" value={user.email} />
        <KeyValue label="Phone" value={user.phone} />
        <View style={styles.actions}>
          {!!user.email && (
            <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(`mailto:${user.email}`)}>
              <Text style={styles.actionText}>Email</Text>
            </Pressable>
          )}
          {!!user.phone && (
            <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${user.phone}`)}>
              <Text style={styles.actionText}>Call</Text>
            </Pressable>
          )}
        </View>
      </Section>

      <Section title="Account">
        <KeyValue label="Role" value={user.role} />
        <KeyValue label="Company" value={user.company?.name ?? (user.is_internal ? 'Smart Prep team' : '—')} />
        <KeyValue label="Last signed in" value={user.last_login_at ? dateLabel(user.last_login_at, true) : 'Never'} />
        <KeyValue label="Added" value={dateLabel(user.created_at)} />
      </Section>

      {!!user.company?.id && can('companies.view') && (
        <Pressable style={styles.openCompany} onPress={() => nav.navigate('CompanyDetail', { id: user.company.id })}>
          <Text style={styles.openCompanyText}>Open {user.company.name}</Text>
        </Pressable>
      )}

      <Text style={styles.note}>Adding users, changing roles and switching accounts off are done on the web portal.</Text>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  head: { alignItems: 'center', marginTop: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy, marginTop: 10, textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.navy, paddingVertical: 10, alignItems: 'center' },
  actionText: { color: colors.navy, fontWeight: '700' },
  openCompany: { marginTop: 18, backgroundColor: colors.navy, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  openCompanyText: { color: '#fff', fontWeight: '700' },
  note: { color: colors.muted, fontSize: 12, marginTop: 14, textAlign: 'center' },
});
