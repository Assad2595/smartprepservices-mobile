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
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, statusTone, tones } from '../config';
import { BarcodeScanner } from './BarcodeScanner';

/** Status tag: small capitals on a tint of the status colour (design canvas). */
export function StatusBadge({ status }: { status?: string | null }) {
  const tone = statusTone(status);
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: tone.bg }]}>
      <Text style={[badgeStyles.text, { color: tone.fg }]}>{(status ?? '').replaceAll('_', ' ')}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  // maxWidth: a long status at a large font size must not squeeze the text beside it to nothing.
  wrap: { alignSelf: 'flex-start', maxWidth: '60%', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7 },
  text: { fontWeight: '700', fontSize: 10, letterSpacing: 0.5, textAlign: 'center', textTransform: 'uppercase' },
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
  // Small capitals, as the design labels each block.
  title: { flexShrink: 1, fontWeight: '700', color: colors.muted, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
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
      <TextInput style={[fieldStyles.input, style]} placeholderTextColor="#9B9686" {...inputProps} />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { marginBottom: 4, color: '#4A4A40', fontWeight: '600', fontSize: 13 },
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
        <ActivityIndicator color={isDanger ? '#fff' : colors.navy} />
      ) : (
        <Text style={[btnStyles.text, isOutline && btnStyles.textOutline, isDanger && { color: '#fff' }]}>{title}</Text>
      )}
    </Pressable>
  );
}

// The main action is orange with ink text, as in the design; outline is white on the warm border.
const btnStyles = StyleSheet.create({
  base: { backgroundColor: colors.amber, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', marginTop: 6 },
  outline: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  text: { color: colors.navy, fontWeight: '700', fontSize: 15, textAlign: 'center' },
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
  thumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#EFECE3' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
});

export function Chip({ label, tone = 'default' }: { label: string; tone?: 'default' | 'amber' | 'success' | 'muted' }) {
  const t = {
    default: { fg: colors.navy, bg: colors.neutralBg },
    amber: tones.active,
    success: tones.good,
    muted: tones.neutral,
  }[tone];
  return (
    <View style={[chipStyles.wrap, { backgroundColor: t.bg }]}>
      <Text style={[chipStyles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start', flexShrink: 1 },
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
  scannable = false,
}: {
  label: string;
  value: string | number | null | undefined;
  options: PickerOption[];
  onChange: (value: string | number | null, option: PickerOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  wrapperStyle?: ViewStyle;
  /** Adds a scan icon: the scanned code searches the list, and a single match is picked. */
  scannable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const selected = options.find((o) => String(o.value) === String(value));
  const matching = (text: string) => {
    const q = text.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q));
  };
  const filtered = useMemo(() => matching(query), [options, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScanned = (code: string) => {
    setScanning(false);
    const hits = matching(code);
    if (hits.length === 1) {
      onChange(hits[0].value, hits[0]);
      setQuery('');
      setOpen(false);
    } else {
      setQuery(code);
    }
  };

  return (
    <View style={[fieldStyles.wrap, wrapperStyle]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[fieldStyles.input, pickerStyles.trigger, disabled && { opacity: 0.5 }]}
      >
        <Text style={{ color: selected ? '#1B2430' : '#9B9686', flex: 1 }} numberOfLines={1}>
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
          {(options.length > 8 || scannable) && (
            <View style={[searchStyles.row, { marginTop: 0, marginBottom: 8 }]}>
              <TextInput
                style={[fieldStyles.input, searchStyles.input, scannable && searchStyles.withScan]}
                placeholder="Search…"
                placeholderTextColor="#9B9686"
                value={query}
                onChangeText={setQuery}
                autoFocus={!scannable}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {scannable && (
                <Pressable
                  style={({ pressed }) => [searchStyles.scan, pressed && { opacity: 0.7 }]}
                  onPress={() => setScanning(true)}
                  accessibilityLabel="Scan a barcode"
                >
                  <Ionicons name="barcode-outline" size={24} color={colors.navy} />
                </Pressable>
              )}
            </View>
          )}
          {scannable && (
            <BarcodeScanner visible={scanning} onClose={() => setScanning(false)} onScanned={onScanned} />
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
    // flexGrow 0: a horizontal ScrollView in a column otherwise takes a share
    // of the screen's height, which stretched the chips into tall ovals on one
    // screen and squashed them (text cut in half) on another.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={chipRowStyles.scroll}
      contentContainerStyle={chipRowStyles.row}
    >
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
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  // The chosen filter is orange with ink text; the rest white on the warm border (design canvas).
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: colors.panel },
  chipActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  text: { color: colors.muted, fontWeight: '600', fontSize: 12 },
  textActive: { color: colors.navy, fontWeight: '700' },
});

/**
 * Search box; the caller decides when to fire (onSubmit / effect).
 *
 * scannable adds a scan icon: the camera reads a barcode and its text
 * becomes the search, exactly as if typed — the screens already search
 * whenever the text changes.
 */
export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search…',
  onSubmit,
  scannable = false,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  scannable?: boolean;
}) {
  const [scanning, setScanning] = useState(false);

  return (
    <View style={searchStyles.row}>
      <View style={searchStyles.icon} pointerEvents="none">
        <Ionicons name="search-outline" size={17} color={colors.muted} />
      </View>
      <TextInput
        style={[fieldStyles.input, searchStyles.input, scannable && searchStyles.withScan]}
        placeholder={placeholder}
        placeholderTextColor="#9B9686"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {scannable && (
        <>
          <Pressable
            style={({ pressed }) => [searchStyles.scan, pressed && { opacity: 0.7 }]}
            onPress={() => setScanning(true)}
            accessibilityLabel="Scan a barcode"
          >
            <Ionicons name="barcode-outline" size={24} color={colors.navy} />
          </Pressable>
          <BarcodeScanner
            visible={scanning}
            onClose={() => setScanning(false)}
            onScanned={(code) => {
              setScanning(false);
              onChangeText(code);
            }}
          />
        </>
      )}
    </View>
  );
}

const searchStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginHorizontal: 16, marginTop: 12 },
  // Room on the left for the search icon, which sits inside the box.
  input: { flex: 1, paddingLeft: 40 },
  icon: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 40, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  // The scan icon sits inside the right end of the box; the text stops short of it.
  withScan: { paddingRight: 52 },
  scan: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, alignItems: 'center', justifyContent: 'center' },
});

