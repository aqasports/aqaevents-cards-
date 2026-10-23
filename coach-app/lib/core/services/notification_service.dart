import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../i18n/app_i18n.dart';
import '../models/replacement.dart';
import 'web_notification_stub.dart'
    if (dart.library.js_interop) 'web_notification_web.dart' as platform_notif;

class NotificationSettingsState {
  final bool isAuthorized;
  final bool notifyNewClient;
  final bool notifyGroupMovement;
  final bool notifyReplacements;
  final bool notifySessionReminder;
  final Set<String> dismissedIds;

  const NotificationSettingsState({
    required this.isAuthorized,
    required this.notifyNewClient,
    required this.notifyGroupMovement,
    required this.notifyReplacements,
    required this.notifySessionReminder,
    this.dismissedIds = const {},
  });

  NotificationSettingsState copyWith({
    bool? isAuthorized,
    bool? notifyNewClient,
    bool? notifyGroupMovement,
    bool? notifyReplacements,
    bool? notifySessionReminder,
    Set<String>? dismissedIds,
  }) {
    return NotificationSettingsState(
      isAuthorized: isAuthorized ?? this.isAuthorized,
      notifyNewClient: notifyNewClient ?? this.notifyNewClient,
      notifyGroupMovement: notifyGroupMovement ?? this.notifyGroupMovement,
      notifyReplacements: notifyReplacements ?? this.notifyReplacements,
      notifySessionReminder:
          notifySessionReminder ?? this.notifySessionReminder,
      dismissedIds: dismissedIds ?? this.dismissedIds,
    );
  }
}

class NotificationService {
  static const _prefKeyAuth = 'aqa_coach_notifications_authorized';
  static const _prefKeyPromptedOnce = 'aqa_coach_notifications_prompted_v2';
  static const _prefKeyNewClient = 'aqa_coach_notify_new_client';
  static const _prefKeyGroupMovement = 'aqa_coach_notify_group_movement';
  static const _prefKeyReplacements = 'aqa_coach_notify_replacements';
  static const _prefKeySessionReminder = 'aqa_coach_notify_session_reminder';
  static const _prefKeySeenIds = 'aqa_coach_seen_notification_ids';
  static const _prefKeyDismissedIds = 'aqa_coach_dismissed_notification_ids';

  static const MethodChannel _nativeChannel =
      MethodChannel('com.aqasports.aqa_coaches/notifications');

  final SharedPreferences _prefs;
  bool _isAuthorized = false;
  bool _notifyNewClient = true;
  bool _notifyGroupMovement = true;
  bool _notifyReplacements = true;
  bool _notifySessionReminder = true;
  late Set<String> _seenIds;
  late Set<String> _dismissedIds;
  Future<bool>? _promptInFlight;

  NotificationService(this._prefs) {
    _isAuthorized = _prefs.getBool(_prefKeyAuth) ?? false;
    _notifyNewClient = _prefs.getBool(_prefKeyNewClient) ?? true;
    _notifyGroupMovement = _prefs.getBool(_prefKeyGroupMovement) ?? true;
    _notifyReplacements = _prefs.getBool(_prefKeyReplacements) ?? true;
    _notifySessionReminder = _prefs.getBool(_prefKeySessionReminder) ?? true;
    _seenIds = (_prefs.getStringList(_prefKeySeenIds) ?? const []).toSet();
    _dismissedIds =
        (_prefs.getStringList(_prefKeyDismissedIds) ?? const []).toSet();
  }

  /// Localized notification strings based on the coach's saved app language.
  AppI18n get _i18n {
    final lang = _prefs.getString('aqa_coach_i18next_lng') ?? 'fr';
    return AppI18n(['fr', 'en', 'ar'].contains(lang) ? lang : 'fr');
  }

  bool get isAuthorized => _isAuthorized;
  bool get notifyNewClient => _notifyNewClient;
  bool get notifyGroupMovement => _notifyGroupMovement;
  bool get notifyReplacements => _notifyReplacements;
  bool get notifySessionReminder => _notifySessionReminder;
  Set<String> get dismissedIds => _dismissedIds;

