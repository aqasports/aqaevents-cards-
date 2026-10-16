import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:aqa_coaches/core/auth/auth_state.dart';
import 'package:aqa_coaches/core/models/swim_session.dart';
import 'package:aqa_coaches/core/services/session_reminder_service.dart';
import 'package:aqa_coaches/core/theme/aqa_theme.dart';
import 'package:aqa_coaches/features/auth/login_screen.dart';
import 'package:aqa_coaches/features/teaching/teaching_support_view.dart';

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
  testWidgets('LoginScreen renders Dark Ocean branding and role access cards',
      (WidgetTester tester) async {
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

    expect(find.text('COACHES PRO'), findsOneWidget);
    expect(find.text('Espace Coach & Suivi Technique'), findsOneWidget);
    expect(find.text('Acceder au Portail Coach'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });

  test('SessionReminderService detects session ending within 10 minutes', () {
    final now = DateTime.now();
    final endSoon = now.add(const Duration(minutes: 7));
    final startTime = now.subtract(const Duration(minutes: 53));

    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final dateStr = '${now.year}-${twoDigits(now.month)}-${twoDigits(now.day)}';
    final startStr = '${twoDigits(startTime.hour)}:${twoDigits(startTime.minute)}';
    final endStr = '${twoDigits(endSoon.hour)}:${twoDigits(endSoon.minute)}';

    final session = SwimSessionModel(
      id: 'sess-test-1',
      groupId: 'grp-1',
      groupName: 'Kids G10',
      category: 'enfants',
      pool: 'Piscine Olympique',
      sessionDate: dateStr,
      startTime: startStr,
      endTime: endStr,
      status: 'scheduled',
      attendanceCount: 0,
      totalMembers: 10,
    );

    final reminder = SessionReminderService.findPriorityReminder([session]);
    expect(reminder, isNotNull);
    expect(reminder!.session.id, equals('sess-test-1'));
    expect(reminder.isWithinTenMinWindow, isTrue);
  });

  testWidgets('TeachingSupportView renders 10 AQA progression badges and curriculum',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AqaTheme.darkTheme,
        home: const Scaffold(
          body: TeachingSupportView(),
        ),
      ),
    );

    await tester.pump();

    expect(find.text('Referentiel Pedagogique & Badges AQA Swim'), findsOneWidget);
    expect(find.text('10 Badges Officiels de Progression AQA'), findsOneWidget);
    expect(find.text('1. Starter'), findsOneWidget);
    expect(find.text('10. Full Swimmer'), findsOneWidget);
  });
}
