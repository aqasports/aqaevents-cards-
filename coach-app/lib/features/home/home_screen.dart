import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_state.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/theme/aqa_theme.dart';
import '../groups/groups_screen.dart';
import '../replacements/replacements_screen.dart';
import '../teaching/teaching_support_view.dart';
import '../tech_review/suivi_tech_hub_screen.dart';
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
    final i18n = ref.watch(i18nProvider);

    final pendingCount = bootstrapAsync.valueOrNull?.pendingRequests.length ?? 0;

    final pages = const [
      TodaySessionsView(),
      GroupsScreen(),
      SuiviTechHubScreen(),
      ReplacementsScreen(),
      TeachingSupportView(),
      ProfileView(),
    ];

    final isHead = user?.isHeadCoach == true;
    final isAssistant = user?.isAssistant == true;
    final roleBadgeColor = isHead
        ? AqaTheme.statusWarning
        : isAssistant
            ? AqaTheme.textMuted
            : AqaTheme.accentTeal;

    final roleSubtitle = isHead
        ? i18n.t('role_banner.head_coach')
        : isAssistant
            ? i18n.t('role_banner.assistant')
            : i18n.t('role_banner.coach');

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        toolbarHeight: 68.0,
        titleSpacing: 14.0,
        title: Row(
          children: [
            Container(
              width: 40.0,
              height: 40.0,
              padding: const EdgeInsets.all(6.0),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF13203B), Color(0xFF0B1325)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12.0),
                border: Border.all(color: AqaTheme.borderTeal),
                boxShadow: [
                  BoxShadow(
                    color: AqaTheme.accentTeal.withValues(alpha: 0.15),
                    blurRadius: 12.0,
                  ),
                ],
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
            const SizedBox(width: 11.0),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          user?.name ?? 'AQA Coach',
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 15.0,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 7.0),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7.0,
                          vertical: 2.0,
                        ),
                        decoration: BoxDecoration(
                          color: roleBadgeColor.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: roleBadgeColor.withValues(alpha: 0.65),
                          ),
                        ),
                        child: Text(
                          (user?.roleDisplay ?? 'COACH').toUpperCase(),
                          style: TextStyle(
                            color: roleBadgeColor,
                            fontSize: 9.0,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2.5),
                  Text(
                    roleSubtitle,
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
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14.0),
            child: LanguageSwitcherPill(compact: true),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AqaTheme.accentTeal, size: 21.0),
            tooltip: i18n.t('common.refresh'),
            onPressed: () {
              ref.invalidate(bootstrapProvider);
            },
          ),
          const SizedBox(width: 4.0),
        ],
      ),
      body: AqaAmbientBackground(
        child: IndexedStack(
          index: _currentIndex,
          children: pages,
        ),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Color(0xF5070C18),
          border: Border(
            top: BorderSide(color: AqaTheme.borderSubtle, width: 1.0),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          items: [
            BottomNavigationBarItem(
              icon: const Icon(Icons.event_note_outlined),
              activeIcon: const Icon(Icons.event_note_rounded),
              label: i18n.t('nav.sessions'),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.groups_outlined),
              activeIcon: const Icon(Icons.groups_rounded),
              label: i18n.t('nav.groups'),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.radar_outlined),
              activeIcon: const Icon(Icons.radar_rounded),
              label: i18n.t('nav.suivi_tech'),
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
                child: const Icon(Icons.swap_horiz_rounded),
              ),
              label: i18n.t('nav.replacements'),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.menu_book_outlined),
              activeIcon: const Icon(Icons.menu_book_rounded),
              label: i18n.t('nav.support'),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.person_outline_rounded),
              activeIcon: const Icon(Icons.person_rounded),
              label: i18n.t('nav.profile'),
            ),
          ],
        ),
      ),
    );
  }
}
