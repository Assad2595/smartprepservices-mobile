import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { setAppConfig } from '../shared/appConfig';
import { useAuth } from '../auth/AuthContext';
import { API_URL, ENV_LABEL, SHOW_ENV_BADGE, colors } from '../config';

/**
 * Label, colour and the list a tile opens. Inbound and Outbound are tabs;
 * Invoices and Payments open from More. Open shipments spans both lists, so
 * it only counts.
 */
const KPIS: Record<string, { label: string; tab?: string; stack?: string; params?: Record<string, string>; tone?: string }> = {
  openShipments: { label: 'Open shipments' },
  expected: { label: 'Expected in', tab: 'Inbound', params: { status: 'EXPECTED' } },
  awaitingFnsku: { label: 'Waiting for FNSKU', tab: 'Outbound', params: { status: 'WAITING_FOR_FNSKU' }, tone: colors.warn },
  awaitingPayment: { label: 'Waiting for payment', tab: 'Outbound', params: { status: 'WAITING_FOR_PAYMENT' }, tone: colors.warn },
  readyToShip: { label: 'Ready to ship', tab: 'Outbound', params: { status: 'READY_TO_SHIP' }, tone: colors.success },
  unpaidInvoices: { label: 'Unpaid invoices', stack: 'Invoices', params: { status: 'ISSUED' }, tone: colors.danger },
  paymentsToVerify: { label: 'Payments to verify', stack: 'Payments', params: { status: 'SUBMITTED' }, tone: colors.amber },
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
      // The portal's App settings travel with the Home data.
      setAppConfig(res.data.appConfig);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openable = (m: { tab?: string; stack?: string }) =>
    m.tab ? can('shipments.view') || can('packages.view')
      : m.stack === 'Invoices' ? can('invoices.view')
        : m.stack === 'Payments' ? can('payments.view')
          : false;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Text style={styles.eyebrow}>Smart Prep · Warehouse</Text>
      <Text style={styles.hello}>Hello, {user?.firstName || 'there'}</Text>
      <Text style={styles.role}>{(roles.length ? roles : [user?.role]).filter(Boolean).join(' · ')}</Text>
      <Text style={styles.sub}>{company ? company.name : 'All companies'}</Text>

      <View style={styles.grid}>
        {Object.entries(kpis).map(([k, v]) => {
          const meta = KPIS[k] ?? { label: k };
          const canOpen = openable(meta);
          return (
            <Pressable
              key={k}
              style={({ pressed }) => [styles.card, pressed && canOpen && { opacity: 0.85 }]}
              disabled={!canOpen}
              onPress={() => (meta.tab ? nav.navigate('Main', { screen: meta.tab, params: meta.params }) : meta.stack && nav.navigate(meta.stack, meta.params))}
            >
              <Text style={styles.label}>{meta.label}</Text>
              <Text style={[styles.value, meta.tone && Number(v) > 0 ? { color: meta.tone } : null]}>{v}</Text>
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
  wrap: { flex: 1, backgroundColor: colors.surface },
  // Padding on the content, not the ScrollView: Android clips a ScrollView's
  // own bottom padding, which cut "Sign out" in half.
  content: { padding: 16, paddingBottom: 32 },
  eyebrow: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.amber, fontWeight: '700' },
  hello: { fontSize: 24, fontWeight: '800', color: colors.navy, marginTop: 4 },
  role: { color: colors.amber, fontWeight: '600', marginTop: 4 },
  sub: { color: '#7C7768', marginBottom: 16, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  card: { width: '48.5%', backgroundColor: colors.panel, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 6 },
  // Small capitals over a big number, as the design's KPI cards.
  label: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  value: { fontSize: 28, fontWeight: '800', color: colors.navy },
  quick: { marginTop: 18, gap: 8 },
  quickBtn: { backgroundColor: colors.amber, borderRadius: 10, padding: 14, alignItems: 'center' },
  quickText: { color: colors.navy, fontWeight: '700', textAlign: 'center' },
  logout: { marginTop: 24, alignSelf: 'flex-start', padding: 10 },
  logoutText: { color: '#B4472F', fontWeight: '600' },
  // Which backend this build talks to — hidden in prod via SHOW_ENV_BADGE.
  envBadge: {
    marginTop: 8,
    marginBottom: 24,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#EFECE3',
    borderWidth: 1,
    borderColor: colors.border,
  },
  envLabel: { fontSize: 11, fontWeight: '700', color: colors.navy, letterSpacing: 0.5 },
  envUrl: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
