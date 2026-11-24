import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { colors, statusColor } from '../config';

export function StatusBadge({ status }: { status?: string | null }) {
  const bg = statusColor(status);
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: `${bg}1A`, borderColor: bg }]}>
      <Text style={[badgeStyles.text, { color: bg }]}>{(status ?? '').replaceAll('_', ' ')}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  text: { fontWeight: '700', fontSize: 12, letterSpacing: 0.3 },
});

export function Section({
  title,
  right,
  children,
  style,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[sectionStyles.wrap, style]}>
      <View style={sectionStyles.header}>
        <Text style={sectionStyles.title}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: { marginTop: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontWeight: '700', color: colors.navy, fontSize: 15 },
});

export function EmptyRow({ text }: { text: string }) {
  return <Text style={{ color: colors.muted, fontStyle: 'italic', paddingVertical: 4 }}>{text}</Text>;
}

export function FormField({
  label,
  wrapperStyle,
  style,
  ...inputProps
}: { label: string; wrapperStyle?: ViewStyle } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[fieldStyles.wrap, wrapperStyle]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput style={[fieldStyles.input, style]} placeholderTextColor="#94A3B8" {...inputProps} />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { marginBottom: 4, color: '#334155', fontWeight: '600', fontSize: 13 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: '#fff' },
});

export function PrimaryButton({
  title,
  onPress,
  busy,
  disabled,
  variant = 'solid',
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline' | 'danger';
}) {
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';
  return (
    <Pressable
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        btnStyles.base,
        isOutline && btnStyles.outline,
        isDanger && btnStyles.danger,
        (disabled || busy) && btnStyles.disabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={isOutline ? colors.navy : '#fff'} />
      ) : (
        <Text style={[btnStyles.text, isOutline && btnStyles.textOutline]}>{title}</Text>
      )}
    </Pressable>
  );
}

const btnStyles = StyleSheet.create({
  base: { backgroundColor: colors.navy, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  outline: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.navy },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  text: { color: '#fff', fontWeight: '700' },
  textOutline: { color: colors.navy },
});

