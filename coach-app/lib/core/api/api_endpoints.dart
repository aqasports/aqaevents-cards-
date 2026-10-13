import 'package:shared_preferences/shared_preferences.dart';

class ApiEndpoints {
  ApiEndpoints._();

  static const String defaultBaseUrl = 'https://events.aqasports.pro';
  static const String _prefBaseUrlKey = 'aqa_custom_base_url';

  static String _currentBaseUrl = defaultBaseUrl;

  static String get baseUrl => _currentBaseUrl;

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefBaseUrlKey);
    if (saved != null && saved.trim().isNotEmpty) {
      _currentBaseUrl = saved.trim();
    }
  }

  static Future<void> setBaseUrl(String url) async {
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    _currentBaseUrl = clean.isNotEmpty ? clean : defaultBaseUrl;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefBaseUrlKey, _currentBaseUrl);
  }

  // Auth endpoints
  static String get login => '/api/coach/auth/login';
  static String get refresh => '/api/coach/auth/refresh';
  static String get logout => '/api/coach/auth/logout';

  // Core endpoints
  static String get bootstrap => '/api/coach/bootstrap';
  static String groupDetails(String id) => '/api/coach/groups/$id';
  static String sessionDetails(String id) => '/api/coach/sessions/$id';
  static String submitAttendance(String id) => '/api/coach/sessions/$id/attendance';
  static String memberProfile(String id) => '/api/coach/members/$id';
  static String submitReview(String memberId) => '/api/coach/members/$memberId/reviews';
  static String get absences => '/api/coach/absences';
  static String respondReplacement(String id) => '/api/coach/replacements/$id/respond';
  static String get syncOutbox => '/api/coach/sync';
}
