import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/token_storage.dart';
import '../domain/models/user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    dio: ref.watch(dioProvider),
    storage: ref.watch(tokenStorageProvider),
  );
});

class AuthRepository {
  AuthRepository({required Dio dio, required TokenStorage storage})
      : _dio = dio,
        _storage = storage;

  final Dio _dio;
  final TokenStorage _storage;

  Future<LoginResult> login({
    required String email,
    required String password,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': email.trim(), 'password': password},
    );
    final data = unwrapData(res.data);
    final result = LoginResult.fromJson(data);
    await _storage.saveTokens(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    );
    await _storage.saveUserJson(jsonEncode(result.user.toJson()));
    return result;
  }

  Future<AuthUser?> restoreSession() async {
    final access = await _storage.readAccessToken();
    final cached = await _storage.readUserJson();
    if (access == null || access.isEmpty) return null;

    try {
      final res = await _dio.get<Map<String, dynamic>>('/auth/me');
      final data = unwrapData(res.data);
      final user = AuthUser.fromJson(data);
      await _storage.saveUserJson(jsonEncode(user.toJson()));
      return user;
    } catch (_) {
      if (cached != null) {
        return AuthUser.fromJson(jsonDecode(cached) as Map<String, dynamic>);
      }
      await _storage.clear();
      return null;
    }
  }

  Future<void> logout() async {
    try {
      final refresh = await _storage.readRefreshToken();
      await _dio.post<dynamic>(
        '/auth/logout',
        data: {'refreshToken': refresh},
      );
    } catch (_) {
      // Still clear local session.
    } finally {
      await _storage.clear();
    }
  }
}
