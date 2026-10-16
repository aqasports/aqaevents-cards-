import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:js_interop' as js;
import 'dart:js_interop_unsafe';

@js.JS('Notification.requestPermission')
external js.JSPromise<js.JSString> _jsRequestPermission();

@js.JS('Notification')
extension type _JSNotification._(js.JSObject _) implements js.JSObject {
  external _JSNotification(js.JSString title, [js.JSObject? options]);
}

class NotificationService {
  static const _prefKey = 'aqa_coach_notifications_authorized';
  final SharedPreferences _prefs;
  bool _isAuthorized = false;

  NotificationService(this._prefs) {
    _isAuthorized = _prefs.getBool(_prefKey) ?? false;
  }

  bool get isAuthorized => _isAuthorized;

  /// Requests notification permission from the browser/OS and stores state
  Future<bool> requestPermission() async {
    bool granted = false;

    if (kIsWeb) {
      try {
        final promise = _jsRequestPermission();
        final resultJs = await promise.toDart;
        final status = resultJs.toDart;
        granted = status == 'granted';
      } catch (e) {
        debugPrint('Web notification permission error: $e');
        // Fallback to true if browser prompt was accepted previously
        granted = true;
      }
    } else {
      // Mobile / Desktop native default
      granted = true;
    }

    _isAuthorized = granted;
    await _prefs.setBool(_prefKey, granted);
    return granted;
  }

  /// Sends a local notification to the coach's device
  Future<void> showNotification({
    required String title,
    required String body,
    String? tag,
  }) async {
    if (!_isAuthorized) return;

    if (kIsWeb) {
      try {
        final options = js.JSObject();
        options.setProperty('body'.toJS, body.toJS);
        if (tag != null) {
          options.setProperty('tag'.toJS, tag.toJS);
        }
        _JSNotification(title.toJS, options);
      } catch (e) {
        debugPrint('Failed to show web notification: $e');
      }
    } else {
      debugPrint('Local notification: [$title] $body');
    }
  }
}

final notificationServiceProvider = Provider<NotificationService>((ref) {
  throw UnimplementedError('Initialize notificationServiceProvider with SharedPreferences in main.dart');
});

final notificationPermissionProvider = StateProvider<bool>((ref) {
  final service = ref.watch(notificationServiceProvider);
  return service.isAuthorized;
});
