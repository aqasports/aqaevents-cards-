import 'dart:async';
import 'dart:ui' show ImageFilter;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_state.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/models/replacement.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/services/notification_service.dart';
import '../../core/theme/aqa_theme.dart';
import '../groups/groups_screen.dart';
import '../replacements/replacements_screen.dart';
import '../tech_review/suivi_tech_hub_screen.dart';
import 'today_sessions_view.dart';
import 'profile_view.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with WidgetsBindingObserver {
  int _currentIndex = 0;
  Timer? _syncTimer;

  /// Foreground sync cadence. Notifications and roster changes arrive while
  /// the app is open; the timer is cancelled the moment the screen disposes.
  static const Duration _foregroundSyncInterval = Duration(seconds: 120);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(notificationServiceProvider)
          .ensureInitializedAndPromptIfFirstRun();
    });
    _syncTimer = Timer.periodic(_foregroundSyncInterval, (_) {
      if (!mounted) return;
      ref.read(bootstrapProvider.notifier).refreshSilently();
    });
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      // Fresh data + pending OS notifications the moment the coach returns.
      ref.read(bootstrapProvider.notifier).refreshSilently();
      ref.read(notificationServiceProvider).syncFromSystem();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final bootstrapAsync = ref.watch(bootstrapProvider);
    final i18n = ref.watch(i18nProvider);
    final notifSettings = ref.watch(notificationSettingsProvider);

    final bootstrapData = bootstrapAsync.valueOrNull;
    final pendingCount = bootstrapData?.pendingRequests.length ?? 0;

    final unreadNotifsCount = bootstrapData == null
        ? 0
        : bootstrapData.coachNotifications
            .where((n) =>
                !notifSettings.dismissedIds.contains(n['id']?.toString() ?? ''))
            .length;

    final totalBadgeCount = unreadNotifsCount +
        (bootstrapData?.pendingRequests
                .where((r) => r.isIncomingRequest)
                .length ??
            0);

    final pages = const [
      TodaySessionsView(),
      GroupsScreen(),
      SuiviTechHubScreen(),
      ReplacementsScreen(),
      ProfileView(),
    ];

    final isHead = user?.isHeadCoach == true;
    final isAssistant = user?.isAssistant == true;
    final roleBadgeColor = isHead
        ? AqaTheme.statusWarning
        : isAssistant
            ? AqaTheme.textMuted
            : AqaTheme.primarySkyHover;

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
                    constraints:
                        const BoxConstraints(maxWidth: AqaTheme.maxContentWidth),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Row(
                        children: [
                          // Coach Brand Mark
                          ClipRRect(
                            borderRadius: BorderRadius.circular(11.0),
                            child: Container(
                              width: 38.0,
                              height: 38.0,
                              decoration: BoxDecoration(
                                color: Colors.black,
                                borderRadius: BorderRadius.circular(11.0),
                                border: Border.all(
                                  color: AqaTheme.accentTeal
                                      .withValues(alpha: 0.35),
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
                                Text(
                                  user?.name ?? 'AQA Coach',
                                  style: const TextStyle(
                                    color: AqaTheme.textPrimary,
                                    fontSize: 15.0,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.2,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 3.0),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6.0,
                                    vertical: 1.5,
                                  ),
                                  decoration: BoxDecoration(
                                    color: roleBadgeColor
                                        .withValues(alpha: 0.12),
                                    borderRadius:
                                        BorderRadius.circular(5.0),
                                    border: Border.all(
                                      color: roleBadgeColor
                                          .withValues(alpha: 0.35),
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
                                        (user?.roleDisplay ?? 'COACH')
                                            .toUpperCase(),
                                        style: TextStyle(
                                          color: roleBadgeColor,
                                          fontSize: 9.0,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 0.4,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12.0),
                          // Notification Bell with Badge Dot
                          Stack(
                            clipBehavior: Clip.none,
                            children: [
                              AqaGlassIconButton(
                                icon: Icons.notifications_outlined,
                                tooltip: i18n.t('notif.center_title'),
                                iconColor: totalBadgeCount > 0
                                    ? AqaTheme.accentTeal
                                    : AqaTheme.textSecondary,
                                size: 34.0,
                                onPressed: () {
                                  if (bootstrapData != null) {
                                    _showNotificationsSheet(
                                      context,
                                      bootstrapData,
                                      notifSettings,
                                      i18n,
                                    );
                                  }
                                },
                              ),
                              if (totalBadgeCount > 0)
                                Positioned(
                                  top: 1,
                                  right: 1,
                                  child: Container(
                                    width: 8.0,
                                    height: 8.0,
                                    decoration: BoxDecoration(
                                      color: AqaTheme.accentTeal,
                                      shape: BoxShape.circle,
                                      boxShadow: [
                                        BoxShadow(
                                          color: AqaTheme.accentTeal
                                              .withValues(alpha: 0.6),
                                          blurRadius: 4.0,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(width: 8.0),
                          // Refresh Button
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

  void _showNotificationsSheet(
    BuildContext context,
    BootstrapData data,
    NotificationSettingsState notifSettings,
    AppI18n i18n,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AqaTheme.surfaceDark,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.0)),
        side: BorderSide(color: AqaTheme.borderMedium),
      ),
      builder: (ctx) {
        return Consumer(
          builder: (ctx, ref, _) {
            final currentSettings = ref.watch(notificationSettingsProvider);
            final notifs = data.coachNotifications.where((n) {
              final id = n['id']?.toString() ?? '';
              return id.isNotEmpty && !currentSettings.dismissedIds.contains(id);
            }).toList();

            final pendingReps = data.pendingRequests
                .where((r) => r.isIncomingRequest)
                .toList();
            final adminAnnouncement =
                data.appConfig['announcement']?.toString().trim() ?? '';

            return SafeArea(
              child: Container(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.82,
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16.0,
                  vertical: 14.0,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 36.0,
                        height: 4.0,
                        decoration: BoxDecoration(
                          color:
                              AqaTheme.textLightMuted.withValues(alpha: 0.4),
                          borderRadius: BorderRadius.circular(2.0),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14.0),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(
                              Icons.notifications_active_outlined,
                              color: AqaTheme.accentTeal,
                              size: 20.0,
                            ),
                            const SizedBox(width: 8.0),
                            Text(
                              i18n.t('notif.center_title'),
                              style: const TextStyle(
                                color: AqaTheme.textPrimary,
                                fontSize: 16.0,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            AqaIslandButton(
                              label: i18n.t('notif.test_short'),
                              icon: Icons.bolt_rounded,
                              compact: true,
                              secondary: true,
                              onPressed: () async {
                                await ref
                                    .read(notificationServiceProvider)
                                    .showNotification(
                                      title: 'AQA Coaches',
                                      body: i18n.t('notif.test_body'),
                                      tag:
                                          'test-${DateTime.now().millisecondsSinceEpoch}',
                                    );
                                if (ctx.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      backgroundColor: AqaTheme.statusSuccess,
                                      content: Text(
                                        i18n.t('notif.test_sent'),
                                      ),
                                    ),
                                  );
                                }
                              },
                            ),
                            if (notifs.isNotEmpty) ...[
                              const SizedBox(width: 6.0),
                              TextButton(
                                onPressed: () {
                                  final allIds = notifs
                                      .map((n) => n['id'].toString())
                                      .toList();
                                  ref
                                      .read(notificationSettingsProvider.notifier)
                                      .markAllAsSeen(allIds);
                                },
                                child: Text(
                                  i18n.t('notif.clear_all'),
                                  style: const TextStyle(
                                    color: AqaTheme.textMuted,
                                    fontSize: 11.5,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 12.0),
                    const Divider(),
                    const SizedBox(height: 10.0),
                    Expanded(
                      child: ListView(
                        children: [
                          if (adminAnnouncement.isNotEmpty) ...[
                            _buildAnnouncementCard(adminAnnouncement),
                            const SizedBox(height: 10.0),
                          ],
                          if (pendingReps.isNotEmpty) ...[
                            ...pendingReps.map((rep) =>
                                _buildReplacementItem(ctx, ref, rep, i18n)),
                            const SizedBox(height: 10.0),
                          ],
                          if (notifs.isNotEmpty) ...[
                            ...notifs.map((n) =>
                                _buildNotificationItem(ctx, ref, n, i18n)),
                          ],
                          if (adminAnnouncement.isEmpty &&
                              pendingReps.isEmpty &&
                              notifs.isEmpty)
                            Padding(
                              padding:
                                  const EdgeInsets.symmetric(vertical: 36.0),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(
                                    Icons.notifications_none_rounded,
                                    color: AqaTheme.textLightMuted,
                                    size: 40.0,
                                  ),
                                  const SizedBox(height: 10.0),
                                  Text(
                                    i18n.t('notif.empty_title'),
                                    style: const TextStyle(
                                      color: AqaTheme.textPrimary,
                                      fontSize: 14.5,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4.0),
                                  Text(
                                    i18n.t('notif.empty_sub'),
                                    style: const TextStyle(
                                      color: AqaTheme.textMuted,
                                      fontSize: 12.0,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildAnnouncementCard(String text) {
    return Container(
      padding: const EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        color: AqaTheme.primarySky.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10.0),
        border: Border.all(
          color: AqaTheme.primarySky.withValues(alpha: 0.30),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.campaign_outlined,
            color: AqaTheme.primarySkyHover,
            size: 18.0,
          ),
          const SizedBox(width: 10.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'DIRECTION AQA SWIM',
                  style: TextStyle(
                    color: AqaTheme.primarySkyHover,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 2.0),
                Text(
                  text,
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReplacementItem(
    BuildContext context,
    WidgetRef ref,
    ReplacementModel rep,
    AppI18n i18n,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8.0),
      padding: const EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        color: AqaTheme.statusWarningBg,
        borderRadius: BorderRadius.circular(10.0),
        border: Border.all(
          color: AqaTheme.statusWarning.withValues(alpha: 0.35),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.swap_horiz_rounded,
            color: AqaTheme.statusWarning,
            size: 20.0,
          ),
          const SizedBox(width: 10.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${rep.groupName} • ${rep.startTime}',
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 13.0,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2.0),
                Text(
                  '${rep.originalCoachName} sollicite un remplacement (${rep.sessionDate}).',
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationItem(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> notif,
    AppI18n i18n,
  ) {
    final id = notif['id']?.toString() ?? '';
    final eventType = notif['eventType']?.toString() ?? 'NEW_CLIENT';
    final isNewClientEvent = eventType == 'NEW_CLIENT';
    final movementKind = notif['movementKind']?.toString();
    final isMultiGroup = movementKind == 'multi_group';
    final memberName = notif['memberName']?.toString() ?? 'Nageur AQA';
    final groupName = notif['groupName']?.toString() ?? 'Groupe AQA';
    final fromGroupName = notif['fromGroupName']?.toString();

    final accentColor = isNewClientEvent
        ? AqaTheme.statusSuccess
        : (isMultiGroup ? AqaTheme.accentTeal : AqaTheme.primarySkyHover);

    final titleText = isNewClientEvent
        ? 'Nouveau Membre'
        : (isMultiGroup ? 'Affectation Multi-Groupe' : 'Mouvement de Groupe');

    final descText = isNewClientEvent
        ? '$memberName a rejoint $groupName.'
        : (isMultiGroup
            ? '$memberName a rejoint $groupName (multi-groupe).'
            : (fromGroupName != null && fromGroupName.isNotEmpty
                ? '$memberName transfere de $fromGroupName vers $groupName.'
                : '$memberName a rejoint $groupName.'));

    return Container(
      margin: const EdgeInsets.only(bottom: 8.0),
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
      decoration: BoxDecoration(
        color: AqaTheme.surfaceRecessed,
        borderRadius: BorderRadius.circular(10.0),
        border: Border.all(
          color: accentColor.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 28.0,
            height: 28.0,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(7.0),
            ),
            child: Icon(
              isNewClientEvent
                  ? Icons.person_add_rounded
                  : Icons.compare_arrows_rounded,
              color: accentColor,
              size: 15.0,
            ),
          ),
          const SizedBox(width: 10.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (isNewClientEvent) ...[
                      const AqaNewClientBadge(compact: true),
                      const SizedBox(width: 6.0),
                    ],
                    Text(
                      titleText,
                      style: TextStyle(
                        color: accentColor,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2.0),
                Text(
                  descText,
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 12.0,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close_rounded, size: 16.0),
            color: AqaTheme.textLightMuted,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 24.0, minHeight: 24.0),
            onPressed: () {
              ref
                  .read(notificationSettingsProvider.notifier)
                  .dismissNotification(id);
            },
          ),
        ],
      ),
    );
  }
}
