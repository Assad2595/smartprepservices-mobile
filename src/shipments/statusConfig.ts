/**
 * The backend is the single source of truth for which status a shipment may
 * move to next and who may move it: `GET /shipments/{id}` returns
 * `allowedTransitions` already filtered for the signed-in user (see
 * ShipmentWorkflowService::allowedTransitionsFor). The app only labels them.
 */
export type Transition = { value: string; label: string };

export function statusLabel(status?: string | null): string {
  return (status ?? '').replaceAll('_', ' ');
}

/** Accepts either the labelled objects the API returns or a bare status list. */
export function normalizeTransitions(raw: unknown): Transition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => (typeof t === 'string' ? { value: t, label: statusLabel(t) } : t))
    .filter((t): t is Transition => Boolean(t && typeof t.value === 'string'));
}
