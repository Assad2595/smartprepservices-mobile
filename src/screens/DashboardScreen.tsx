import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { API_URL, ENV_LABEL, SHOW_ENV_BADGE, colors } from '../config';

const KPI_LABELS: Record<string, string> = {
  openShipments: 'Open shipments',
  awaitingFnsku: 'Awaiting FNSKU',
  awaitingPayment: 'Awaiting payment',
  readyToShip: 'Ready to ship',
  unpaidInvoices: 'Unpaid invoices',
};

export function DashboardScreen() {
  const { user, roles, hasRole, logout } = useAuth();
  const [kpis, setKpis] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/dashboard');
      setKpis(res.data.data || {});
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const isSuperAdmin = hasRole('Super Admin');

  return (
    <ScrollView
      style={styles.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <Text style={styles.hello}>Hello, {user?.firstName || 'there'}</Text>
      <Text style={styles.role}>{(roles.length ? roles : [user?.role]).filter(Boolean).join(' · ')}</Text>
      <Text style={styles.sub}>
        {isSuperAdmin ? 'Full visibility across all companies' : 'Amazon Prep — operator floor'}
      </Text>
      <View style={styles.grid}>
        {Object.entries(kpis).map(([k, v]) => (
          <View key={k} style={styles.card}>
            <Text style={styles.value}>{v}</Text>
            <Text style={styles.label}>{KPI_LABELS[k] ?? k}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={logout} style={styles.logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
      {SHOW_ENV_BADGE && (
        <View style={styles.envBadge}>
          <Text style={styles.envLabel}>{ENV_LABEL}</Text>
          <Text style={styles.envUrl} numberOfLines={1}>
            {API_URL}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  hello: { fontSize: 22, fontWeight: '700', color: colors.navy },
  role: { color: colors.amber, fontWeight: '600', marginTop: 4 },
  sub: { color: '#64748b', marginBottom: 16, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  value: { fontSize: 28, fontWeight: '700', color: colors.navy },
  label: { color: '#64748b', marginTop: 4, fontSize: 12 },
  logout: { marginTop: 24, alignSelf: 'flex-start', padding: 10 },
  logoutText: { color: '#b91c1c', fontWeight: '600' },
  // Which backend this build talks to — hidden in production via SHOW_ENV_BADGE.
  envBadge: {
    marginTop: 8,
    marginBottom: 24,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: colors.border,
  },
  envLabel: { fontSize: 11, fontWeight: '700', color: colors.navy, letterSpacing: 0.5 },
  envUrl: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
