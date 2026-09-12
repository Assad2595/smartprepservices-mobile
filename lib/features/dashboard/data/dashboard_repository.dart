import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../auth/domain/models/user.dart';

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(ref.watch(dioProvider));
});

class DashboardKpis {
  const DashboardKpis({
    this.openShipments = 0,
    this.awaitingFnsku = 0,
    this.awaitingPayment = 0,
    this.readyToShip = 0,
    this.unpaidInvoices = 0,
    this.raw = const {},
  });

  final int openShipments;
  final int awaitingFnsku;
  final int awaitingPayment;
  final int readyToShip;
  final int unpaidInvoices;
  final Map<String, dynamic> raw;

  factory DashboardKpis.fromJson(Map<String, dynamic> json) {
    int read(List<String> keys) {
      for (final key in keys) {
        final v = json[key];
        if (v is int) return v;
        if (v is num) return v.toInt();
      }
      return 0;
    }

    return DashboardKpis(
      openShipments: read(['openShipments', 'activeShipments', 'totalOpen']),
      awaitingFnsku: read(['awaitingFnsku', 'waitingForFnsku']),
      awaitingPayment: read(['awaitingPayment', 'waitingForPayment']),
      readyToShip: read(['readyToShip']),
      unpaidInvoices: read(['unpaidInvoices', 'openInvoices']),
      raw: json,
    );
  }
}

class DashboardRepository {
  DashboardRepository(this._dio);

  final Dio _dio;

  Future<DashboardKpis> fetch(Role role) async {
    final path = role == Role.customer ? '/dashboard/customer' : '/dashboard/admin';
    try {
      final res = await _dio.get<Map<String, dynamic>>(path);
      return DashboardKpis.fromJson(unwrapData(res.data));
    } catch (_) {
      // Fallback if API only exposes /dashboard
      final res = await _dio.get<Map<String, dynamic>>('/dashboard');
      return DashboardKpis.fromJson(unwrapData(res.data));
    }
  }
}
