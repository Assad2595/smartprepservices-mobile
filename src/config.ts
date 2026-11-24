import Constants from 'expo-constants';

type Extra = {
  apiUrl?: string;
  appEnv?: string;
  envLabel?: string;
  requestTimeoutMs?: number;
  showEnvBadge?: boolean;
};

// Populated by app.config.js from env/<APP_ENV>.env (local | dev | prod).
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Which env file this build was configured from: local | dev | prod. */
export const APP_ENV = extra.appEnv ?? 'local';
/** Short label for the in-app environment badge, e.g. "LOCAL". */
export const ENV_LABEL = extra.envLabel ?? APP_ENV.toUpperCase();
export const SHOW_ENV_BADGE = extra.showEnvBadge ?? APP_ENV !== 'prod';
export const REQUEST_TIMEOUT_MS = extra.requestTimeoutMs ?? 20000;

// Comes from env/<APP_ENV>.env via app.config.js — see env/local.env for
// which address to use from a browser, a phone, or the Android emulator.
export const API_URL = extra.apiUrl || 'http://127.0.0.1:8000/api';

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
  // Tasks
  PENDING: '#64748B',
  IN_PROGRESS: '#D97706',
  DONE: '#15803D',
  READY_TO_SHIP: '#15803D',
  SHIPPED: '#0B1F3A',
  COMPLETED: '#15803D',
  CANCELLED: '#B91C1C',
  // Receiving & Forwarding
  PROCESSING: '#7C3AED',
  WAITING_FOR_CUSTOMER: '#D97706',
  PENDING_CONSOLIDATION: '#0891B2',
  CONSOLIDATED: '#0EA5E9',
  READY_FOR_SHIPMENT: '#15803D',
  DISPATCHED: '#0B1F3A',
  DELIVERED: '#15803D',
  // Invoices / payments
  DRAFT: '#64748B',
  ISSUED: '#D97706',
  PARTIALLY_PAID: '#0891B2',
  PAID: '#15803D',
  VOID: '#B91C1C',
  SUBMITTED: '#D97706',
  VERIFIED: '#15803D',
  REJECTED: '#B91C1C',
  REFUNDED: '#7C3AED',
};

export function statusColor(status?: string | null): string {
  return (status && statusColors[status]) || colors.muted;
}
