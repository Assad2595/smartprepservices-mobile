import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { errorMessage, uploadPhoto } from '../api/client';
import { colors, storageUrl } from '../config';
import { pickPhoto } from './pickPhoto';
import { PhotoGrid, PrimaryButton } from './ui';
import { showAlert } from './alert';

/** Shared screen body for "attach a photo to an existing record" flows (receiving / damage). */
export function PhotoUploadScreen({ title, uploadUrl }: { title: string; uploadUrl: string }) {
  const nav = useNavigation<any>();
  const [photos, setPhotos] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function add(source: 'camera' | 'library') {
    const photo = await pickPhoto(source);
    if (!photo) return;
    setBusy(true);
    try {
      const res = await uploadPhoto(uploadUrl, photo);
      setPhotos((prev) => [...prev, res.data.data]);
    } catch (e: any) {
      showAlert('Upload failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <PhotoGrid photos={photos.map((p) => ({ id: p.id, url: storageUrl(p.file_asset?.path) }))} />
      <PrimaryButton title="Take photo" onPress={() => add('camera')} busy={busy} variant="outline" />
      <PrimaryButton title="Choose from library" onPress={() => add('library')} busy={busy} variant="outline" />
      <PrimaryButton title="Done" onPress={() => nav.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy, marginBottom: 12 },
});