  NotificationSettingsState get currentState => NotificationSettingsState(
        isAuthorized: _isAuthorized,
        notifyNewClient: _notifyNewClient,
        notifyGroupMovement: _notifyGroupMovement,
        notifyReplacements: _notifyReplacements,
        notifySessionReminder: _notifySessionReminder,
        dismissedIds: Set.unmodifiable(_dismissedIds),
      );

  /// Synchronizes with native Android/iOS OS permission state. Prompts the user
  /// ONLY on the very first launch — after that, a denied state is respected and
  /// the UI must offer the "OS Settings" escape hatch instead of re-prompting.
  Future<bool> ensureInitializedAndPromptIfFirstRun() async {
    if (kIsWeb) return _isAuthorized;
    try {
      final osGranted =
          await _nativeChannel.invokeMethod<bool>('checkPermission') ?? false;

      if (osGranted) {
        _isAuthorized = true;
        await _prefs.setBool(_prefKeyAuth, true);
        return true;
      }

      final alreadyPrompted = _prefs.getBool(_prefKeyPromptedOnce) ?? false;
      if (alreadyPrompted) {
        // Respect the denial: never nag on every launch. The profile screen
        // exposes a direct "open OS settings" button for recovery.
        _isAuthorized = false;
        await _prefs.setBool(_prefKeyAuth, false);
        return false;
      }

      return await requestPermission();
    } catch (e) {
      debugPrint('Native notification check failed: $e');
      return _isAuthorized;
    }
  }

  /// Passively syncs the in-memory/persisted authorization state from the OS
  /// WITHOUT ever triggering the system permission dialog.
  Future<bool> syncFromSystem() async {
    if (kIsWeb) return _isAuthorized;
    try {
      final osGranted =
          await _nativeChannel.invokeMethod<bool>('checkPermission') ?? false;
      _isAuthorized = osGranted;
      await _prefs.setBool(_prefKeyAuth, osGranted);
      return osGranted;
    } catch (e) {
      debugPrint('Native notification sync failed: $e');
      return _isAuthorized;
    }
  }

  /// Requests notification permission from the browser or native Android/iOS OS
  Future<bool> requestPermission() async {
    // Collapse concurrent prompt attempts (HomeScreen + settings notifier both
    // fire at startup) into a single OS dialog.
    if (_promptInFlight != null) return _promptInFlight!;

    final future = _requestPermissionInternal();
    _promptInFlight = future;
    try {
      return await future;
    } finally {
      _promptInFlight = null;
    }
  }

  Future<bool> _requestPermissionInternal() async {
    bool granted = false;

    if (kIsWeb) {
      granted = await platform_notif.requestWebNotificationPermission();
    } else {
      try {
        await _prefs.setBool(_prefKeyPromptedOnce, true);
        granted =
            await _nativeChannel.invokeMethod<bool>('requestPermission') ??
                false;
      } catch (e) {
        debugPrint('Native requestPermission error: $e');
        granted = false;
      }
    }

    _isAuthorized = granted;
    await _prefs.setBool(_prefKeyAuth, granted);
    return granted;
  }

  Future<void> setAuthorized(bool value) async {
    if (value) {
      await requestPermission();
    } else {
      _isAuthorized = false;
      await _prefs.setBool(_prefKeyAuth, false);
    }
  }

  Future<void> setNotifyNewClient(bool value) async {
    _notifyNewClient = value;
    await _prefs.setBool(_prefKeyNewClient, value);
  }

  Future<void> setNotifyGroupMovement(bool value) async {
    _notifyGroupMovement = value;
    await _prefs.setBool(_prefKeyGroupMovement, value);
  }

  Future<void> setNotifyReplacements(bool value) async {
    _notifyReplacements = value;
    await _prefs.setBool(_prefKeyReplacements, value);
  }

