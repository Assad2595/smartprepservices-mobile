import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export type PickedPhoto = { uri: string; fileName?: string | null; mimeType?: string | null };

/** Prompts camera vs. library, requests the relevant permission, and returns one photo (or null if cancelled). */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickedPhoto | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert('Permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo library'} access to attach photos.`);
    return null;
  }

  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images })
    : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  return { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType };
}

export function promptPhotoSource(onPick: (photo: PickedPhoto) => void) {
  Alert.alert('Add photo', undefined, [
    { text: 'Take photo', onPress: async () => { const p = await pickPhoto('camera'); if (p) onPick(p); } },
    { text: 'Choose from library', onPress: async () => { const p = await pickPhoto('library'); if (p) onPick(p); } },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
