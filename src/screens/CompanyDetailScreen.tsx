import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../config';
import { dateLabel, money, humanize } from '../shared/format';
import { Chip, EmptyRow, KeyValue, Section } from '../shared/ui';

const LINES: Record<string, string> = { amazon_prep: 'Amazon Prep', receiving_forwarding: 'Receiving & Forwarding' };

export function CompanyDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { can } = useAuth();
  const id = route.params?.id;
  const [company, setCompany] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get(`/companies/${id}`);
      setCompany(res.data.data);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useLayoutEffect(() => {
    nav.setOptions({ title: company?.name || 'Company' });
  }, [nav, company]);

  if (!company) {
    return (
      <View style={[styles.wrap, styles.content]}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  // Opens a list narrowed to this company (status cleared, so nothing is hidden).
  // Inventory and the shipment lists are tabs; Invoices opens from More.
  const openTab = (screen: string) => {
    const params = { companyId: company.id, companyName: company.name, status: '' };
    return screen === 'Invoices' ? nav.navigate(screen, params) : nav.navigate('Main', { screen, params });
  };

  const balance = Number(company.balance) || 0;
  const address = [company.address_line_1, company.address_line_2, company.city, company.state, company.zip, company.country].filter(Boolean).join(', ');

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Text style={styles.title}>{company.name}</Text>
      <View style={styles.chips}>
        <Chip label={company.is_active ? 'ACTIVE' : 'INACTIVE'} tone={company.is_active ? 'success' : 'muted'} />
        {company.balance_is_low && <Chip label="LOW BALANCE" tone="amber" />}
        {(company.service_lines || []).map((l: string) => <Chip key={l} label={LINES[l] || humanize(l)} tone="muted" />)}
      </View>

      <View style={[styles.balanceCard, balance < 0 && styles.balanceOwed]}>
        <Text style={styles.balanceLabel}>{balance < 0 ? 'Owes' : 'Balance'}</Text>
        <Text style={[styles.balanceValue, balance < 0 && { color: colors.danger }]}>{money(Math.abs(balance))}</Text>
        <Text style={styles.balanceHint}>
          Low-balance threshold {money(company.balance_threshold)}. Money is added and taken off on the web portal.
        </Text>
      </View>

      <View style={styles.counts}>
        {[['shipments_count', 'Shipments'], ['products_count', 'Products'], ['users_count', 'Users']].map(([k, label]) => (
          <View key={k} style={styles.count}>
            <Text style={styles.countValue} numberOfLines={1} adjustsFontSizeToFit>{company[k] ?? 0}</Text>
            <Text style={styles.countLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
          </View>
        ))}
      </View>

      <Section title="Contact">
        <KeyValue label="Contact person" value={company.contact_person} />
        <KeyValue label="Email" value={company.email} />
        <KeyValue label="Billing email" value={company.billing_email} />
        <KeyValue label="Phone" value={company.phone} />
        {!!company.phone && (
          <Pressable onPress={() => Linking.openURL(`tel:${company.phone}`)}>
            <Text style={styles.link}>Call {company.phone}</Text>
          </Pressable>
        )}
        <KeyValue label="Address" value={address || '—'} />
      </Section>

      <Section title="Company">
        <KeyValue label="Legal name" value={company.legal_name} />
        <KeyValue label="Brand" value={company.brand_name} />
        <KeyValue label="Amazon seller ID" value={company.amazon_seller_id} />
        <KeyValue label="Added" value={dateLabel(company.created_at)} />
      </Section>

      {(company.suites || []).length > 0 && (
        <Section title="Suites">
          <View style={styles.chips}>
            {company.suites.map((s: any) => <Chip key={s.id} label={`${s.suite_number}${s.is_default ? ' · default' : ''}`} tone={s.is_default ? 'default' : 'muted'} />)}
          </View>
        </Section>
      )}

      {company.show_ledger && (
        <Section title="Account statement">
          {(company.ledger_entries || []).length === 0 ? (
            <EmptyRow text="No account activity yet." />
          ) : (
            company.ledger_entries.map((e: any) => {
              const amount = Number(e.amount) || 0;
              return (
                <View key={e.id} style={styles.ledger}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ledgerType}>{e.type_label}</Text>
                    <Text style={styles.ledgerMeta}>
                      {dateLabel(e.created_at, true)}
                      {e.created_by?.name ? ` · ${e.created_by.name}` : ''}
                    </Text>
                    {!!e.note && <Text style={styles.ledgerMeta}>{e.note}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.ledgerAmount, { color: amount < 0 ? colors.danger : colors.success }]}>
                      {amount > 0 ? '+' : ''}{money(amount)}
                    </Text>
                    <Text style={styles.ledgerMeta}>bal. {money(e.balance_after)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </Section>
      )}

      {(can('shipments.view') || can('products.view') || can('invoices.view')) && (
        <Section title="Open for this company">
          <View style={styles.links}>
            {can('shipments.view') && (
              <Pressable style={styles.linkBtn} onPress={() => openTab('Inbound')}>
                <Text style={styles.linkBtnText}>Inbound</Text>
              </Pressable>
            )}
            {can('shipments.view') && (
              <Pressable style={styles.linkBtn} onPress={() => openTab('Outbound')}>
                <Text style={styles.linkBtnText}>Outbound</Text>
              </Pressable>
            )}
            {can('products.view') && (
              <Pressable style={styles.linkBtn} onPress={() => openTab('Products')}>
                <Text style={styles.linkBtnText}>Inventory</Text>
              </Pressable>
            )}
            {can('invoices.view') && (
              <Pressable style={styles.linkBtn} onPress={() => openTab('Invoices')}>
                <Text style={styles.linkBtnText}>Invoices</Text>
              </Pressable>
            )}
          </View>
        </Section>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy },
  chips: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' },
  balanceCard: { marginTop: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16 },
  balanceOwed: { borderColor: colors.danger },
  balanceLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 30, fontWeight: '800', color: colors.navy, marginTop: 2 },
  balanceHint: { color: colors.muted, fontSize: 12, marginTop: 6 },
  counts: { flexDirection: 'row', gap: 8, marginTop: 10 },
  count: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
  countValue: { fontSize: 20, fontWeight: '800', color: colors.navy },
  countLabel: { color: colors.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  link: { color: colors.navy, fontWeight: '700', paddingVertical: 6 },
  ledger: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  ledgerType: { fontWeight: '700', color: '#1B2430' },
  ledgerMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  ledgerAmount: { fontWeight: '800' },
  links: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  linkBtn: { backgroundColor: colors.navy, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  linkBtnText: { color: '#fff', fontWeight: '700' },
});