  Future<void> setNotifySessionReminder(bool value) async {
    _notifySessionReminder = value;
    await _prefs.setBool(_prefKeySessionReminder, value);
  }

  Future<void> dismissNotification(String id) async {
    _dismissedIds.add(id);
    if (_dismissedIds.length > 200) {
      _dismissedIds = _dismissedIds.skip(_dismissedIds.length - 150).toSet();
    }
    await _prefs.setStringList(_prefKeyDismissedIds, _dismissedIds.toList());
  }

  Future<void> markAllAsSeen(List<String> ids) async {
    _seenIds.addAll(ids);
    _dismissedIds.addAll(ids);
    if (_dismissedIds.length > 200) {
      _dismissedIds = _dismissedIds.skip(_dismissedIds.length - 150).toSet();
    }
    if (_seenIds.length > 300) {
      _seenIds = _seenIds.skip(_seenIds.length - 200).toSet();
    }
    await _prefs.setStringList(_prefKeySeenIds, _seenIds.toList());
    await _prefs.setStringList(_prefKeyDismissedIds, _dismissedIds.toList());
  }

  Future<void> _markSeen(String id) async {
    _seenIds.add(id);
    if (_seenIds.length > 300) {
      _seenIds = _seenIds.skip(_seenIds.length - 200).toSet();
    }
    await _prefs.setStringList(_prefKeySeenIds, _seenIds.toList());
  }

  Future<void> openNotificationSettings() async {
    if (kIsWeb) return;
    try {
      await _nativeChannel.invokeMethod('openNotificationSettings');
    } catch (e) {
      debugPrint('Native openNotificationSettings error: $e');
    }
  }

  /// Sends a local notification to the coach's device (Web or Native Android/iOS)
  Future<bool> showNotification({
    required String title,
    required String body,
    String? tag,
  }) async {
    if (kIsWeb) {
      if (!_isAuthorized) return false;
      platform_notif.showWebNotification(
        title: title,
        body: body,
        tag: tag,
      );
      return true;
    } else {
      try {
        final result =
            await _nativeChannel.invokeMethod<bool>('showNotification', {
          'title': title,
          'body': body,
          'tag': tag ?? 'aqa-${DateTime.now().millisecondsSinceEpoch}',
        });
        return result ?? false;
      } catch (e) {
        debugPrint('Native showNotification error: $e');
        return false;
      }
    }
  }

  /// Evaluates incoming coach notifications (NEW_CLIENT, MOVEMENT) and replacement requests
  /// from bootstrap data and dispatches native device notifications once per event.
  Future<void> processBootstrapEvents({
    required List<Map<String, dynamic>> coachNotifications,
    required List<ReplacementModel> pendingRequests,
  }) async {
    if (!_isAuthorized) return;

    for (final notif in coachNotifications) {
      final id = notif['id']?.toString() ?? '';
      if (id.isEmpty || _seenIds.contains(id)) continue;

      final eventType = notif['eventType']?.toString() ?? 'NEW_CLIENT';
      final movementKind = notif['movementKind']?.toString();
      final memberName = notif['memberName']?.toString() ?? 'Nageur AQA';
      final groupName = notif['groupName']?.toString() ?? 'Groupe AQA';
      final fromGroupName = notif['fromGroupName']?.toString();

      if (eventType == 'NEW_CLIENT') {
        final isNewActive = notif['isNewClientLabelActive'] as bool? ?? false;
        if (!isNewActive) {
          await _markSeen(id);
          continue;
        }
        await _markSeen(id);
        if (_notifyNewClient) {
          await showNotification(
            title: _i18n.t('notif.new_client_title', {'group': groupName}),
            body: _i18n.t('notif.new_client_body', {
              'member': memberName,
              'group': groupName,
            }),
            tag: 'aqa-new-client-$id',
          );
        }
      } else if (eventType == 'MOVEMENT') {
        await _markSeen(id);
        if (_notifyGroupMovement) {
          final isMulti = movementKind == 'multi_group';
          final bodyText = isMulti
              ? _i18n.t('notif.multi_body', {
                  'member': memberName,
                  'group': groupName,
                })
              : fromGroupName != null && fromGroupName.isNotEmpty
                  ? _i18n.t('notif.movement_transfer_body', {
                      'member': memberName,
                      'from': fromGroupName,
                      'group': groupName,
                    })
                  : _i18n.t('notif.movement_join_body', {
                      'member': memberName,
                      'group': groupName,
                    });
          await showNotification(
            title: isMulti
                ? _i18n.t('notif.multi_title', {'group': groupName})
                : _i18n.t('notif.movement_title', {'group': groupName}),
            body: bodyText,
            tag: 'aqa-movement-$id',
          );
        }
      }
    }

    if (_notifyReplacements) {
      for (final rep in pendingRequests) {
        if (!rep.isIncomingRequest) continue;
        final repKey = 'rep-${rep.id}';
        if (_seenIds.contains(repKey)) continue;

        await _markSeen(repKey);
        await showNotification(
          title: _i18n.t('notif.replacement_title', {'group': rep.groupName}),
          body: _i18n.t('notif.replacement_body', {
            'coach': rep.originalCoachName,
            'date': rep.sessionDate,
            'time': rep.startTime,
          }),
          tag: repKey,
        );
      }
    }
  }
}

