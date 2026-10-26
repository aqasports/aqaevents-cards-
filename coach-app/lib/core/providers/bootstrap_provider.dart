import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../auth/auth_state.dart';
import '../models/coach_user.dart';
import '../models/swim_group.dart';
import '../models/swim_session.dart';
import '../models/replacement.dart';
import '../services/notification_service.dart';
import '../sync/offline_sync_manager.dart';

class BootstrapData {
  final CoachUser coach;
  final List<Map<String, dynamic>> allCoaches;
  final List<SwimGroupModel> groups;
  final List<Map<String, dynamic>> swimmers;
  final List<SwimSessionModel> allSessions;
  final List<SwimSessionModel> todaySessions;
  final List<ReplacementModel> activeReplacements;
  final List<ReplacementModel> pendingRequests;
  final List<Map<String, dynamic>> coachNotifications;
  final List<Map<String, dynamic>> myAbsences;
  final Map<String, dynamic> skillsCatalog;
  final List<Map<String, dynamic>> progressionBadges;
  final List<Map<String, dynamic>> suiviStages;
  final Map<String, dynamic> appConfig;
  final String todayDate;
  final String serverTime;

  const BootstrapData({
    required this.coach,
    this.allCoaches = const [],
    required this.groups,
    this.swimmers = const [],
    this.allSessions = const [],
    required this.todaySessions,
    required this.activeReplacements,
    required this.pendingRequests,
    this.coachNotifications = const [],
    this.myAbsences = const [],
    required this.skillsCatalog,
    this.progressionBadges = const [],
    this.suiviStages = const [],
    this.appConfig = const {},
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

    final swimmersList = (json['swimmers'] as List<dynamic>?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
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

    final coachNotifsList = (json['coachNotifications'] as List<dynamic>?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
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

    final stagesList = (json['suiviStages'] as List<dynamic>?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        const [];

    final appConfigMap = (json['appConfig'] as Map<String, dynamic>?) ?? const {};

    final todayStr = json['todayDate'] as String? ??
        DateTime.now().toIso8601String().substring(0, 10);

    return BootstrapData(
      coach: coach,
      allCoaches: coachesList,
      groups: groupsList,
      swimmers: swimmersList,
      allSessions: allSessionsList.isNotEmpty ? allSessionsList : sessionsList,
      todaySessions: sessionsList,
      activeReplacements: activeReps,
      pendingRequests: pendingReps,
      coachNotifications: coachNotifsList,
      myAbsences: absencesList,
      skillsCatalog: (json['skillsCatalog'] as Map<String, dynamic>?) ?? const {},
      progressionBadges: badgesList,
      suiviStages: stagesList,
      appConfig: appConfigMap,
      todayDate: todayStr,
      serverTime: json['serverTime'] as String? ?? todayStr,
    );
  }
}

final syncManagerProvider = Provider<OfflineSyncManager>((ref) {
  final client = ref.watch(apiClientProvider);
  return OfflineSyncManager(client);
});

class BootstrapNotifier extends AsyncNotifier<BootstrapData> {
  static const _cacheKey = 'aqa_coach_bootstrap_cache_v3';

  @override
  Future<BootstrapData> build() async {
    final authState = ref.watch(authStateProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Authentication required');
    }

    final syncManager = ref.watch(syncManagerProvider);

    // Opportunistic background flush of offline outbox without blocking UI render
    syncManager.flushOutbox().ignore();

    // Check disk cache first for 0ms instantaneous startup
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedJsonStr = prefs.getString(_cacheKey);
      if (cachedJsonStr != null && cachedJsonStr.isNotEmpty) {
        final decoded = jsonDecode(cachedJsonStr) as Map<String, dynamic>;
        final cachedData = BootstrapData.fromJson(decoded);

        // Schedule background refresh so data stays live without blocking UI
        Future.microtask(() => _fetchAndCache(background: true));

        return cachedData;
      }
    } catch (_) {
      // cache read failed or invalid, continue to network fetch
    }

    return _fetchAndCache(background: false);
  }

  Future<BootstrapData> _fetchAndCache({required bool background}) async {
    final client = ref.read(apiClientProvider);
    try {
      final response = await client.dio.get(ApiEndpoints.bootstrap);
      if (response.statusCode == 200 && response.data != null) {
        final rawMap = response.data as Map<String, dynamic>;
        final data = BootstrapData.fromJson(rawMap);

        // Cache to SharedPreferences
        try {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(_cacheKey, jsonEncode(rawMap));
        } catch (_) {}

        try {
          final notifService = ref.read(notificationServiceProvider);
          await notifService.processBootstrapEvents(
            coachNotifications: data.coachNotifications,
            pendingRequests: data.pendingRequests,
          );
        } catch (_) {}

        if (background) {
          state = AsyncData(data);
        }
        return data;
      } else {
        throw Exception('Failed to load coach bootstrap data');
      }
    } catch (err) {
      if (!background) {
        rethrow;
      }
      return state.value!;
    }
  }

  Future<void> refresh() async {
    state = const AsyncLoading<BootstrapData>().copyWithPrevious(state);
    try {
      final fresh = await _fetchAndCache(background: false);
      state = AsyncData(fresh);
    } catch (err, st) {
      state = AsyncError(err, st);
    }
  }

  /// Quiet background refresh: no loading flicker, keeps previous data on
  /// failure. Used by the foreground 120s sync timer and app-resume hook so
  /// coach notifications arrive while the app is open.
  Future<void> refreshSilently() async {
    if (state is! AsyncData<BootstrapData>) {
      await refresh();
      return;
    }
    try {
      await _fetchAndCache(background: true);
    } catch (_) {
      // Silent by design: stale data stays on screen until next tick.
    }
  }
}

final bootstrapProvider =
    AsyncNotifierProvider<BootstrapNotifier, BootstrapData>(BootstrapNotifier.new);
