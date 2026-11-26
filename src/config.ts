import { Platform } from 'react-native';
import Constants from 'expo-constants';

type Extra = {
  apiUrl?: string;
  appEnv?: string;
  build?: number;
  envLabel?: string;
  requestTimeoutMs?: number;
  showEnvBadge?: boolean;
};

// Populated by app.config.js from env/<APP_ENV>.env (local | dev | prod).
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Which env file this build was configured from: local | dev | prod. */
export const APP_ENV = extra.appEnv ?? 'local';
/** This build's number (v1, v2…), compared with the newest on the portal to offer an update. */
export const APP_BUILD = Number(extra.build) || 0;
/** What staff quote when asked which app they have, e.g. "Version 1.0 · v2". */
export const VERSION_LABEL = `Version ${Constants.expoConfig?.version ?? '1.0'}${extra.build ? ` · v${extra.build}` : ''}`;
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

/**
 * The "Warehouse Ops" palette (design canvas): warm off-white canvas, ink
 * navy, one orange accent, and muted green / amber / red for status. The old
 * key names stay (navy = ink, amber = accent, surface = canvas) so every
 * screen takes the new look without being edited one by one.
 */
export const colors = {
  navy: '#1B2430',
  amber: '#D9762E',
  surface: '#F5F3EE',
  border: '#E4DFD3',
  danger: '#B4472F',
  success: '#3F7D58',
  muted: '#7C7768',
  muted2: '#9B9686',
  warn: '#B8862E',
  panel: '#FFFFFF',
  inkSoft: '#28323F',
  dangerBg: '#F5E2DC',
  successBg: '#E7F0E9',
  warnBg: '#F5EAD3',
  accentBg: 'rgba(217,118,46,0.14)',
  neutralBg: '#EFECE3',
};

/** IDs, tracking numbers and quantities, as the design sets them. */
export const monoFont = Platform.select({ ios: 'Menlo', default: 'monospace' });

export type Tone = 'good' | 'warn' | 'active' | 'bad' | 'neutral';

export const tones: Record<Tone, { fg: string; bg: string }> = {
  good: { fg: colors.success, bg: colors.successBg },
  warn: { fg: colors.warn, bg: colors.warnBg },
  active: { fg: colors.amber, bg: colors.accentBg },
  bad: { fg: colors.danger, bg: colors.dangerBg },
  neutral: { fg: colors.muted, bg: colors.neutralBg },
};

/** Which colour family a status belongs to: done, waiting on someone, being worked on, stopped, or not started. */
const STATUS_TONE: Record<string, Tone> = {
  // Shipments
  RECEIVED: 'active', INSPECTION: 'active', FNSKU_APPLIED: 'active', BOX_LABELS_APPLIED: 'active', PACKING: 'active',
  PROCESSING: 'active', CONSOLIDATED: 'active', SHIPPED: 'active', DISPATCHED: 'active',
  WAITING_FOR_FNSKU: 'warn', WAITING_FOR_BOX_LABELS: 'warn', WAITING_FOR_PAYMENT: 'warn', WAITING_FOR_CUSTOMER: 'warn',
  PENDING_CONSOLIDATION: 'warn',
  PAYMENT_VERIFIED: 'good', READY_TO_SHIP: 'good', READY_FOR_SHIPMENT: 'good', COMPLETED: 'good', DELIVERED: 'good',
  CANCELLED: 'bad',
  // Tasks
  IN_PROGRESS: 'active', DONE: 'good',
  // Invoices / payments
  ISSUED: 'warn', PARTIALLY_PAID: 'warn', SUBMITTED: 'warn', OVERDUE: 'bad',
  PAID: 'good', VERIFIED: 'good', VOID: 'bad', REJECTED: 'bad',
};

export function statusTone(status?: string | null): { fg: string; bg: string } {
  return tones[(status && STATUS_TONE[status]) || 'neutral'];
}

/** The status's colour (badge text, timeline dot, card edge). */
export function statusColor(status?: string | null): string {
  return statusTone(status).fg;
}
