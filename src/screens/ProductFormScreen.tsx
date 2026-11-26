import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, errorMessage, postForm, FilePart } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors, storageUrl } from '../config';
import { promptPhotoSource } from '../shared/pickPhoto';
import { FilterChips, FormField, PickerField, PrimaryButton, Section, ToggleField } from '../shared/ui';
import { showAlert } from '../shared/alert';

const WEIGHT_UNITS = ['lb', 'kg', 'g'].map((u) => ({ key: u, label: u }));
const DIMENSION_UNITS = ['in', 'ft', 'cm'].map((u) => ({ key: u, label: u }));

/** Create when no `product` param is given; edit otherwise. */
export function ProductFormScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const editing: any = route.params?.product ?? null;
  const { company: ownCompany } = useAuth();

  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(editing?.company_id ?? (ownCompany ? Number(ownCompany.id) : null));
  const [sku, setSku] = useState(editing?.sku ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [asin, setAsin] = useState(editing?.asin ?? '');
  const [fnsku, setFnsku] = useState(editing?.fnsku ?? '');
  const [brand, setBrand] = useState(editing?.brand ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [weight, setWeight] = useState(editing ? String(editing.weight_lb ?? '') : '');
  const [length, setLength] = useState(editing ? String(editing.length_in ?? '') : '');
  const [width, setWidth] = useState(editing ? String(editing.width_in ?? '') : '');
  const [height, setHeight] = useState(editing ? String(editing.height_in ?? '') : '');
  const [weightUnit, setWeightUnit] = useState(editing?.weight_unit ?? 'lb');
  const [dimensionUnit, setDimensionUnit] = useState(editing?.dimension_unit ?? 'in');
  const [isActive, setIsActive] = useState<boolean>(editing ? Boolean(editing.is_active) : true);
  const [images, setImages] = useState<FilePart[]>([]);
  const [busy, setBusy] = useState(false);

  const existingImages: any[] = editing?.images ?? [];

  useLayoutEffect(() => {
    nav.setOptions({ title: editing ? `Edit ${editing.reference_code || 'product'}` : 'New product' });
  }, [nav, editing]);

  useEffect(() => {
    if (ownCompany) return;
    api.get('/companies').then((res) => setCompanies(res.data.data || [])).catch(() => setCompanies([]));
  }, [ownCompany]);

  async function submit() {
    if (!companyId) return showAlert('Missing company', 'Select the company this product belongs to.');
    if (!sku.trim() || !title.trim()) return showAlert('Missing details', 'SKU and title are required.');
    if (!weight || !length || !width || !height) return showAlert('Missing measurements', 'Weight and all three dimensions are required.');
    if (!editing && images.length === 0) return showAlert('Missing photo', 'At least one product image is required.');
    if (editing && existingImages.length === 0 && images.length === 0) return showAlert('Missing photo', 'At least one product image is required.');

    setBusy(true);
    try {
      const fields = {
        company_id: companyId,
        sku: sku.trim(),
        title: title.trim(),
        asin: asin || undefined,
        fnsku: fnsku || undefined,
        brand: brand || undefined,
        description: description || undefined,
        weight_lb: weight,
        length_in: length,
        width_in: width,
        height_in: height,
        weight_unit: weightUnit,
        dimension_unit: dimensionUnit,
        is_active: isActive,
      };
      const files = images.map((file, i) => ({ field: `images[${i}]`, file }));
      const res = editing
        ? await postForm(`/products/${editing.id}`, fields, files)
        : await postForm('/products', fields, files);
      const saved = res.data.data;
      if (editing) nav.goBack();
      else nav.replace('ProductDetail', { id: saved.id });
    } catch (e: any) {
      showAlert('Could not save product', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {!ownCompany && (
        <PickerField
          label="Company *"
          value={companyId}
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(v) => setCompanyId(v ? Number(v) : null)}
        />
      )}
      <FormField label="Title *" value={title} onChangeText={setTitle} />
      <FormField label="SKU *" value={sku} onChangeText={setSku} autoCapitalize="characters" />
      <View style={styles.row2}>
        <FormField label="ASIN" value={asin} onChangeText={setAsin} autoCapitalize="characters" wrapperStyle={styles.half} />
        <FormField label="FNSKU" value={fnsku} onChangeText={setFnsku} autoCapitalize="characters" wrapperStyle={styles.half} />
      </View>
      <FormField label="Brand" value={brand} onChangeText={setBrand} />
      <FormField label="Description" value={description} onChangeText={setDescription} multiline numberOfLines={3} />

      <Section title="Measurements">
        <View style={styles.row2}>
          <FormField label={`Weight (${weightUnit}) *`} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" wrapperStyle={styles.half} />
          <View style={[styles.half, { justifyContent: 'flex-end', marginBottom: 12 }]}>
            <Text style={styles.label}>Weight unit</Text>
            <View style={{ marginHorizontal: -16 }}>
              <FilterChips options={WEIGHT_UNITS} value={weightUnit} onChange={setWeightUnit} />
            </View>
          </View>
        </View>
        <View style={styles.row3}>
          <FormField label={`Length (${dimensionUnit}) *`} value={length} onChangeText={setLength} keyboardType="decimal-pad" wrapperStyle={styles.third} />
          <FormField label={`Width (${dimensionUnit}) *`} value={width} onChangeText={setWidth} keyboardType="decimal-pad" wrapperStyle={styles.third} />
          <FormField label={`Height (${dimensionUnit}) *`} value={height} onChangeText={setHeight} keyboardType="decimal-pad" wrapperStyle={styles.third} />
        </View>
        <Text style={styles.label}>Dimension unit</Text>
        <View style={{ marginHorizontal: -16, marginBottom: 8 }}>
          <FilterChips options={DIMENSION_UNITS} value={dimensionUnit} onChange={setDimensionUnit} />
        </View>
      </Section>

      <ToggleField label="Status" value={isActive} onChange={setIsActive} trueLabel="Active" falseLabel="Inactive" />

      <Section title={editing ? 'Add photos' : 'Photos *'}>
        {existingImages.length > 0 && (
          <Text style={styles.hint}>{existingImages.length} photo{existingImages.length === 1 ? '' : 's'} already on file. New photos are added, not replaced.</Text>
        )}
        <View style={styles.thumbs}>
          {existingImages.map((img: any) => (
            <Image key={`e-${img.id}`} source={{ uri: storageUrl(img.path) }} style={[styles.thumb, { opacity: 0.6 }]} />
          ))}
          {images.map((img, i) => (
            <Pressable key={img.uri} onPress={() => setImages((prev) => prev.filter((_, j) => j !== i))}>
              <Image source={{ uri: img.uri }} style={styles.thumb} />
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          ))}
        </View>
        <PrimaryButton title="+ Add photo" variant="outline" onPress={() => promptPhotoSource((p) => setImages((prev) => [...prev, p]))} />
      </Section>

      <PrimaryButton title={editing ? 'Save changes' : 'Create product'} onPress={submit} busy={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  row2: { flexDirection: 'row', gap: 8 },
  row3: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  half: { flex: 1 },
  third: { flex: 1 },
  label: { marginBottom: 4, color: '#4A4A40', fontWeight: '600', fontSize: 13 },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#EFECE3' },
  remove: { position: 'absolute', top: 2, right: 6, color: '#fff', fontWeight: '700', textShadowColor: '#000', textShadowRadius: 3 },
});
