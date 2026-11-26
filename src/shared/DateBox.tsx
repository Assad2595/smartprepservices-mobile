import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors } from '../config';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayFirst = (v: string) => (v ? v.split('-').reverse().join('/') : '');
const toDate = (v: string) => (v ? new Date(`${v}T00:00:00`) : new Date());

/**
 * A date filter box: dd/mm/yyyy shown, YYYY-MM-DD kept, empty for "any".
 * The phone's own calendar on Android and iOS; typed in the browser preview,
 * which has no calendar picker.
 */
export function DateBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [iosOpen, setIosOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <TextInput
        style={styles.box}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.muted2}
        onChangeText={(t) => (t === '' || /^\d{4}-\d{2}-\d{2}$/.test(t) ? onChange(t) : undefined)}
        onEndEditing={(e) => onChange(/^\d{4}-\d{2}-\d{2}$/.test(e.nativeEvent.text) ? e.nativeEvent.text : '')}
      />
    );
  }

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: toDate(value), mode: 'date', onChange: (e, d) => e.type === 'set' && d && onChange(iso(d)) });
    } else {
      setIosOpen(true);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.box} onPress={open} accessibilityLabel={placeholder}>
        <Text style={{ color: value ? colors.navy : colors.muted2 }} numberOfLines={1}>{value ? dayFirst(value) : placeholder}</Text>
      </Pressable>
      {iosOpen && (
        <DateTimePicker value={toDate(value)} mode="date" onChange={(e, d) => { setIosOpen(false); if (e.type === 'set' && d) onChange(iso(d)); }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  box: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: colors.panel, justifyContent: 'center', color: colors.navy, minHeight: 42,
  },
});
