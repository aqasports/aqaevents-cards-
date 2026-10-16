import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../models/coach_user.dart';

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final CoachUser? user;
  final String? errorMessage;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.user,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    CoachUser? user,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient;

  AuthNotifier(this._apiClient) : super(const AuthState(isLoading: true)) {
    _apiClient.onUnauthorized = () {
      state = const AuthState(isLoading: false, isAuthenticated: false);
    };
    restoreSession();
  }

  Future<void> restoreSession() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final token = await _apiClient.storage.read(key: ApiClient.keyAccessToken);
      final coachJsonStr = await _apiClient.storage.read(key: ApiClient.keyCoachData);

      if (token != null && token.isNotEmpty && coachJsonStr != null) {
        final Map<String, dynamic> coachMap = jsonDecode(coachJsonStr);
        final user = CoachUser.fromJson(coachMap);
        state = AuthState(
          isLoading: false,
          isAuthenticated: true,
          user: user,
        );
      } else {
        state = const AuthState(isLoading: false, isAuthenticated: false);
      }
    } catch (_) {
      state = const AuthState(isLoading: false, isAuthenticated: false);
    }
  }

  Future<bool> login({required String email, required String password}) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _apiClient.dio.post(
        ApiEndpoints.login,
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final token = data['token'] as String;
        final refreshToken = data['refreshToken'] as String;
        final coachMap = data['coach'] as Map<String, dynamic>;

        final user = CoachUser.fromJson(coachMap);

        await _apiClient.saveTokens(
          accessToken: token,
          refreshToken: refreshToken,
          coachJson: jsonEncode(coachMap),
        );

        state = AuthState(
          isLoading: false,
          isAuthenticated: true,
          user: user,
        );
        return true;
      } else {
        final msg = response.data?['error']?.toString() ?? 'Invalid credentials';
        state = state.copyWith(isLoading: false, errorMessage: msg);
        return false;
      }
    } on DioException catch (dioErr) {
      String msg = 'Connection error. Please verify server URL and network.';
      if (dioErr.response?.data != null && dioErr.response?.data is Map) {
        msg = dioErr.response?.data['error']?.toString() ?? msg;
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _apiClient.storage.read(key: ApiClient.keyRefreshToken);
      if (refreshToken != null) {
        await _apiClient.dio.post(
          ApiEndpoints.logout,
          data: {'refreshToken': refreshToken},
        );
      }
    } catch (_) {
      // Ignore network errors on logout
    } finally {
      await _apiClient.clearTokens();
      state = const AuthState(isLoading: false, isAuthenticated: false);
    }
  }
}


final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AuthNotifier(apiClient);
});

