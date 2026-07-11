import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../auth/auth_provider.dart';
import '../../features/auth/login_screen.dart';
import '../../features/shell/app_shell.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/clients/clients_list_screen.dart';
import '../../features/clients/client_detail_screen.dart';
import '../../features/clients/new_client_screen.dart';
import '../../features/redeem/redeem_screen.dart';
import '../../features/activities/activities_list_screen.dart';
import '../../features/activities/activity_detail_screen.dart';
import '../../features/packages/packages_screen.dart';
import '../../features/invoices/invoices_screen.dart';
import '../../features/invoices/invoice_detail_screen.dart';
import '../../features/demands/demands_screen.dart';
import '../../features/proposals/proposals_screen.dart';
import '../../features/clubs/clubs_screen.dart';
import '../../features/clubs/club_detail_screen.dart';
import '../../features/reports/reports_screen.dart';
import '../../features/events/events_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/users/users_screen.dart';
import '../../features/products/products_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final isLoading = authState.isLoading;
      final isAuth = authState.isAuthenticated;
      final isLoginPage = state.matchedLocation == '/login';

      if (isLoading) return null;
      if (!isAuth && !isLoginPage) return '/login';
      if (isAuth && isLoginPage) return '/';
      return null;
    },
    refreshListenable: _AuthStateListenable(ref),
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const DashboardScreen()),
          GoRoute(
            path: '/clients',
            builder: (_, __) => const ClientsListScreen(),
            routes: [
              GoRoute(path: 'new', builder: (_, __) => const NewClientScreen()),
              GoRoute(
                path: ':id',
                builder: (_, state) => ClientDetailScreen(clientId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: '/redeem', builder: (_, __) => const RedeemScreen()),
          GoRoute(
            path: '/activities',
            builder: (_, __) => const ActivitiesListScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => ActivityDetailScreen(activityId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: '/packages', builder: (_, __) => const PackagesScreen()),
          GoRoute(
            path: '/invoices',
            builder: (_, __) => const InvoicesScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => InvoiceDetailScreen(invoiceId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: '/demands', builder: (_, __) => const DemandsScreen()),
          GoRoute(path: '/proposals', builder: (_, __) => const ProposalsScreen()),
          GoRoute(
            path: '/clubs',
            builder: (_, __) => const ClubsScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => ClubDetailScreen(clubId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: '/reports', builder: (_, __) => const ReportsScreen()),
          GoRoute(path: '/events', builder: (_, __) => const EventsScreen()),
          GoRoute(path: '/products', builder: (_, __) => const ProductsScreen()),
          GoRoute(path: '/users', builder: (_, __) => const UsersScreen()),
          GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
        ],
      ),
    ],
  );
});

class _AuthStateListenable extends ChangeNotifier {
  _AuthStateListenable(Ref ref) {
    ref.listen(authProvider, (_, __) => notifyListeners());
  }
}