export function PhotoGrid({
  photos,
}: {
  photos: { id: string | number; url?: string; caption?: string | null }[];
}) {
  const [preview, setPreview] = useState<string | null>(null);

  if (!photos.length) return <EmptyRow text="No photos yet." />;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {photos.map((p) => (
          <Pressable key={p.id} onPress={() => p.url && setPreview(p.url)}>
            {p.url ? (
              <Image source={{ uri: p.url }} style={photoStyles.thumb} />
            ) : (
              <View style={[photoStyles.thumb, photoStyles.placeholder]} />
            )}
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={photoStyles.overlay} onPress={() => setPreview(null)}>
          {preview && <Image source={{ uri: preview }} style={photoStyles.full} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </>
  );
}

const photoStyles = StyleSheet.create({
  thumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#E2E8F0' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
});

export function Chip({ label, tone = 'default' }: { label: string; tone?: 'default' | 'amber' | 'success' | 'muted' }) {
  const bg = { default: colors.navy, amber: colors.amber, success: colors.success, muted: colors.muted }[tone];
  return (
    <View style={[chipStyles.wrap, { backgroundColor: `${bg}1A` }]}>
      <Text style={[chipStyles.text, { color: bg }]}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700' },
});

export type PickerOption = { value: string | number; label: string; hint?: string };

/**
 * A select control. React Native has no native dropdown, so this opens a
 * full-screen modal list with a search box — which is also what works best
 * with a couple of hundred products on a phone.
 */
export function PickerField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  disabled,
  wrapperStyle,
}: {
  label: string;
  value: string | number | null | undefined;
  options: PickerOption[];
  onChange: (value: string | number | null, option: PickerOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  wrapperStyle?: ViewStyle;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => String(o.value) === String(value));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <View style={[fieldStyles.wrap, wrapperStyle]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[fieldStyles.input, pickerStyles.trigger, disabled && { opacity: 0.5 }]}
      >
        <Text style={{ color: selected ? '#0F172A' : '#94A3B8', flex: 1 }} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={{ color: colors.muted }}>▾</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={pickerStyles.modal}>
          <View style={pickerStyles.modalHeader}>
            <Text style={pickerStyles.modalTitle}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <Text style={{ color: colors.amber, fontWeight: '700' }}>Close</Text>
            </Pressable>
          </View>
          {options.length > 8 && (
            <TextInput
              style={[fieldStyles.input, { marginHorizontal: 16, marginBottom: 8 }]}
              placeholder="Search…"
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          )}
          <FlatList
            data={filtered}
            keyExtractor={(o) => String(o.value)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<EmptyRow text="No matches." />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            renderItem={({ item }) => {
              const active = String(item.value) === String(value);
              return (
                <Pressable
                  style={[pickerStyles.option, active && pickerStyles.optionActive]}
                  onPress={() => {
                    onChange(item.value, item);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  <Text style={[pickerStyles.optionLabel, active && { color: '#fff' }]}>{item.label}</Text>
                  {!!item.hint && (
                    <Text style={[pickerStyles.optionHint, active && { color: 'rgba(255,255,255,0.8)' }]}>{item.hint}</Text>
                  )}
                </Pressable>
              );
            }}
          />
          {!!selected && (
            <Pressable
              style={{ padding: 16, alignItems: 'center' }}
              onPress={() => {
                onChange(null, null);
                setOpen(false);
              }}
            >
              <Text style={{ color: colors.danger, fontWeight: '600' }}>Clear selection</Text>
            </Pressable>
          )}
        </View>
      </Modal>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modal: { flex: 1, backgroundColor: colors.surface, paddingTop: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  option: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  optionActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  optionLabel: { fontWeight: '600', color: colors.navy },
  optionHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
});

/** Horizontal row of filter chips (status, service type, …). */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={chipRowStyles.row}>
      {options.map((f) => {
        const active = value === f.key;
        return (
          <Pressable key={f.key} style={[chipRowStyles.chip, active && chipRowStyles.chipActive]} onPress={() => onChange(f.key)}>
            <Text style={[chipRowStyles.text, active && chipRowStyles.textActive]}>{f.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const chipRowStyles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#fff' },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  text: { color: colors.navy, fontWeight: '600', fontSize: 12 },
  textActive: { color: '#fff' },
});

/** Search box; the caller decides when to fire (onSubmit / effect). */
export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search…',
  onSubmit,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}) {
  return (
    <TextInput
      style={[fieldStyles.input, { marginHorizontal: 16, marginTop: 12 }]}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmit}
      returnKeyType="search"
      autoCapitalize="none"
      autoCorrect={false}
      clearButtonMode="while-editing"
    />
  );
}

/** Label on the left, value on the right — detail screens are mostly this. */
export function KeyValue({ label, value, tone }: { label: string; value?: React.ReactNode; tone?: 'danger' | 'success' }) {
  const color = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : '#0F172A';
  const plain = typeof value === 'string' || typeof value === 'number' || value == null;
  return (
    <View style={kvStyles.row}>
      <Text style={kvStyles.label}>{label}</Text>
      {plain ? (
        <Text style={[kvStyles.value, { color }]} selectable>
          {value ?? '—'}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

const kvStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  label: { color: colors.muted, fontSize: 13, flexShrink: 0 },
  value: { fontWeight: '600', fontSize: 13, textAlign: 'right', flex: 1 },
});

/** Card container used by every list row and detail block. */
export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable style={[cardStyles.card, style]} onPress={onPress}>
        {children}
      </Pressable>
    );
  }
  return <View style={[cardStyles.card, style]}>{children}</View>;
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
});

/** Header-bar "+ New" button, shown only when the caller has the permission. */
export function HeaderAction({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={{ paddingHorizontal: 4 }}>
      <Text style={{ color: colors.amber, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

/** Yes/no rendered as two chips, which reads more clearly on a form than a bare Switch. */
export function ToggleField({
  label,
  value,
  onChange,
  trueLabel = 'Yes',
  falseLabel = 'No',
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  trueLabel?: string;
  falseLabel?: string;
}) {
  const choices: [boolean, string][] = [
    [true, trueLabel],
    [false, falseLabel],
  ];
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {choices.map(([v, l]) => {
          const active = value === v;
          return (
            <Pressable key={String(v)} onPress={() => onChange(v)} style={[chipRowStyles.chip, active && chipRowStyles.chipActive]}>
              <Text style={[chipRowStyles.text, active && chipRowStyles.textActive]}>{l}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
