import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../config';

/**
 * Shown on a list that was opened from a company ("Shipments of Edwin Garner"),
 * so the narrowed list is never a mystery. Clearing it shows every company again.
 */
export function CompanyFilterBanner({ name, onClear }: { name?: string | null; onClear: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text} numberOfLines={1}>Only {name || 'one company'}</Text>
      <Pressable onPress={onClear} hitSlop={10}>
        <Text style={styles.clear}>Show all</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(217,119,6,0.12)', borderWidth: 1, borderColor: 'rgba(217,119,6,0.4)' },
  text: { flex: 1, color: colors.navy, fontWeight: '700' },
  clear: { color: colors.amber, fontWeight: '800' },
});
