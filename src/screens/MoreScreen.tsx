import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { API_URL, ENV_LABEL, SHOW_ENV_BADGE, colors } from '../config';

/**
 * The modules that do not get a tab of their own, plus the account. Each row
 * appears only if the signed-in user holds the permission (a role is only a
 * bundle of permissions), exactly like the tabs.
 */
export function MoreScreen() {
  const nav = useNavigation<any>();
  const { user, company, roles, can, logout } = useAuth();

  const rows = [
    { show: can('companies.view'), title: 'Companies', hint: 'Clients, balances and contacts', go: 'Companies' },
    { show: can('users.view'), title: 'Users', hint: 'Team members and client logins', go: 'Users' },
    { show: can('tasks.view'), title: 'Tasks', hint: 'Work to do', go: 'TaskList' },
  ].filter((r) => r.show);

  return (
    <ScrollView style={styles.wrap}>
      <View style={styles.who}>
        <Text style={styles.name}>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email}</Text>
        <Text style={styles.role}>{(roles.length ? roles : [user?.role]).filter(Boolean).join(' · ')}</Text>
        <Text style={styles.company}>{company ? company.name : 'All companies'}</Text>
      </View>

      {rows.map((r) => (
        <Pressable key={r.go} style={styles.row} onPress={() => nav.navigate(r.go)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{r.title}</Text>
            <Text style={styles.rowHint}>{r.hint}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}

      <Pressable onPress={logout} style={styles.logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>

      {SHOW_ENV_BADGE && (
        <View style={styles.env}>
          <Text style={styles.envLabel}>{ENV_LABEL}</Text>
          <Text style={styles.envUrl} numberOfLines={1}>{API_URL}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  who: { backgroundColor: colors.navy, borderRadius: 14, padding: 16, marginBottom: 16 },
  name: { color: '#fff', fontSize: 18, fontWeight: '800' },
  role: { color: colors.amber, fontWeight: '700', marginTop: 4 },
  company: { color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  rowTitle: { fontWeight: '800', color: colors.navy, fontSize: 15 },
  rowHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  chevron: { color: colors.muted, fontSize: 24 },
  logout: { marginTop: 18, alignSelf: 'flex-start', padding: 10 },
  logoutText: { color: colors.danger, fontWeight: '700' },
  env: { marginTop: 8, marginBottom: 24, padding: 10, borderRadius: 8, backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: colors.border },
  envLabel: { fontSize: 11, fontWeight: '700', color: colors.navy, letterSpacing: 0.5 },
  envUrl: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