/** Label on the left, value on the right — detail screens are mostly this. */
export function KeyValue({ label, value, tone }: { label: string; value?: React.ReactNode; tone?: 'danger' | 'success' }) {
  const color = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : '#1B2430';
  const plain = typeof value === 'string' || typeof value === 'number' || value == null;
  return (
    <View style={kvStyles.row}>
      <Text style={kvStyles.label}>{label}</Text>
      {plain ? (
        <Text style={[kvStyles.value, { color }]} selectable>
          {value ?? '—'}
        </Text>
      ) : (
        <View style={kvStyles.node}>{value}</View>
      )}
    </View>
  );
}

const kvStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  label: { color: colors.muted, fontSize: 13, flexShrink: 1, maxWidth: '50%' },
  value: { fontWeight: '600', fontSize: 13, textAlign: 'right', flex: 1 },
  node: { flexShrink: 1 },
});

/**
 * Card container used by every list row and detail block. edge: a status
 * colour shown as a thick left border, as list rows carry in the design.
 */
export function Card({ children, style, onPress, edge }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; edge?: string }) {
  const look = [cardStyles.card, edge ? { borderLeftWidth: 4, borderLeftColor: edge } : null, style];
  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [...look, pressed && { opacity: 0.85 }]} onPress={onPress}>
        {children}
      </Pressable>
    );
  }
  return <View style={look}>{children}</View>;
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
});

/** Header-bar "+ New" button, shown only when the caller has the permission. */
export function HeaderAction({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={{ paddingHorizontal: 4, marginRight: 12 }}>
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
