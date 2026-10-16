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
  final List<Map<String, dynamic>> allCoaches;
  final List<SwimGroupModel> groups;
  final List<SwimSessionModel> allSessions;
  final List<SwimSessionModel> todaySessions;
  final List<ReplacementModel> activeReplacements;
  final List<ReplacementModel> pendingRequests;
  final List<Map<String, dynamic>> myAbsences;
  final Map<String, dynamic> skillsCatalog;
  final List<Map<String, dynamic>> progressionBadges;
  final String todayDate;
  final String serverTime;

  const BootstrapData({
    required this.coach,
    this.allCoaches = const [],
    required this.groups,
    this.allSessions = const [],
    required this.todaySessions,
    required this.activeReplacements,
    required this.pendingRequests,
    this.myAbsences = const [],
    required this.skillsCatalog,
    this.progressionBadges = const [],
    this.todayDate = '',
    required this.serverTime,
  });

  factory BootstrapData.fromJson(Map<String, dynamic> json) {
    final coach = CoachUser.fromJson(json['coach'] as Map<String, dynamic>);
    final currentCoachId = coach.id;

    final groupsList = (json['groups'] as List<dynamic>?)
            ?.map((e) => SwimGroupModel.fromJson(e as Map<String, dynamic>))
            .toList() ??
        const [];

    final allSessionsList = (json['sessions'] as List<dynamic>?)
            ?.map((e) => SwimSessionModel.fromJson(e as Map<String, dynamic>))
            .toList() ??
        const [];

    final todaySessionsRaw = (json['todaySessions'] as List<dynamic>?) ??
        (json['sessions'] as List<dynamic>?);

    final sessionsList = todaySessionsRaw
            ?.map((e) => SwimSessionModel.fromJson(e as Map<String, dynamic>))
            .toList() ??
        const [];

    final activeReps = (json['activeReplacements'] as List<dynamic>?)
            ?.map((e) => ReplacementModel.fromJson(
                  e as Map<String, dynamic>,
                  currentCoachId: currentCoachId,
                ))
            .toList() ??
        const [];

    final pendingRaw = (json['pendingRequests'] as List<dynamic>?) ??
        (json['pendingReplacements'] as List<dynamic>?);

    final pendingReps = pendingRaw
            ?.map((e) => ReplacementModel.fromJson(
                  e as Map<String, dynamic>,
                  currentCoachId: currentCoachId,
                ))
            .toList() ??
        const [];

    final coachesList = (json['allCoaches'] as List<dynamic>?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        const [];

    final absencesList = (json['myAbsences'] as List<dynamic>?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        const [];

    final badgesList = (json['progressionBadges'] as List<dynamic>?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        const [];

    final todayStr = json['todayDate'] as String? ??
        DateTime.now().toIso8601String().substring(0, 10);

    return BootstrapData(
      coach: coach,
      allCoaches: coachesList,
      groups: groupsList,
      allSessions: allSessionsList.isNotEmpty ? allSessionsList : sessionsList,
      todaySessions: sessionsList,
      activeReplacements: activeReps,
      pendingRequests: pendingReps,
      myAbsences: absencesList,
      skillsCatalog: (json['skillsCatalog'] as Map<String, dynamic>?) ?? const {},
      progressionBadges: badgesList,
      todayDate: todayStr,
      serverTime: json['serverTime'] as String? ?? todayStr,
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

