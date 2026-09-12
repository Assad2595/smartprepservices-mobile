import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/dashboard_repository.dart';

final dashboardProvider = FutureProvider.autoDispose<DashboardKpis>((ref) async {
  final user = ref.watch(authControllerProvider).user;
  if (user == null) return const DashboardKpis();
  return ref.watch(dashboardRepositoryProvider).fetch(user.role);
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final kpis = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Smart Prep'),
        actions: [
          IconButton(
            tooltip: 'Account menu',
            onPressed: () {
              final scaffold = context.findRootAncestorStateOfType<ScaffoldState>();
              scaffold?.openDrawer();
            },
            icon: const Icon(Icons.menu),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(dashboardProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Hello, ${auth.user?.firstName ?? 'there'}',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              auth.user?.role.isStaff == true
                  ? 'Warehouse floor overview'
                  : 'Your shipment & billing overview',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.blueGrey,
                  ),
            ),
            const SizedBox(height: 20),
            kpis.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Could not load KPIs: $e'),
                ),
              ),
              data: (data) => Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _KpiCard(label: 'Open shipments', value: data.openShipments),
                  _KpiCard(label: 'Awaiting FNSKU', value: data.awaitingFnsku),
                  _KpiCard(label: 'Awaiting payment', value: data.awaitingPayment),
                  _KpiCard(label: 'Ready to ship', value: data.readyToShip),
                  _KpiCard(label: 'Unpaid invoices', value: data.unpaidInvoices),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: (MediaQuery.sizeOf(context).width - 44) / 2,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$value',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF0B1F3A),
                    ),
              ),
              const SizedBox(height: 4),
              Text(label, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}
