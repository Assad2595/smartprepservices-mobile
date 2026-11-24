import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../config';
import { showAlert } from '../shared/alert';

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@smartprepservices.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [busy, setBusy] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>Smart Prep Services</Text>
      <Text style={styles.sub}>Warehouse management</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
        <Pressable
          style={styles.btn}
          disabled={busy}
          onPress={async () => {
            try {
              setBusy(true);
              await login(email.trim(), password);
            } catch (e: any) {
              showAlert('Login failed', errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Text style={styles.btnText}>{busy ? 'Signing in…' : 'Continue'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.navy, padding: 24, justifyContent: 'center' },
  brand: { color: '#fff', fontSize: 28, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.7)', marginBottom: 20, marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  label: { marginBottom: 4, color: '#334155', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 12 },
  btn: { backgroundColor: colors.navy, borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
