/**
 * Mirrors backend App\Support\ShipmentServiceTypeConfig for service_type =
 * amazon_prep — the only service type the mobile app serves (see
 * MobileResourceController::dashboard/shipments). Used to label and gate
 * transition buttons client-side; the backend remains the source of truth
 * and re-validates every transition server-side.
 */
export const TRANSITIONS: Record<string, string[]> = {
  EXPECTED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['INSPECTION', 'CANCELLED'],
  INSPECTION: ['WAITING_FOR_FNSKU', 'PACKING', 'CANCELLED'],
  WAITING_FOR_FNSKU: ['FNSKU_APPLIED', 'CANCELLED'],
  FNSKU_APPLIED: ['PACKING', 'CANCELLED'],
  PACKING: ['WAITING_FOR_BOX_LABELS', 'CANCELLED'],
  WAITING_FOR_BOX_LABELS: ['BOX_LABELS_APPLIED', 'CANCELLED'],
  BOX_LABELS_APPLIED: ['WAITING_FOR_PAYMENT', 'CANCELLED'],
  WAITING_FOR_PAYMENT: ['PAYMENT_VERIFIED', 'CANCELLED'],
  PAYMENT_VERIFIED: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const STATUS_PERMISSIONS: Record<string, string> = {
  EXPECTED: 'shipments.edit',
  RECEIVED: 'shipments.receive',
  INSPECTION: 'shipments.inspect',
  WAITING_FOR_FNSKU: 'shipments.inspect',
  FNSKU_APPLIED: 'shipments.apply_fnsku',
  PACKING: 'shipments.packing',
  WAITING_FOR_BOX_LABELS: 'shipments.packing',
  BOX_LABELS_APPLIED: 'shipments.packing',
  WAITING_FOR_PAYMENT: 'invoices.edit',
  PAYMENT_VERIFIED: 'payments.verify',
  READY_TO_SHIP: 'shipments.dispatch',
  SHIPPED: 'shipments.dispatch',
  COMPLETED: 'shipments.dispatch',
  CANCELLED: 'shipments.edit',
};

export const EDIT_FALLBACK_PERMISSION = 'shipments.edit';

export function allowedTransitions(fromStatus: string): string[] {
  return TRANSITIONS[fromStatus] ?? [];
}

export function permissionFor(toStatus: string): string {
  return STATUS_PERMISSIONS[toStatus] ?? EDIT_FALLBACK_PERMISSION;
}

/** Mirrors ShipmentWorkflowService::actorMayTransitionTo. */
export function actorMayTransitionTo(
  toStatus: string,
  opts: { isSuperAdmin: boolean; permissions: string[] },
): boolean {
  if (opts.isSuperAdmin) return true;
  const required = permissionFor(toStatus);
  return opts.permissions.includes(required) || opts.permissions.includes(EDIT_FALLBACK_PERMISSION);
}

export function statusLabel(status?: string | null): string {
  return (status ?? '').replaceAll('_', ' ');
}
