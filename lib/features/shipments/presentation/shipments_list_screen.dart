import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/status_chip.dart';
import '../data/shipments_repository.dart';
import '../domain/models/shipment.dart';

final shipmentsProvider =
    FutureProvider.autoDispose<List<ShipmentSummary>>((ref) {
  return ref.watch(shipmentsRepositoryProvider).list();
});

class ShipmentsListScreen extends ConsumerWidget {
  const ShipmentsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shipments = ref.watch(shipmentsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Shipments')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(shipmentsProvider),
        child: shipments.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(24),
                child: Text('Failed to load shipments: $e'),
              ),
            ],
          ),
          data: (items) {
            if (items.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  EmptyState(
                    icon: Icons.local_shipping_outlined,
                    title: 'No shipments yet',
                    subtitle: 'New inbound requests will show up here.',
                  ),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final item = items[index];
                return Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    title: Text(
                      item.reference,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text(item.companyName ?? item.warehouseName ?? '—'),
                        if (item.expectedArrivalAt != null)
                          Text(
                            'ETA ${DateFormat.MMMd().format(item.expectedArrivalAt!.toLocal())}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                      ],
                    ),
                    trailing: StatusChip(status: item.status),
                    onTap: () => context.push('/shipments/${item.id}'),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
