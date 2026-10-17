import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_endpoints.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  final Dio _dio = Dio();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const String keyAccessToken = 'aqa_coach_access_token';
  static const String keyRefreshToken = 'aqa_coach_refresh_token';
  static const String keyCoachData = 'aqa_coach_user_data';

  String? _memoryAccessToken;
  String? _memoryRefreshToken;

  bool _isRefreshing = false;
  final List<Completer<String?>> _refreshCompleters = [];
  void Function()? onUnauthorized;

  ApiClient._internal() {
    _dio.options = BaseOptions(
      baseUrl: ApiEndpoints.baseUrl,
      connectTimeout: const Duration(seconds: 45),
      receiveTimeout: const Duration(seconds: 45),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          options.baseUrl = ApiEndpoints.baseUrl;

          final path = options.path;
          if (!path.contains('/auth/login') && !path.contains('/auth/refresh')) {
            String? token = _memoryAccessToken;
            if (token == null || token.isEmpty) {
              try {
                token = await _storage.read(key: keyAccessToken);
                _memoryAccessToken = token;
              } catch (_) {}
            }
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401 &&
              !error.requestOptions.path.contains('/auth/login') &&
              !error.requestOptions.path.contains('/auth/refresh')) {
            final newToken = await _attemptRefreshToken();
            if (newToken != null && newToken.isNotEmpty) {
              final opts = error.requestOptions;
              opts.headers['Authorization'] = 'Bearer $newToken';
              opts.baseUrl = ApiEndpoints.baseUrl;

              try {
                final response = await _dio.fetch(opts);
                return handler.resolve(response);
              } catch (e) {
                await clearTokens();
                return handler.next(error);
              }
            } else {
              await clearTokens();
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Dio get dio => _dio;
  FlutterSecureStorage get storage => _storage;

  Future<String?> _attemptRefreshToken() async {
    if (_isRefreshing) {
      final completer = Completer<String?>();
      _refreshCompleters.add(completer);
      return completer.future;
    }

    _isRefreshing = true;

    try {
      String? refreshToken = _memoryRefreshToken;
      if (refreshToken == null || refreshToken.isEmpty) {
        try {
          refreshToken = await _storage.read(key: keyRefreshToken);
        } catch (_) {}
      }

      if (refreshToken == null || refreshToken.isEmpty) {
        await clearTokens();
        _flushRefreshCompleters(null);
        return null;
      }

      final refreshDio = Dio(
        BaseOptions(
          baseUrl: ApiEndpoints.baseUrl,
          connectTimeout: const Duration(seconds: 12),
          receiveTimeout: const Duration(seconds: 12),
        ),
      );

      final response = await refreshDio.post(
        ApiEndpoints.refresh,
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200 && response.data != null) {
        final newAccess =
            (response.data['token'] ?? response.data['accessToken']) as String?;
        final newRefresh = response.data['refreshToken'] as String?;

        if (newAccess != null && newAccess.isNotEmpty) {
          _memoryAccessToken = newAccess;
          if (newRefresh != null && newRefresh.isNotEmpty) {
            _memoryRefreshToken = newRefresh;
          }
          try {
            await _storage.write(key: keyAccessToken, value: newAccess);
            if (newRefresh != null && newRefresh.isNotEmpty) {
              await _storage.write(key: keyRefreshToken, value: newRefresh);
            }
          } catch (_) {}
          _flushRefreshCompleters(newAccess);
          return newAccess;
        }
      }

      await clearTokens();
      _flushRefreshCompleters(null);
      return null;
    } catch (_) {
      await clearTokens();
      _flushRefreshCompleters(null);
      return null;
    } finally {
      _isRefreshing = false;
    }
  }

  void _flushRefreshCompleters(String? token) {
    for (final c in _refreshCompleters) {
      if (!c.isCompleted) c.complete(token);
    }
    _refreshCompleters.clear();
  }

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    String? coachJson,
  }) async {
    _memoryAccessToken = accessToken;
    _memoryRefreshToken = refreshToken;
    try {
      await _storage.write(key: keyAccessToken, value: accessToken);
      await _storage.write(key: keyRefreshToken, value: refreshToken);
      if (coachJson != null) {
        await _storage.write(key: keyCoachData, value: coachJson);
      }
    } catch (_) {}
  }

  Future<void> clearTokens() async {
    _memoryAccessToken = null;
    _memoryRefreshToken = null;
    try {
      await _storage.delete(key: keyAccessToken);
      await _storage.delete(key: keyRefreshToken);
      await _storage.delete(key: keyCoachData);
    } catch (_) {}
    onUnauthorized?.call();
  }
}

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
