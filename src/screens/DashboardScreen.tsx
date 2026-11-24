import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { API_URL, ENV_LABEL, SHOW_ENV_BADGE, colors } from '../config';

/** Label and, where it makes sense, the list to open when the tile is tapped. */
const KPIS: Record<string, { label: string; tab?: string; params?: Record<string, string> }> = {
  openShipments: { label: 'Open shipments', tab: 'Shipments', params: { status: 'OPEN' } },
  expected: { label: 'Expected', tab: 'Shipments', params: { status: 'EXPECTED' } },
  awaitingFnsku: { label: 'Awaiting FNSKU', tab: 'Shipments', params: { status: 'WAITING_FOR_FNSKU' } },
  awaitingPayment: { label: 'Awaiting payment', tab: 'Shipments', params: { status: 'WAITING_FOR_PAYMENT' } },
  readyToShip: { label: 'Ready to ship', tab: 'Shipments', params: { status: 'READY_TO_SHIP' } },
  unpaidInvoices: { label: 'Unpaid invoices', tab: 'Invoices', params: { status: 'ISSUED' } },
  paymentsToVerify: { label: 'Payments to verify', tab: 'Payments', params: { status: 'SUBMITTED' } },
};

export function DashboardScreen() {
  const nav = useNavigation<any>();
  const { user, company, roles, can, logout } = useAuth();
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

  const tabVisible = (tab?: string) =>
    tab === 'Shipments' ? can('shipments.view') || can('packages.view')
      : tab === 'Invoices' ? can('invoices.view')
        : tab === 'Payments' ? can('payments.view')
          : false;

  return (
    <ScrollView style={styles.wrap} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Text style={styles.hello}>Hello, {user?.firstName || 'there'}</Text>
      <Text style={styles.role}>{(roles.length ? roles : [user?.role]).filter(Boolean).join(' · ')}</Text>
      <Text style={styles.sub}>{company ? company.name : 'All companies'}</Text>

      <View style={styles.grid}>
        {Object.entries(kpis).map(([k, v]) => {
          const meta = KPIS[k] ?? { label: k };
          const openable = tabVisible(meta.tab);
          return (
            <Pressable
              key={k}
              style={styles.card}
              disabled={!openable}
              onPress={() => meta.tab && nav.navigate('Main', { screen: meta.tab, params: meta.params })}
            >
              <Text style={styles.value}>{v}</Text>
              <Text style={styles.label}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.quick}>
        {(can('shipments.create') || can('packages.create')) && (
          <Pressable style={styles.quickBtn} onPress={() => nav.navigate('ShipmentCreate')}>
            <Text style={styles.quickText}>+ New shipment</Text>
          </Pressable>
        )}
        {can('products.create') && (
          <Pressable style={styles.quickBtn} onPress={() => nav.navigate('ProductForm')}>
            <Text style={styles.quickText}>+ New product</Text>
          </Pressable>
        )}
        {can('payments.create') && (
          <Pressable style={styles.quickBtn} onPress={() => nav.navigate('PaymentForm')}>
            <Text style={styles.quickText}>+ Record payment</Text>
          </Pressable>
        )}
        {can('invoices.create') && (
          <Pressable style={styles.quickBtn} onPress={() => nav.navigate('InvoiceForm')}>
            <Text style={styles.quickText}>+ New invoice</Text>
          </Pressable>
        )}
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
  quick: { marginTop: 18, gap: 8 },
  quickBtn: { backgroundColor: colors.navy, borderRadius: 10, padding: 13, alignItems: 'center' },
  quickText: { color: '#fff', fontWeight: '700' },
  logout: { marginTop: 24, alignSelf: 'flex-start', padding: 10 },
  logoutText: { color: '#b91c1c', fontWeight: '600' },
  // Which backend this build talks to — hidden in prod via SHOW_ENV_BADGE.
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
