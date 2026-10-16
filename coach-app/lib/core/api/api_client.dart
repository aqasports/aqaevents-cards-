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

  bool _isRefreshing = false;
  final List<Completer<String?>> _refreshCompleters = [];
  void Function()? onUnauthorized;

  ApiClient._internal() {
    _dio.options = BaseOptions(
      baseUrl: ApiEndpoints.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Always ensure the latest baseUrl is used
          options.baseUrl = ApiEndpoints.baseUrl;

          // Exclude auth routes from bearer injection
          final path = options.path;
          if (!path.contains('/auth/login') && !path.contains('/auth/refresh')) {
            final token = await _storage.read(key: keyAccessToken);
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
            // Attempt token refresh
            final newToken = await _attemptRefreshToken();
            if (newToken != null) {
              final opts = error.requestOptions;
              opts.headers['Authorization'] = 'Bearer $newToken';
              opts.baseUrl = ApiEndpoints.baseUrl;

              try {
                final response = await _dio.fetch(opts);
                return handler.resolve(response);
              } catch (e) {
                return handler.next(error);
              }
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
      final refreshToken = await _storage.read(key: keyRefreshToken);
      if (refreshToken == null || refreshToken.isEmpty) {
        _flushRefreshCompleters(null);
        return null;
      }

      final refreshDio = Dio(BaseOptions(
        baseUrl: ApiEndpoints.baseUrl,
        connectTimeout: const Duration(seconds: 10),
      ));

      final response = await refreshDio.post(
        ApiEndpoints.refresh,
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200 && response.data != null) {
        final newAccess = response.data['token'] as String?;
        final newRefresh = response.data['refreshToken'] as String?;

        if (newAccess != null) {
          await _storage.write(key: keyAccessToken, value: newAccess);
          if (newRefresh != null) {
            await _storage.write(key: keyRefreshToken, value: newRefresh);
          }
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
    await _storage.write(key: keyAccessToken, value: accessToken);
    await _storage.write(key: keyRefreshToken, value: refreshToken);
    if (coachJson != null) {
      await _storage.write(key: keyCoachData, value: coachJson);
    }
  }

  Future<void> clearTokens() async {
    await _storage.delete(key: keyAccessToken);
    await _storage.delete(key: keyRefreshToken);
    await _storage.delete(key: keyCoachData);
    onUnauthorized?.call();
  }
}

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

