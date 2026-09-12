import React, { useState } from 'react';
import {
  ActivityIndicator,
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
