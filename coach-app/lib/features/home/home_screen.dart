import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_state.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/theme/aqa_theme.dart';
import '../groups/groups_screen.dart';
import '../replacements/replacements_screen.dart';
import '../teaching/teaching_support_view.dart';
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
      const TeachingSupportView(),
      const ProfileView(),
    ];

    final isHead = user?.isHeadCoach == true;
    final isAssistant = user?.isAssistant == true;
    final roleBadgeColor = isHead
        ? AqaTheme.statusWarning
        : isAssistant
            ? AqaTheme.textMuted
            : AqaTheme.accentTeal;

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        toolbarHeight: 64.0,
        title: Row(
          children: [
            Container(
              width: 38.0,
              height: 38.0,
              padding: const EdgeInsets.all(5.0),
              decoration: BoxDecoration(
                color: AqaTheme.surfaceSecondary,
                borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                border: Border.all(color: AqaTheme.borderTeal),
              ),
              child: Image.asset(
                'assets/images/aqa_mark.png',
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.pool,
                  color: AqaTheme.accentTeal,
                  size: 20.0,
                ),
              ),
            ),
            const SizedBox(width: 12.0),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          user?.name ?? 'Portail Coach AQA',
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 15.0,
                            fontWeight: FontWeight.w700,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8.0),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7.0,
                          vertical: 2.0,
                        ),
                        decoration: BoxDecoration(
                          color: roleBadgeColor.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                          border: Border.all(color: roleBadgeColor),
                        ),
                        child: Text(
                          (user?.roleDisplay ?? 'Coach').toUpperCase(),
                          style: TextStyle(
                            color: roleBadgeColor,
                            fontSize: 9.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2.0),
                  Text(
                    isHead
                        ? 'Supervision Globale • Tous Secteurs AQA Swim'
                        : isAssistant
                            ? 'Mode Assistant • Consultation Groupes Assignes'
                            : 'Suivi Presences, Evolutions & Seances AQA Swim',
                    style: const TextStyle(
                      color: AqaTheme.textMuted,
                      fontSize: 11.0,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AqaTheme.accentTeal),
            tooltip: 'Actualiser les donnees',
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
              icon: Icon(Icons.event_note_outlined),
              activeIcon: Icon(Icons.event_note),
              label: 'Seances',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.groups_outlined),
              activeIcon: Icon(Icons.groups),
              label: 'Groupes',
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
              label: 'Remplacements',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.menu_book_outlined),
              activeIcon: Icon(Icons.menu_book),
              label: 'Support AQA',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profil',
            ),
          ],
        ),
      ),
    );
  }
}
