import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

class SyncMutation {
  final String id;
  final String type; // attendance | tech_review
  final Map<String, dynamic> payload;
  final String timestamp;

  const SyncMutation({
    required this.id,
    required this.type,
    required this.payload,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'payload': payload,
        'timestamp': timestamp,
      };

  factory SyncMutation.fromJson(Map<String, dynamic> json) => SyncMutation(
        id: json['id'] as String? ?? '',
        type: json['type'] as String? ?? '',
        payload: (json['payload'] as Map<String, dynamic>?) ?? {},
        timestamp: json['timestamp'] as String? ?? '',
      );
}

class OfflineSyncManager {
  static const String _outboxKey = 'aqa_offline_outbox_queue';
  final ApiClient _apiClient;

  OfflineSyncManager(this._apiClient);

  Future<List<SyncMutation>> getOutbox() async {
    final prefs = await SharedPreferences.getInstance();
    final rawList = prefs.getStringList(_outboxKey) ?? [];
    return rawList.map((str) => SyncMutation.fromJson(jsonDecode(str))).toList();
  }

  Future<void> enqueue(SyncMutation mutation) async {
    final prefs = await SharedPreferences.getInstance();
    final rawList = prefs.getStringList(_outboxKey) ?? [];
    rawList.add(jsonEncode(mutation.toJson()));
    await prefs.setStringList(_outboxKey, rawList);
  }

  Future<int> flushOutbox() async {
    final outbox = await getOutbox();
    if (outbox.isEmpty) return 0;

    try {
      final response = await _apiClient.dio.post(
        ApiEndpoints.syncOutbox,
        data: {
          'mutations': outbox.map((m) => m.toJson()).toList(),
        },
      );

      if (response.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(_outboxKey);
        return outbox.length;
      }
    } catch (_) {
      // Retain in outbox if sync failed
    }
    return 0;
  }
}
