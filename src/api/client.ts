import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_URL, REQUEST_TIMEOUT_MS } from '../config';

const TOKEN_KEY = 'sps_token';

// expo-secure-store has no web implementation (it's a native Keychain/Keystore
// wrapper). Native builds keep using it; the web target — used for browser
// preview/testing only, this app ships as native — falls back to localStorage.
export async function getToken() {
  if (Platform.OS === 'web') return window.localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string) {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Uploads a picked image (expo-image-picker asset) as multipart/form-data. */
export async function uploadPhoto(
  url: string,
  photo: { uri: string; fileName?: string | null; mimeType?: string | null },
  fields: Record<string, string | undefined> = {},
) {
  const form = new FormData();
  const name = photo.fileName || photo.uri.split('/').pop() || 'photo.jpg';
  const type = photo.mimeType || 'image/jpeg';
  // React Native's FormData accepts this file-descriptor shape; not valid web FormData typings.
  form.append('photo', { uri: photo.uri, name, type } as unknown as Blob);
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) form.append(key, value);
  });

  return api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } });
}
