import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../domain/models/shipment.dart';

final shipmentsRepositoryProvider = Provider<ShipmentsRepository>((ref) {
  return ShipmentsRepository(ref.watch(dioProvider));
});

class ShipmentsRepository {
  ShipmentsRepository(this._dio);

  final Dio _dio;

  Future<List<ShipmentSummary>> list({String? status, String? search}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/shipments',
      queryParameters: {
        if (status != null && status.isNotEmpty) 'status': status,
        if (search != null && search.isNotEmpty) 'search': search,
      },
    );
    return unwrapList(res.data)
        .whereType<Map<String, dynamic>>()
        .map(ShipmentSummary.fromJson)
        .toList();
  }

  Future<ShipmentDetail> getById(String id) async {
    final res = await _dio.get<Map<String, dynamic>>('/shipments/$id');
    return ShipmentDetail.fromJson(unwrapData(res.data));
  }

  Future<ShipmentDetail> transition({
    required String id,
    required ShipmentStatus toStatus,
    String? note,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/shipments/$id/transition',
      data: {
        'toStatus': toStatus.apiValue,
        if (note != null && note.isNotEmpty) 'note': note,
      },
    );
    return ShipmentDetail.fromJson(unwrapData(res.data));
  }
}
