import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:aqa_coaches/core/auth/auth_state.dart';
import 'package:aqa_coaches/core/theme/aqa_theme.dart';
import 'package:aqa_coaches/features/auth/login_screen.dart';

class ReadyAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  ReadyAuthNotifier() : super(const AuthState(isLoading: false));

  @override
  Future<void> restoreSession() async {}

  @override
  Future<bool> login({required String email, required String password}) async => true;

  @override
  Future<void> logout() async {}
}

void main() {
  testWidgets('LoginScreen renders Dark Ocean branding and sign in elements', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authStateProvider.overrideWith((ref) => ReadyAuthNotifier()),
        ],
        child: MaterialApp(
          theme: AqaTheme.darkTheme,
          home: const LoginScreen(),
        ),
      ),
    );

    await tester.pump();

    // Verify brand header and login fields render
    expect(find.text('AQA COACHES'), findsOneWidget);
    expect(find.text('Welcome to AQA Swim'), findsOneWidget);
    expect(find.text('Sign In to Workspace'), findsOneWidget);
    expect(find.text('Store Review Accounts'), findsOneWidget);
    expect(find.byType(ElevatedButton), findsWidgets);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });
}
