import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

/// A queued write that is replayed against the exact endpoint it was meant for.
/// Replaying the original request keeps the full server behaviour (session
/// close, ratings, honor checks) and relies on server-side idempotency.
class SyncMutation {
  final String id;
  final String type; // attendance | tech_review
  final String method; // PUT | POST
  final String path;
  final Map<String, dynamic> payload;
  final String timestamp;

  const SyncMutation({
    required this.id,
    required this.type,
    required this.method,
    required this.path,
    required this.payload,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'method': method,
        'path': path,
        'payload': payload,
        'timestamp': timestamp,
      };

  factory SyncMutation.fromJson(Map<String, dynamic> json) {
    final type = json['type'] as String? ?? '';
    final payload = Map<String, dynamic>.from((json['payload'] as Map?) ?? {});
    var method = json['method'] as String? ?? '';
    var path = json['path'] as String? ?? '';

    // Items queued by older builds stored only type + payload.
    if (path.isEmpty) {
      if (type == 'attendance') {
        method = 'PUT';
        path = ApiEndpoints.submitAttendance(payload.remove('sessionId')?.toString() ?? '');
      } else if (type == 'tech_review') {
        method = 'POST';
        path = ApiEndpoints.submitReview(payload['memberId']?.toString() ?? '');
      }
    }

    return SyncMutation(
      id: json['id'] as String? ?? '',
      type: type,
      method: method,
      path: path,
      payload: payload,
      timestamp: json['timestamp'] as String? ?? '',
    );
  }
}

/// True when the request never got a server verdict, so retrying later is safe.
bool isOfflineError(Object error) {
  if (error is! DioException) return false;
  if (error.response != null) return false;
  return error.type == DioExceptionType.connectionError ||
      error.type == DioExceptionType.connectionTimeout ||
      error.type == DioExceptionType.sendTimeout ||
      error.type == DioExceptionType.receiveTimeout ||
      error.type == DioExceptionType.unknown;
}

/// Server error message for display, falling back to [fallback].
String serverErrorMessage(Object error, String fallback) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['error'] != null) return data['error'].toString();
  }
  return fallback;
}

class OfflineSyncManager {
  static const String _outboxKey = 'aqa_offline_outbox_queue';
  static const String _rejectedKey = 'aqa_offline_rejected_queue';
  final ApiClient _apiClient;
  bool _flushing = false;

  OfflineSyncManager(this._apiClient);

  Future<List<SyncMutation>> getOutbox() => _read(_outboxKey);

  /// Items the server refused (validation, permission). Kept so nothing is lost silently.
  Future<List<SyncMutation>> getRejected() => _read(_rejectedKey);

  Future<List<SyncMutation>> _read(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final rawList = prefs.getStringList(key) ?? [];
    return rawList
        .map((str) => SyncMutation.fromJson(jsonDecode(str) as Map<String, dynamic>))
        .toList();
  }

  Future<void> _write(String key, List<SyncMutation> items) async {
    final prefs = await SharedPreferences.getInstance();
    if (items.isEmpty) {
      await prefs.remove(key);
    } else {
      await prefs.setStringList(key, items.map((m) => jsonEncode(m.toJson())).toList());
    }
  }

  Future<void> enqueue(SyncMutation mutation) async {
    final outbox = await getOutbox();
    outbox.removeWhere((m) => m.id == mutation.id);
    outbox.add(mutation);
    await _write(_outboxKey, outbox);
  }

  /// Replays queued items in order. Returns how many the server accepted.
  /// Stops at the first network or server failure so ordering is preserved.
  Future<int> flushOutbox() async {
    if (_flushing) return 0;
    _flushing = true;
    var accepted = 0;
    try {
      final outbox = await getOutbox();
      if (outbox.isEmpty) return 0;

      final rejected = await getRejected();
      final remaining = List<SyncMutation>.from(outbox);

      for (final mutation in outbox) {
        try {
          await _apiClient.dio.request(
            mutation.path,
            data: mutation.payload,
            options: Options(method: mutation.method),
          );
          remaining.remove(mutation);
          accepted++;
        } on DioException catch (e) {
          final status = e.response?.statusCode;
          final isClientRefusal =
              status != null && status >= 400 && status < 500 && status != 401 && status != 408 && status != 429;
          if (isClientRefusal) {
            remaining.remove(mutation);
            rejected.add(mutation);
            continue;
          }
          break; // offline, auth expired, rate limited or server error: retry later
        }
      }

      await _write(_outboxKey, remaining);
      await _write(_rejectedKey, rejected);
      return accepted;
    } catch (_) {
      return accepted;
    } finally {
      _flushing = false;
    }
  }

  /// Removes all locally stored writes. Call only after the user confirmed logout.
  Future<void> clearAll() async {
    await _write(_outboxKey, []);
    await _write(_rejectedKey, []);
  }
}
