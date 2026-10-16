import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_state.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/theme/aqa_theme.dart';
import '../groups/groups_screen.dart';
import '../replacements/replacements_screen.dart';
import 'today_sessions_view.dart';
import 'profile_view.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final bootstrapAsync = ref.watch(bootstrapProvider);

    final pendingCount = bootstrapAsync.valueOrNull?.pendingRequests.length ?? 0;

    final pages = [
      const TodaySessionsView(),
      const GroupsScreen(),
      const ReplacementsScreen(),
      const ProfileView(),
    ];

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6.0),
              decoration: BoxDecoration(
                color: AqaTheme.surfaceSecondary,
                borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                border: Border.all(color: AqaTheme.borderSubtle),
              ),
              child: const Icon(Icons.pool, color: AqaTheme.accentTeal, size: 18.0),
            ),
            const SizedBox(width: 10.0),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user?.name ?? 'Coach Workspace',
                    style: const TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 15.0,
                      fontWeight: FontWeight.w600,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    user != null ? '${user.roleDisplay} • AQA Swim' : 'AQA Swim',
                    style: const TextStyle(
                      color: AqaTheme.textMuted,
                      fontSize: 11.0,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AqaTheme.textMuted),
            tooltip: 'Refresh data',
            onPressed: () {
              ref.invalidate(bootstrapProvider);
            },
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: pages,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: AqaTheme.borderSubtle, width: 1.0),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          items: [
            const BottomNavigationBarItem(
              icon: Icon(Icons.today_outlined),
              activeIcon: Icon(Icons.today),
              label: 'Today',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.groups_outlined),
              activeIcon: Icon(Icons.groups),
              label: 'Groups',
            ),
            BottomNavigationBarItem(
              icon: Badge(
                isLabelVisible: pendingCount > 0,
                label: Text('$pendingCount'),
                backgroundColor: AqaTheme.statusWarning,
                textColor: Colors.black,
                child: const Icon(Icons.swap_horiz_outlined),
              ),
              activeIcon: Badge(
                isLabelVisible: pendingCount > 0,
                label: Text('$pendingCount'),
                backgroundColor: AqaTheme.statusWarning,
                textColor: Colors.black,
                child: const Icon(Icons.swap_horiz),
              ),
              label: 'Replacements',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
