import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../domain/models/product.dart';

final productsRepositoryProvider = Provider<ProductsRepository>((ref) {
  return ProductsRepository(ref.watch(dioProvider));
});

class ProductsRepository {
  ProductsRepository(this._dio);

  final Dio _dio;

  Future<List<Product>> list({String? search}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/products',
      queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
      },
    );
    return unwrapList(res.data)
        .whereType<Map<String, dynamic>>()
        .map(Product.fromJson)
        .toList();
  }
}
