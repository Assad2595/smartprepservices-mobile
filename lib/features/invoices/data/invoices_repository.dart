import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../domain/models/invoice.dart';

final invoicesRepositoryProvider = Provider<InvoicesRepository>((ref) {
  return InvoicesRepository(ref.watch(dioProvider));
});

class InvoicesRepository {
  InvoicesRepository(this._dio);

  final Dio _dio;

  Future<List<InvoiceSummary>> list() async {
    final res = await _dio.get<Map<String, dynamic>>('/invoices');
    return unwrapList(res.data)
        .whereType<Map<String, dynamic>>()
        .map(InvoiceSummary.fromJson)
        .toList();
  }
}
