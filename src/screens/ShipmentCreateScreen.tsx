import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api, errorMessage, postForm, FilePart } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../config';
import { money } from '../shared/format';
import { promptPhotoSource } from '../shared/pickPhoto';
import { Card, Chip, EmptyRow, FilterChips, FormField, PickerField, PrimaryButton, Section } from '../shared/ui';
import { showAlert } from '../shared/alert';

type Item = { product_id: number | null; qty_expected: string; tracking_number: string };

const TYPES = [
  { key: 'amazon_prep', label: 'Amazon Prep' },
  { key: 'receiving_forwarding', label: 'Receiving & Forwarding' },
];

// A service is quantity-tiered when its rules carve up unit ranges (FNSKU
// Labeling: 1-50 / 51-499 / 500+) rather than being flat options. Those and
// catalogue-locked services are attached by the server automatically, so the
// form only shows them as "included" — mirrors the web create page.
const isQtyTiered = (service: any) => (service.pricing_rules || []).some((r: any) => r.max_qty !== null || r.min_qty > 1);
const isLocked = (service: any) => Boolean(service.locked) || isQtyTiered(service);
const defaultRuleFor = (service: any) => {
  const rules = service.pricing_rules || [];
  return rules.find((r: any) => r.name === 'Standard') || rules[0];
};

