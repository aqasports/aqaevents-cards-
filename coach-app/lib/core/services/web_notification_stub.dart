// Native platform stub (Android, iOS, macOS, Windows, Linux)
// This file is used when compiling for native targets where dart:js_interop is unavailable.

Future<bool> requestWebNotificationPermission() async {
  return true;
}

void showWebNotification({
  required String title,
  required String body,
  String? tag,
}) {
  // No-op on native platforms
}
