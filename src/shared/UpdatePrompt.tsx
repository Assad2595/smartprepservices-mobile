import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { api } from '../api/client';
import { APP_BUILD, APP_URL, colors } from '../config';

/**
 * Offers a newer build of the app when one has been uploaded on the portal's
 * Mobile app page (MobileAppController::latest).
 *
 * Checked when signed in and whenever the app comes back to the front, at
 * most every 15 minutes. "Update now" downloads the APK inside the app and
 * opens Android's installer; Android always asks for that last Install tap
 * itself, and no app can skip it. "Later" hides it until the app is next
 * opened. Android only: there is no APK to install anywhere else.
 */
const CHECK_EVERY_MS = 15 * 60 * 1000;
const FLAG_GRANT_READ_URI_PERMISSION = 1;

type Latest = { build: number | null; version?: string | null; size_mb?: number; path?: string };

export function UpdatePrompt() {
  const [latest, setLatest] = useState<Latest | null>(null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastCheck = useRef(0);

  const check = useCallback(async () => {
    if (Platform.OS !== 'android' || Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
    lastCheck.current = Date.now();
    try {
      const res = await api.get('/app/latest');
      setLatest(res.data);
    } catch {
      // No permission, offline, or an older portal: simply no prompt.
    }
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  const newer = latest?.build && latest.build > APP_BUILD && latest.path ? latest : null;
  if (!newer || dismissed === newer.build) return null;

  const install = async () => {
    setError(null);
    setProgress(0);
    try {
      // The signed link expires; ask for a fresh one right before downloading.
      const fresh: Latest = (await api.get('/app/latest')).data;
      const target = `${FileSystem.cacheDirectory}smart-prep-services-v${fresh.build}.apk`;
      const download = FileSystem.createDownloadResumable(`${APP_URL}${fresh.path}`, target, {}, (p) => {
        if (p.totalBytesExpectedToWrite > 0) setProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      });
      const result = await download.downloadAsync();
      if (!result || result.status !== 200) throw new Error(`Download failed (${result?.status ?? 'no response'}).`);

      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      setProgress(null);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/vnd.android.package-archive',
        flags: FLAG_GRANT_READ_URI_PERMISSION,
      });
    } catch (e: any) {
      setProgress(null);
      setError(`${e?.message || 'The update could not be downloaded.'} You can also get it from the portal: Mobile app.`);
    }
  };

  const busy = progress !== null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => !busy && setDismissed(newer.build)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Update available</Text>
          <Text style={styles.body}>
            Version {newer.version || '1.0'} · v{newer.build} is ready{newer.size_mb ? ` (${newer.size_mb} MB)` : ''}. You have v{APP_BUILD || '?'}.
          </Text>
          <Text style={styles.note}>After the download, tap Install on the screen Android shows. You stay signed in.</Text>

          {busy && (
            <View style={styles.barWrap}>
              <View style={[styles.bar, { width: `${Math.round((progress ?? 0) * 100)}%` }]} />
            </View>
          )}
          {busy && <Text style={styles.note}>Downloading… {Math.round((progress ?? 0) * 100)}%</Text>}
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            {!busy && (
              <Pressable onPress={() => setDismissed(newer.build)} style={styles.later} hitSlop={8}>
                <Text style={styles.laterText}>Later</Text>
              </Pressable>
            )}
            {!busy && error && (
              <Pressable onPress={() => Linking.openURL(`${APP_URL}/mobile-app`)} style={styles.later} hitSlop={8}>
                <Text style={styles.laterText}>Open portal</Text>
              </Pressable>
            )}
            <Pressable onPress={install} disabled={busy} style={[styles.update, busy && { opacity: 0.6 }]}>
              <Text style={styles.updateText}>{busy ? 'Downloading…' : error ? 'Try again' : 'Update now'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 20 },
  title: { fontSize: 18, fontWeight: '800', color: colors.navy },
  body: { marginTop: 8, color: '#1B2430', fontSize: 15 },
  note: { marginTop: 8, color: colors.muted, fontSize: 13 },
  error: { marginTop: 10, color: colors.danger, fontSize: 13 },
  barWrap: { marginTop: 14, height: 8, borderRadius: 4, backgroundColor: '#EFECE3', overflow: 'hidden' },
  bar: { height: 8, backgroundColor: colors.amber },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginTop: 18 },
  later: { paddingVertical: 10 },
  laterText: { color: colors.muted, fontWeight: '700' },
  update: { backgroundColor: colors.navy, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18 },
  updateText: { color: '#fff', fontWeight: '800' },
});
