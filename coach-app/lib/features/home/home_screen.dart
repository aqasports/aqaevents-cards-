import 'dart:ui' show ImageFilter;
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
            : AqaTheme.primarySkyHover;

    final roleSubtitle = isHead
        ? i18n.t('role_banner.head_coach')
        : isAssistant
            ? i18n.t('role_banner.assistant')
            : i18n.t('role_banner.coach');

    final dockItems = [
      AqaFloatingDockItem(
        icon: Icons.event_note_outlined,
        activeIcon: Icons.event_note_rounded,
        label: i18n.t('nav.sessions'),
      ),
      AqaFloatingDockItem(
        icon: Icons.groups_outlined,
        activeIcon: Icons.groups_rounded,
        label: i18n.t('nav.groups'),
      ),
      AqaFloatingDockItem(
        icon: Icons.radar_outlined,
        activeIcon: Icons.radar_rounded,
        label: i18n.t('nav.suivi_tech'),
      ),
      AqaFloatingDockItem(
        icon: Icons.swap_horiz_outlined,
        activeIcon: Icons.swap_horiz_rounded,
        label: i18n.t('nav.replacements'),
        badgeCount: pendingCount,
      ),
      AqaFloatingDockItem(
        icon: Icons.menu_book_outlined,
        activeIcon: Icons.menu_book_rounded,
        label: i18n.t('nav.support'),
      ),
      AqaFloatingDockItem(
        icon: Icons.person_outline_rounded,
        activeIcon: Icons.person_rounded,
        label: i18n.t('nav.profile'),
      ),
    ];

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      extendBody: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(64.0),
        child: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 16.0, sigmaY: 16.0),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xE0050914),
                border: Border(
                  bottom: BorderSide(
                    color: Colors.white.withValues(alpha: 0.07),
                    width: 1.0,
                  ),
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Align(
                  alignment: Alignment.center,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: AqaTheme.maxContentWidth),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Row(
                        children: [
                          // Precision Coach Brand Mark (coach_logo.png)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(11.0),
                            child: Container(
                              width: 40.0,
                              height: 40.0,
                              decoration: BoxDecoration(
                                color: Colors.black,
                                borderRadius: BorderRadius.circular(11.0),
                                border: Border.all(
                                  color: AqaTheme.accentTeal.withValues(alpha: 0.35),
                                  width: 1.0,
                                ),
                              ),
                              child: Image.asset(
                                'assets/images/coach_logo.png',
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(
                                  Icons.pool_rounded,
                                  color: AqaTheme.accentTeal,
                                  size: 18.0,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 11.0),
                          // Coach Identity & Role
                          Expanded(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        user?.name ?? 'AQA Coach',
                                        style: const TextStyle(
                                          color: AqaTheme.textPrimary,
                                          fontSize: 14.5,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: -0.2,
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
                                        color: roleBadgeColor.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(6.0),
                                        border: Border.all(
                                          color: roleBadgeColor.withValues(alpha: 0.35),
                                          width: 1.0,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Container(
                                            width: 5.0,
                                            height: 5.0,
                                            decoration: BoxDecoration(
                                              color: roleBadgeColor,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 4.5),
                                          Text(
                                            (user?.roleDisplay ?? 'COACH').toUpperCase(),
                                            style: TextStyle(
                                              color: roleBadgeColor,
                                              fontSize: 9.0,
                                              fontWeight: FontWeight.w800,
                                              letterSpacing: 0.5,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 1.5),
                                Text(
                                  roleSubtitle,
                                  style: const TextStyle(
                                    color: AqaTheme.textLightMuted,
                                    fontSize: 11.0,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          // Language Selector Pill & Glass Refresh Button
                          const LanguageSwitcherPill(compact: true),
                          const SizedBox(width: 8.0),
                          AqaGlassIconButton(
                            icon: Icons.refresh_rounded,
                            tooltip: i18n.t('common.refresh'),
                            iconColor: AqaTheme.textSecondary,
                            size: 34.0,
                            onPressed: () {
                              ref.invalidate(bootstrapProvider);
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      body: AqaAmbientBackground(
        child: IndexedStack(
          index: _currentIndex,
          children: pages,
        ),
      ),
      bottomNavigationBar: AqaFloatingDock(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: dockItems,
      ),
    );
  }
}