class NotificationSettingsNotifier
    extends StateNotifier<NotificationSettingsState> {
  final NotificationService _service;
  final Ref _ref;

  NotificationSettingsNotifier(this._service, this._ref)
      : super(_service.currentState) {
    _syncNativeOnInit();
  }

  Future<void> _syncNativeOnInit() async {
    // Passive sync only — HomeScreen owns the one-time permission prompt.
    // This eliminates the startup double system dialog.
    final granted = await _service.syncFromSystem();
    if (mounted) {
      state = _service.currentState;
      _ref.read(notificationPermissionProvider.notifier).state = granted;
    }
  }

  Future<bool> requestPermission() async {
    final granted = await _service.requestPermission();
    state = _service.currentState;
    _ref.read(notificationPermissionProvider.notifier).state = granted;
    return granted;
  }

  Future<void> toggleAuthorized(bool value) async {
    await _service.setAuthorized(value);
    state = _service.currentState;
    _ref.read(notificationPermissionProvider.notifier).state =
        _service.isAuthorized;
    if (_service.isAuthorized) {
      await _service.showNotification(
        title: _service._i18n.t('notif.welcome_title'),
        body: _service._i18n.t('notif.welcome_body'),
        tag: 'aqa-notif-welcome',
      );
    }
  }

  Future<void> toggleNewClient(bool value) async {
    await _service.setNotifyNewClient(value);
    state = _service.currentState;
  }

  Future<void> toggleGroupMovement(bool value) async {
    await _service.setNotifyGroupMovement(value);
    state = _service.currentState;
  }

  Future<void> toggleReplacements(bool value) async {
    await _service.setNotifyReplacements(value);
    state = _service.currentState;
  }

  Future<void> toggleSessionReminder(bool value) async {
    await _service.setNotifySessionReminder(value);
    state = _service.currentState;
  }

  Future<void> dismissNotification(String id) async {
    await _service.dismissNotification(id);
    state = _service.currentState;
  }

  Future<void> markAllAsSeen(List<String> ids) async {
    await _service.markAllAsSeen(ids);
    state = _service.currentState;
  }
}

final notificationServiceProvider = Provider<NotificationService>((ref) {
  throw UnimplementedError(
      'Initialize notificationServiceProvider with SharedPreferences in main.dart');
});

final notificationSettingsProvider = StateNotifierProvider<
    NotificationSettingsNotifier, NotificationSettingsState>((ref) {
  final service = ref.watch(notificationServiceProvider);
  return NotificationSettingsNotifier(service, ref);
});

final notificationPermissionProvider = StateProvider<bool>((ref) {
  final service = ref.watch(notificationServiceProvider);
  return service.isAuthorized;
});
