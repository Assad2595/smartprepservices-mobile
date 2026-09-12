import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/widgets/empty_state.dart';
import '../data/invoices_repository.dart';
import '../domain/models/invoice.dart';

final invoicesProvider = FutureProvider.autoDispose<List<InvoiceSummary>>((ref) {
  return ref.watch(invoicesRepositoryProvider).list();
});

class InvoicesScreen extends ConsumerWidget {
  const InvoicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoices = ref.watch(invoicesProvider);
    final money = NumberFormat.simpleCurrency();

    return Scaffold(
      appBar: AppBar(title: const Text('Invoices')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(invoicesProvider),
        child: invoices.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(
            children: [Padding(padding: const EdgeInsets.all(24), child: Text('$e'))],
          ),
          data: (items) {
            if (items.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  EmptyState(
                    icon: Icons.receipt_long_outlined,
                    title: 'No invoices',
                    subtitle: 'Generated invoices will show up here.',
                  ),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final inv = items[index];
                return Card(
                  child: ListTile(
                    title: Text(inv.number),
                    subtitle: Text(
                      [
                        inv.status,
                        if (inv.shipmentReference != null) inv.shipmentReference!,
                        if (inv.issuedAt != null)
                          DateFormat.yMMMd().format(inv.issuedAt!.toLocal()),
                      ].join(' · '),
                    ),
                    trailing: Text(
                      money.format(inv.total),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
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
