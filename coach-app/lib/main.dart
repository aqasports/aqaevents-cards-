import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/api/api_endpoints.dart';
import 'core/auth/auth_state.dart';
import 'core/theme/aqa_theme.dart';
import 'features/attendance/attendance_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/groups/group_detail_screen.dart';
import 'features/home/home_screen.dart';
import 'features/replacements/request_absence_screen.dart';
import 'features/tech_review/swimmer_profile_screen.dart';
import 'features/tech_review/tech_review_form_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiEndpoints.init();

  runApp(
    const ProviderScope(
      child: AqaCoachesApp(),
    ),
  );
}

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      if (authState.isLoading) return null;

      final isLoggingIn = state.matchedLocation == '/login';

      if (!authState.isAuthenticated) {
        return isLoggingIn ? null : '/login';
      }

      if (isLoggingIn) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/groups/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return GroupDetailScreen(groupId: id);
        },
      ),
      GoRoute(
        path: '/sessions/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return AttendanceScreen(sessionId: id);
        },
      ),
      GoRoute(
        path: '/members/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return SwimmerProfileScreen(memberId: id);
        },
      ),
      GoRoute(
        path: '/members/:id/review-form',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return TechReviewFormScreen(memberId: id);
        },
      ),
      GoRoute(
        path: '/absences/new',
        builder: (context, state) => const RequestAbsenceScreen(),
      ),
    ],
  );
});

class AqaCoachesApp extends ConsumerWidget {
  const AqaCoachesApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'AQA Coaches',
      debugShowCheckedModeBanner: false,
      theme: AqaTheme.darkTheme,
      routerConfig: router,
    );
  }
}
