import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_client.dart';
import '../../../shared/widgets/status_chip.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/shipments_repository.dart';
import '../domain/models/shipment.dart';

final shipmentDetailProvider =
    FutureProvider.autoDispose.family<ShipmentDetail, String>((ref, id) {
  return ref.watch(shipmentsRepositoryProvider).getById(id);
});

class ShipmentDetailScreen extends ConsumerWidget {
  const ShipmentDetailScreen({super.key, required this.shipmentId});

  final String shipmentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(shipmentDetailProvider(shipmentId));
    final isStaff = ref.watch(authControllerProvider).user?.role.isStaff == true;

    return Scaffold(
      appBar: AppBar(title: const Text('Shipment')),
      body: detail.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (shipment) {
          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(shipmentDetailProvider(shipmentId)),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        shipment.reference,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ),
                    StatusChip(status: shipment.status),
                  ],
                ),
                const SizedBox(height: 12),
                _InfoRow(label: 'Company', value: shipment.companyName ?? '—'),
                _InfoRow(label: 'Warehouse', value: shipment.warehouseName ?? '—'),
                _InfoRow(label: 'Items', value: '${shipment.itemCount}'),
                if (shipment.trackingNumber != null)
                  _InfoRow(label: 'Tracking', value: shipment.trackingNumber!),
                if (shipment.notes != null && shipment.notes!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text('Notes', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(shipment.notes!),
                ],
                if (isStaff) ...[
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: () => _advanceStatus(context, ref, shipment),
                    icon: const Icon(Icons.play_arrow_rounded),
                    label: const Text('Advance workflow'),
                  ),
                ],
                const SizedBox(height: 24),
                Text('Activity', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                if (shipment.activities.isEmpty)
                  const Text('No activity recorded yet.')
                else
                  ...shipment.activities.map(
                    (a) => Card(
                      child: ListTile(
                        title: Text(a.message),
                        subtitle: Text(
                          DateFormat.yMMMd().add_jm().format(a.createdAt.toLocal()),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _advanceStatus(
    BuildContext context,
    WidgetRef ref,
    ShipmentDetail shipment,
  ) async {
    final next = _nextStatus(shipment.status);
    if (next == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No further transition available')),
      );
      return;
    }

    try {
      await ref.read(shipmentsRepositoryProvider).transition(
            id: shipment.id,
            toStatus: next,
          );
      ref.invalidate(shipmentDetailProvider(shipmentId));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Moved to ${next.label}')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(extractErrorMessage(e))),
        );
      }
    }
  }

  ShipmentStatus? _nextStatus(ShipmentStatus current) {
    const order = [
      ShipmentStatus.expected,
      ShipmentStatus.received,
      ShipmentStatus.inspection,
      ShipmentStatus.waitingForFnsku,
      ShipmentStatus.fnskuApplied,
      ShipmentStatus.packing,
      ShipmentStatus.waitingForBoxLabels,
      ShipmentStatus.boxLabelsApplied,
      ShipmentStatus.waitingForPayment,
      ShipmentStatus.paymentVerified,
      ShipmentStatus.readyToShip,
      ShipmentStatus.shipped,
      ShipmentStatus.completed,
    ];
    final i = order.indexOf(current);
    if (i < 0 || i >= order.length - 1) return null;
    return order[i + 1];
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(color: Colors.blueGrey)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
