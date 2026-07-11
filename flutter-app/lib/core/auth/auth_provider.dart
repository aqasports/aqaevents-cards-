import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api/api_client.dart';
import '../api/endpoints.dart';

// ---------------------------------------------------------------------------
// Auth state
// ---------------------------------------------------------------------------
class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;
  final String? userName;
  final String? userEmail;
  final String? userRole;

  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
    this.userName,
    this.userEmail,
    this.userRole,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
    String? userName,
    String? userEmail,
    String? userRole,
  }) =>
      AuthState(
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        userName: userName ?? this.userName,
        userEmail: userEmail ?? this.userEmail,
        userRole: userRole ?? this.userRole,
      );

  bool get isSuperAdmin => userRole == 'super_admin';
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(apiClientProvider));
});

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  AuthNotifier(this._api) : super(const AuthState()) {
    _checkSession();
  }

  // Check if there is an existing valid session
  Future<void> _checkSession() async {
    state = state.copyWith(isLoading: true);
    try {
      await _api.initialize();
      final res = await _api.get(ApiConfig.session);
      final data = res.data as Map<String, dynamic>?;
      if (data != null && data['user'] != null) {
        final user = data['user'] as Map<String, dynamic>;
        state = AuthState(
          isAuthenticated: true,
          isLoading: false,
          userName: user['name'] as String?,
          userEmail: user['email'] as String?,
          userRole: user['role'] as String?,
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (_) {
      state = state.copyWith(isLoading: false);
    }
  }

  // Sign in with email/password using NextAuth credentials provider
  Future<bool> signIn(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _api.initialize();

      // Step 1: get CSRF token
      final csrfRes = await _api.get('/api/auth/csrf');
      final csrfToken = (csrfRes.data as Map<String, dynamic>)['csrfToken'] as String;

      // Step 2: POST credentials
      final loginRes = await _api.dio.post(
        ApiConfig.signIn,
        data: 'csrfToken=$csrfToken&email=${Uri.encodeComponent(email)}&password=${Uri.encodeComponent(password)}&redirect=false&json=true',
        options: Options(
          contentType: 'application/x-www-form-urlencoded',
          followRedirects: false,
          validateStatus: (s) => s != null && s < 500,
        ),
      );

      // Check session after login
      final sessionRes = await _api.get(ApiConfig.session);
      final data = sessionRes.data as Map<String, dynamic>?;
      if (data != null && data['user'] != null) {
        final user = data['user'] as Map<String, dynamic>;
        state = AuthState(
          isAuthenticated: true,
          isLoading: false,
          userName: user['name'] as String?,
          userEmail: user['email'] as String?,
          userRole: user['role'] as String?,
        );
        return true;
      }
      state = state.copyWith(isLoading: false, error: 'Invalid credentials');
      return false;
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.response?.data?['message'] as String? ?? 'Network error. Please check your connection.',
      );
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'An unexpected error occurred.');
      return false;
    }
  }

  Future<void> signOut() async {
    state = state.copyWith(isLoading: true);
    try {
      await _api.post(ApiConfig.signOut);
      await _api.clearCookies();
    } catch (_) {}
    state = const AuthState();
  }
}