export function ShipmentCreateScreen() {
  const nav = useNavigation<any>();
  const { company: ownCompany } = useAuth();

  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(ownCompany ? Number(ownCompany.id) : null);
  const [serviceType, setServiceType] = useState<'amazon_prep' | 'receiving_forwarding'>('amazon_prep');
  const [catalogue, setCatalogue] = useState<{ products: any[]; suites: any[]; services: any[]; fnskuRequired: boolean }>({
    products: [], suites: [], services: [], fnskuRequired: false,
  });

  const [items, setItems] = useState<Item[]>([{ product_id: null, qty_expected: '1', tracking_number: '' }]);
  const [selections, setSelections] = useState<Record<number, number>>({}); // service id -> pricing rule id
  const [suiteId, setSuiteId] = useState<number | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipperCompany, setShipperCompany] = useState('');
  const [shipperPhone, setShipperPhone] = useState('');
  const [shipperAddress, setShipperAddress] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [expectedArrival, setExpectedArrival] = useState('');
  const [notes, setNotes] = useState('');
  const [fnskuLabel, setFnskuLabel] = useState<FilePart | null>(null);
  const [busy, setBusy] = useState(false);

  const isAmazonPrep = serviceType === 'amazon_prep';

  useEffect(() => {
    if (ownCompany) return;
    api.get('/companies').then((res) => setCompanies(res.data.data || [])).catch(() => setCompanies([]));
  }, [ownCompany]);

  const loadCatalogue = useCallback(async () => {
    const res = await api.get('/shipments/catalogue', { params: { service_type: serviceType, company_id: companyId ?? undefined } });
    const data = res.data.data;
    setCatalogue({ products: data.products || [], suites: data.suites || [], services: data.services || [], fnskuRequired: Boolean(data.fnskuRequired) });

    // Pre-tick whatever the catalogue marks as selected by default.
    const initial: Record<number, number> = {};
    (data.services || []).forEach((s: any) => {
      if (!isLocked(s) && s.default_selected && (s.pricing_rules || []).length > 0) initial[s.id] = defaultRuleFor(s).id;
    });
    setSelections(initial);
    setSuiteId(null);
  }, [serviceType, companyId]);

  useEffect(() => {
    loadCatalogue().catch(() => null);
  }, [loadCatalogue]);

  // Amazon Prep is one product per shipment; Forwarding consolidates many.
  useEffect(() => {
    setItems((prev) => (isAmazonPrep ? [prev[0] ?? { product_id: null, qty_expected: '1', tracking_number: '' }] : prev));
  }, [isAmazonPrep]);

  const productOptions = useMemo(
    () => catalogue.products.map((p) => ({ value: p.id, label: p.title, hint: `SKU ${p.sku}` })),
    [catalogue.products],
  );
  const included = catalogue.services.filter(isLocked);
  const optional = catalogue.services.filter((s) => !isLocked(s));
  const totalQty = items.reduce((sum, it) => sum + (Number(it.qty_expected) || 0), 0);

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function selectRule(service: any, ruleId: number | null) {
    setSelections((prev) => {
      const next = { ...prev };
      if (ruleId) next[service.id] = ruleId;
      else delete next[service.id];
      return next;
    });
  }

  async function submit() {
    if (!companyId) return showAlert('Missing company', 'Select the company this shipment belongs to.');
    if (items.some((it) => !it.product_id)) return showAlert('Missing product', 'Select a product for every line.');
    if (!shipperPhone.trim()) return showAlert('Missing phone', 'A shipper phone number is required.');
    if (isAmazonPrep && !trackingNumber.trim()) return showAlert('Missing tracking number', 'Enter the inbound tracking number.');
    if (!isAmazonPrep && !suiteId) return showAlert('Missing suite', 'A suite is required for Receiving & Forwarding shipments.');
    if (catalogue.fnskuRequired && !fnskuLabel) return showAlert('Missing FNSKU label', 'Attach the FNSKU label file.');

    setBusy(true);
    try {
      const res = await postForm(
        '/shipments',
        {
          service_type: serviceType,
          company_id: companyId,
          expected_arrival: expectedArrival || undefined,
          notes: notes || undefined,
          company_suite_id: suiteId ?? undefined,
          shipping_method: shippingMethod || undefined,
          tracking_number: trackingNumber || undefined,
          shipper_company: shipperCompany || undefined,
          shipper_phone: shipperPhone,
          shipper_address: shipperAddress || undefined,
          items: items.map((it) => ({
            product_id: it.product_id,
            qty_expected: isAmazonPrep ? Number(it.qty_expected) || 1 : undefined,
            tracking_number: it.tracking_number || undefined,
          })),
          service_selections: Object.values(selections).map((ruleId) => ({ pricing_rule_id: ruleId, quantity: 1 })),
        },
        fnskuLabel ? [{ field: 'fnsku_label', file: fnskuLabel }] : [],
      );
      const created = res.data.data;
      nav.replace('ShipmentDetail', { id: created.id });
    } catch (e: any) {
      showAlert('Could not create shipment', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Service type</Text>
      <View style={{ marginHorizontal: -16, marginBottom: 8 }}>
        <FilterChips options={TYPES} value={serviceType} onChange={(k) => setServiceType(k as any)} />
      </View>

      {!ownCompany && (
        <PickerField
          label="Company"
          value={companyId}
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(v) => {
            setCompanyId(v ? Number(v) : null);
            setItems((prev) => prev.map((it) => ({ ...it, product_id: null })));
          }}
        />
      )}

      <Section title={isAmazonPrep ? 'Product' : 'Products (one per parcel)'} style={{ marginTop: 6 }}>
        {companyId === null && <EmptyRow text="Select a company to choose products." />}
        {items.map((item, index) => (
          <Card key={index}>
            <PickerField
              label="Product"
              value={item.product_id}
              options={productOptions}
              onChange={(v) => updateItem(index, { product_id: v ? Number(v) : null })}
              disabled={companyId === null}
              placeholder={productOptions.length ? 'Select product…' : 'No products for this company'}
            />
            {isAmazonPrep ? (
              <FormField label="Expected units" value={item.qty_expected} onChangeText={(v) => updateItem(index, { qty_expected: v })} keyboardType="number-pad" wrapperStyle={{ marginBottom: 0 }} />
            ) : (
              <FormField label="Parcel tracking number" value={item.tracking_number} onChangeText={(v) => updateItem(index, { tracking_number: v })} autoCapitalize="characters" wrapperStyle={{ marginBottom: 0 }} />
            )}
            {!isAmazonPrep && items.length > 1 && (
              <Pressable onPress={() => setItems((prev) => prev.filter((_, i) => i !== index))} style={{ marginTop: 8 }}>
                <Text style={{ color: colors.danger, fontWeight: '600' }}>Remove</Text>
              </Pressable>
            )}
          </Card>
        ))}
        {!isAmazonPrep && (
          <PrimaryButton title="+ Add another product" variant="outline" onPress={() => setItems((prev) => [...prev, { product_id: null, qty_expected: '1', tracking_number: '' }])} />
        )}
      </Section>

      <Section title="Inbound details">
        {isAmazonPrep && (
          <FormField label="Tracking number *" value={trackingNumber} onChangeText={setTrackingNumber} autoCapitalize="characters" placeholder="Carrier tracking for the inbound parcel" />
        )}
        {!isAmazonPrep && (
          <PickerField
            label="Suite *"
            value={suiteId}
            options={catalogue.suites.map((s) => ({ value: s.id, label: `Suite ${s.suite_number}` }))}
            onChange={(v) => setSuiteId(v ? Number(v) : null)}
            placeholder={catalogue.suites.length ? 'Select suite…' : 'No free suites for this company'}
          />
        )}
        <FormField label="Shipper phone *" value={shipperPhone} onChangeText={setShipperPhone} keyboardType="phone-pad" />
        <FormField label="Shipper company" value={shipperCompany} onChangeText={setShipperCompany} />
        <FormField label="Shipper address" value={shipperAddress} onChangeText={setShipperAddress} />
        <FormField label="Shipping method" value={shippingMethod} onChangeText={setShippingMethod} placeholder="e.g. UPS Ground" />
        <FormField label="Expected arrival (YYYY-MM-DD)" value={expectedArrival} onChangeText={setExpectedArrival} placeholder="2026-09-30" autoCapitalize="none" />
        <FormField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      </Section>

      {isAmazonPrep && (
        <Section title={catalogue.fnskuRequired ? 'FNSKU label *' : 'FNSKU label (optional)'}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton title={fnskuLabel ? 'Replace label image' : 'Attach label image'} variant="outline" onPress={() => promptPhotoSource(setFnskuLabel)} />
            </View>
            {fnskuLabel && <Chip label="ATTACHED" tone="success" />}
          </View>
        </Section>
      )}

      <Section title="Services">
        {included.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            {included.map((service) => {
              const rule = defaultRuleFor(service);
              return (
                <View key={service.id} style={styles.includedRow}>
                  <Text style={styles.includedText}>{service.name}</Text>
                  <Chip label={rule ? `INCLUDED · ${rule.name || 'Standard'}${isQtyTiered(service) ? ` · ${Math.max(totalQty, 1)} units` : ''}` : 'INCLUDED'} tone="muted" />
                </View>
              );
            })}
          </View>
        )}
        {optional.length === 0 && included.length === 0 && <EmptyRow text="No services available for this type." />}
        {optional.map((service) => {
          const rules = service.pricing_rules || [];
          const selectedRule = selections[service.id] ?? null;
          const checked = selectedRule !== null;
          return (
            <Card key={service.id}>
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                onPress={() => selectRule(service, checked ? null : (defaultRuleFor(service)?.id ?? null))}
                disabled={rules.length === 0}
              >
                <View style={[styles.checkbox, checked && styles.checkboxOn]}>{checked && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}</View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    {service.staff_only && <Chip label="INTERNAL" tone="muted" />}
                  </View>
                  {!!service.description && <Text style={styles.metaSmall}>{service.description}</Text>}
                  {rules.length === 0 && <Text style={[styles.metaSmall, { color: colors.danger }]}>No price configured</Text>}
                </View>
              </Pressable>
              {checked && rules.length > 1 && (
                <View style={{ marginTop: 10, gap: 6 }}>
                  {rules.map((rule: any) => {
                    const active = selectedRule === rule.id;
                    return (
                      <Pressable key={rule.id} style={[styles.ruleRow, active && styles.ruleRowActive]} onPress={() => selectRule(service, rule.id)}>
                        <Text style={[styles.ruleName, active && { color: '#fff' }]}>{rule.name || 'Standard'}</Text>
                        <Text style={[styles.rulePrice, active && { color: '#fff' }]}>{money(rule.unit_price, rule.currency || 'USD')}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {checked && rules.length === 1 && (
                <Text style={[styles.metaSmall, { marginTop: 6 }]}>{money(rules[0].unit_price, rules[0].currency || 'USD')} per {String(service.basis || 'unit').replace('PER_', '').toLowerCase()}</Text>
              )}
            </Card>
          );
        })}
      </Section>

      <PrimaryButton title="Create shipment" onPress={submit} busy={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  sectionLabel: { fontWeight: '700', color: colors.navy, fontSize: 15, marginBottom: 4 },
  metaSmall: { color: colors.muted, fontSize: 12, marginTop: 2 },
  includedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 8 },
  includedText: { color: colors.navy, fontWeight: '600', flex: 1 },
  serviceName: { fontWeight: '700', color: colors.navy },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkboxOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  ruleRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  ruleRowActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  ruleName: { color: colors.navy, fontWeight: '600' },
  rulePrice: { color: colors.navy, fontWeight: '700' },
});
