/** "$1,234.50" — invoices and payments carry their own currency code. */
export function money(amount: unknown, currency: string = 'USD'): string {
  const n = Number(amount ?? 0);
  if (Number.isNaN(n)) return String(amount ?? '—');
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function dateLabel(value?: string | null, withTime = false): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return withTime ? d.toLocaleString() : d.toLocaleDateString();
}

/** "WAITING_FOR_FNSKU" → "Waiting for fnsku"; sentence case reads better in a tap target than shouting. */
export function humanize(value?: string | null): string {
  if (!value) return '';
  const words = value.replaceAll('_', ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  amazon_prep: 'Amazon Prep',
  receiving_forwarding: 'Receiving & Forwarding',
};

export function serviceTypeLabel(type?: string | null): string {
  return (type && SERVICE_TYPE_LABELS[type]) || humanize(type);
}
