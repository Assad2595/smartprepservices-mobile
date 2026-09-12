import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = {
  apiUrl?: string;
  appEnv?: string;
  envLabel?: string;
  requestTimeoutMs?: number;
  showEnvBadge?: boolean;
};

// Populated by app.config.js from the .env.<APP_ENV> file — see .env.example.
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Which .env file this build was configured from: local | development | production. */
export const APP_ENV = extra.appEnv ?? 'local';
/** Short label for the in-app environment badge, e.g. "LOCAL". */
export const ENV_LABEL = extra.envLabel ?? APP_ENV.toUpperCase();
export const SHOW_ENV_BADGE = extra.showEnvBadge ?? APP_ENV !== 'production';
export const REQUEST_TIMEOUT_MS = extra.requestTimeoutMs ?? 20000;

// 10.0.2.2 is the Android emulator's alias for the host machine's localhost —
// meaningless in a browser, where the backend really is on localhost.
export const API_URL =
  Platform.OS === 'web'
    ? 'http://localhost:8000/api'
    : extra.apiUrl || 'http://10.0.2.2:8000/api';

// Files are served from Laravel's public disk symlink (`php artisan storage:link`),
// at the app root — one level up from the /api path.
export const APP_URL = API_URL.replace(/\/api\/?$/, '');

export function storageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${APP_URL}/storage/${path.replace(/^\/+/, '')}`;
}

export const colors = {
  navy: '#0B1F3A',
  amber: '#D97706',
  surface: '#F1F5F9',
  border: '#CBD5E1',
  danger: '#B91C1C',
  success: '#15803D',
  muted: '#64748B',
};

export const statusColors: Record<string, string> = {
  EXPECTED: '#64748B',
  RECEIVED: '#2563EB',
  INSPECTION: '#7C3AED',
  WAITING_FOR_FNSKU: '#D97706',
  FNSKU_APPLIED: '#0EA5E9',
  PACKING: '#0891B2',
  WAITING_FOR_BOX_LABELS: '#D97706',
  BOX_LABELS_APPLIED: '#0EA5E9',
  WAITING_FOR_PAYMENT: '#D97706',
  PAYMENT_VERIFIED: '#15803D',
  READY_TO_SHIP: '#15803D',
  SHIPPED: '#0B1F3A',
  COMPLETED: '#15803D',
  CANCELLED: '#B91C1C',
};

export function statusColor(status?: string | null): string {
  return (status && statusColors[status]) || colors.muted;
}
