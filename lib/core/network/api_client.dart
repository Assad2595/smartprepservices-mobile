import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/env.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  final dio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.readAccessToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode != 401) {
          return handler.next(error);
        }

        final path = error.requestOptions.path;
        if (path.contains('/auth/login') || path.contains('/auth/refresh')) {
          return handler.next(error);
        }

        final refresh = await storage.readRefreshToken();
        if (refresh == null || refresh.isEmpty) {
          await storage.clear();
          return handler.next(error);
        }

        try {
          final refreshDio = Dio(BaseOptions(baseUrl: Env.apiBaseUrl));
          final res = await refreshDio.post<Map<String, dynamic>>(
            '/auth/refresh',
            data: {'refreshToken': refresh},
          );
          final payload = unwrapData(res.data);
          final access = payload['accessToken'] as String?;
          final nextRefresh = payload['refreshToken'] as String?;
          if (access == null || nextRefresh == null) {
            await storage.clear();
            return handler.next(error);
          }
          await storage.saveTokens(
            accessToken: access,
            refreshToken: nextRefresh,
          );

          final req = error.requestOptions;
          req.headers['Authorization'] = 'Bearer $access';
          final clone = await dio.fetch<dynamic>(req);
          return handler.resolve(clone);
        } catch (_) {
          await storage.clear();
          return handler.next(error);
        }
      },
    ),
  );

  return dio;
});

/// Nest wraps most bodies as `{ success, data }`.
Map<String, dynamic> unwrapData(dynamic body) {
  if (body is Map<String, dynamic>) {
    if (body['data'] is Map<String, dynamic>) {
      return body['data'] as Map<String, dynamic>;
    }
    return body;
  }
  throw ApiException('Unexpected response shape');
}

List<dynamic> unwrapList(dynamic body) {
  if (body is Map<String, dynamic>) {
    final data = body['data'];
    if (data is List) return data;
    if (data is Map<String, dynamic> && data['items'] is List) {
      return data['items'] as List<dynamic>;
    }
  }
  if (body is List) return body;
  throw ApiException('Unexpected list response');
}

String extractErrorMessage(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) {
      final msg = data['message'];
      if (msg is List) return msg.join(', ');
      return msg.toString();
    }
    return error.message ?? 'Network error';
  }
  if (error is ApiException) return error.message;
  return error.toString();
}
