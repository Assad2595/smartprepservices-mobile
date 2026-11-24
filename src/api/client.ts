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

export type FilePart = { uri: string; fileName?: string | null; mimeType?: string | null };

/**
 * Appends a picked file (expo-image-picker asset) to a FormData under `field`.
 *
 * React Native's FormData accepts a `{ uri, name, type }` descriptor; a
 * browser does not, so the web target fetches the (blob:/data:) uri into a
 * real Blob first. Web is only used for previewing — the app ships native.
 */
export async function appendFile(form: FormData, field: string, file: FilePart) {
  const name = file.fileName || file.uri.split('/').pop() || 'photo.jpg';
  const type = file.mimeType || 'image/jpeg';
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, new File([blob], name, { type: blob.type || type }));
    return;
  }
  form.append(field, { uri: file.uri, name, type } as unknown as Blob);
}

/**
 * POSTs a multipart form. Scalars go in as strings; `undefined` is skipped so
 * optional fields are simply absent rather than sent as "undefined". Nested
 * arrays/objects use PHP's bracket notation (items[0][product_id]).
 */
export async function postForm(
  url: string,
  fields: Record<string, unknown>,
  files: { field: string; file: FilePart }[] = [],
) {
  const form = new FormData();
  const put = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((v, i) => put(`${key}[${i}]`, v));
    } else if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([k, v]) => put(`${key}[${k}]`, v));
    } else if (typeof value === 'boolean') {
      form.append(key, value ? '1' : '0');
    } else {
      form.append(key, String(value));
    }
  };
  Object.entries(fields).forEach(([k, v]) => put(k, v));
  for (const { field, file } of files) await appendFile(form, field, file);

  return api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } });
}

/** Uploads one picked image as `photo`, with optional extra scalar fields. */
export async function uploadPhoto(url: string, photo: FilePart, fields: Record<string, string | undefined> = {}) {
  return postForm(url, fields, [{ field: 'photo', file: photo }]);
}

/** The message to show a user for a failed request: validation errors first, then the server message. */
export function errorMessage(e: any): string {
  const errors = e?.response?.data?.errors;
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat().find(Boolean);
    if (first) return String(first);
  }
  return e?.response?.data?.message || e?.message || 'Something went wrong.';
}
