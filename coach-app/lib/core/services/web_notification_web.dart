// Web platform implementation using dart:js_interop
// This file is only compiled on web targets.

import 'dart:js_interop' as js;
import 'dart:js_interop_unsafe';
import 'package:flutter/foundation.dart';

@js.JS('Notification.requestPermission')
external js.JSPromise<js.JSString> _jsRequestPermission();

@js.JS('Notification')
extension type _JSNotification._(js.JSObject _) implements js.JSObject {
  external _JSNotification(js.JSString title, [js.JSObject? options]);
}

Future<bool> requestWebNotificationPermission() async {
  try {
    final promise = _jsRequestPermission();
    final resultJs = await promise.toDart;
    final status = resultJs.toDart;
    return status == 'granted';
  } catch (e) {
    debugPrint('Web notification permission error: $e');
    return true;
  }
}

void showWebNotification({
  required String title,
  required String body,
  String? tag,
}) {
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
}
