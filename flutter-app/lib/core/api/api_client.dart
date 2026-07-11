import 'dart:io';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'endpoints.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient._instance);

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio _dio;
  late final PersistCookieJar _cookieJar;
  bool _initialized = false;

  ApiClient._internal();

  Future<void> initialize() async {
    if (_initialized) return;
    final dir = await getApplicationDocumentsDirectory();
    final cookieDir = Directory('${dir.path}/.cookies');
    if (!cookieDir.existsSync()) cookieDir.createSync(recursive: true);

    _cookieJar = PersistCookieJar(storage: FileStorage(cookieDir.path));
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
    _dio.interceptors.add(CookieManager(_cookieJar));
    if (kDebugMode) {
      _dio.interceptors.add(_LogInterceptor());
    }
    _initialized = true;
  }

  Dio get dio {
    assert(_initialized, 'ApiClient.initialize() must be called first');
    return _dio;
  }

  Future<void> clearCookies() async {
    if (_initialized) await _cookieJar.deleteAll();
  }

  // Convenience wrappers
  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? params}) =>
      _dio.get<T>(path, queryParameters: params);

  Future<Response<T>> post<T>(String path, {dynamic data}) =>
      _dio.post<T>(path, data: data);

  Future<Response<T>> patch<T>(String path, {dynamic data}) =>
      _dio.patch<T>(path, data: data);

  Future<Response<T>> delete<T>(String path) => _dio.delete<T>(path);
}

class _LogInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    debugPrint('[API] ${options.method} ${options.baseUrl}${options.path}');
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    debugPrint('[API ERR] ${err.response?.statusCode} ${err.requestOptions.path}');
    handler.next(err);
  }
}
