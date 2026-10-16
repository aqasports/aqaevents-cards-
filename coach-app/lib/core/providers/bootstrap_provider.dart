import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../auth/auth_state.dart';
import '../models/coach_user.dart';
import '../models/swim_group.dart';
import '../models/swim_session.dart';
import '../models/replacement.dart';
import '../sync/offline_sync_manager.dart';

class BootstrapData {
  final CoachUser coach;
  final List<SwimGroupModel> groups;
  final List<SwimSessionModel> todaySessions;
  final List<ReplacementModel> activeReplacements;
  final List<ReplacementModel> pendingRequests;
  final Map<String, dynamic> skillsCatalog;
  final String serverTime;

  const BootstrapData({
    required this.coach,
    required this.groups,
    required this.todaySessions,
    required this.activeReplacements,
    required this.pendingRequests,
    required this.skillsCatalog,
    required this.serverTime,
  });

  factory BootstrapData.fromJson(Map<String, dynamic> json) {
    final coach = CoachUser.fromJson(json['coach'] as Map<String, dynamic>);
    final currentCoachId = coach.id;

    final groupsList = (json['groups'] as List<dynamic>?)
            ?.map((e) => SwimGroupModel.fromJson(e as Map<String, dynamic>))
            .toList() ??
        const [];

    final sessionsList = (json['todaySessions'] as List<dynamic>?)
            ?.map((e) => SwimSessionModel.fromJson(e as Map<String, dynamic>))
            .toList() ??
        const [];

    final activeReps = (json['activeReplacements'] as List<dynamic>?)
            ?.map((e) => ReplacementModel.fromJson(e as Map<String, dynamic>, currentCoachId: currentCoachId))
            .toList() ??
        const [];

    final pendingReps = (json['pendingRequests'] as List<dynamic>?)
            ?.map((e) => ReplacementModel.fromJson(e as Map<String, dynamic>, currentCoachId: currentCoachId))
            .toList() ??
        const [];

    return BootstrapData(
      coach: coach,
      groups: groupsList,
      todaySessions: sessionsList,
      activeReplacements: activeReps,
      pendingRequests: pendingReps,
      skillsCatalog: (json['skillsCatalog'] as Map<String, dynamic>?) ?? const {},
      serverTime: json['serverTime'] as String? ?? '',
    );
  }
}

final syncManagerProvider = Provider<OfflineSyncManager>((ref) {
  final client = ref.watch(apiClientProvider);
  return OfflineSyncManager(client);
});

final bootstrapProvider = FutureProvider.autoDispose<BootstrapData>((ref) async {
  final authState = ref.watch(authStateProvider);
  if (!authState.isAuthenticated) {
    throw Exception('Authentication required');
  }

  final client = ref.watch(apiClientProvider);
  final syncManager = ref.watch(syncManagerProvider);

  // Opportunistic flush of offline outbox
  await syncManager.flushOutbox();

  final response = await client.dio.get(ApiEndpoints.bootstrap);
  if (response.statusCode == 200 && response.data != null) {
    return BootstrapData.fromJson(response.data as Map<String, dynamic>);
  } else {
    throw Exception('Failed to load coach bootstrap data');
  }
});
