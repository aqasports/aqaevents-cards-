import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/models/replacement.dart';
import '../../core/models/swim_session.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/services/notification_service.dart';
import '../../core/services/session_reminder_service.dart';
import '../../core/theme/aqa_theme.dart';
import '../attendance/quick_session_logger_sheet.dart';

class TodaySessionsView extends ConsumerStatefulWidget {
  const TodaySessionsView({super.key});

  @override
  ConsumerState<TodaySessionsView> createState() => _TodaySessionsViewState();
}

class _TodaySessionsViewState extends ConsumerState<TodaySessionsView> {
  String _selectedDateFilter = 'ALL_WEEK';

  @override
  Widget build(BuildContext context) {
    final bootstrapAsync = ref.watch(bootstrapProvider);
    final dismissedSet = ref.watch(dismissedRemindersProvider);
    final notifSettings = ref.watch(notificationSettingsProvider);
    final i18n = ref.watch(i18nProvider);

    return RefreshIndicator(
      color: AqaTheme.accentTeal,
      backgroundColor: AqaTheme.surfaceDark,
      onRefresh: () async {
        ref.invalidate(bootstrapProvider);
      },
      child: bootstrapAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AqaTheme.accentTeal),
        ),
        error: (err, stack) => SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24.0),
          child: AqaDoubleBezelCard(
            margin: const EdgeInsets.only(top: 40.0),
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.cloud_off_outlined,
                  color: AqaTheme.statusWarning,
                  size: 42.0,
                ),
                const SizedBox(height: 14.0),
                Text(
                  i18n.t('common.error'),
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 16.0,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8.0),
                Text(
                  err.toString().toLowerCase().contains('timeout')
                      ? i18n.t('common.timeout_error')
                      : err.toString().toLowerCase().contains('connection') ||
                              err.toString().toLowerCase().contains('network')
                          ? i18n.t('common.network_error')
                          : err.toString(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.5),
                ),
                const SizedBox(height: 18.0),
                AqaIslandButton(
                  label: i18n.t('common.retry'),
                  icon: Icons.refresh_rounded,
                  compact: true,
                  onPressed: () => ref.invalidate(bootstrapProvider),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          final allSessions = data.allSessions.isNotEmpty
              ? data.allSessions
              : data.todaySessions;
          final todayStr = data.todayDate.isNotEmpty
              ? data.todayDate
              : DateTime.now().toIso8601String().substring(0, 10);

          final uniqueDates = <String>{};
          for (final s in allSessions) {
            if (s.sessionDate.isNotEmpty) {
              uniqueDates.add(s.sessionDate);
            }
          }
          final sortedDates = uniqueDates.toList()..sort();

          final filteredSessions = allSessions.where((s) {
            if (_selectedDateFilter == 'ALL_WEEK') return true;
            if (_selectedDateFilter == 'TODAY') return s.sessionDate == todayStr;
            return s.sessionDate == _selectedDateFilter;
          }).toList();

          final reminderCandidate = SessionReminderService.findPriorityReminder(
            allSessions,
            dismissedSessionIds: dismissedSet,
          );

          final totalSwimmers = data.groups.fold<int>(
            0,
            (acc, g) => acc + g.activeMembersCount,
          );
          final adminAnnouncement =
              data.appConfig['announcement']?.toString().trim() ?? '';

          return ListView(
            padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 104.0),
            children: [
              // 0. Live Admin Broadcast Banner from AQA Swim Command Center
              if (adminAnnouncement.isNotEmpty) ...[
                AqaDoubleBezelCard(
                  accentColor: AqaTheme.primarySky,
                  padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                  child: Row(
                    children: [
                      Container(
                        width: 34.0,
                        height: 34.0,
                        decoration: BoxDecoration(
                          color: AqaTheme.primarySky.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(9.0),
                          border: Border.all(
                            color: AqaTheme.primarySky.withValues(alpha: 0.30),
                          ),
                        ),
                        child: const Icon(
                          Icons.campaign_outlined,
                          color: AqaTheme.primarySkyHover,
                          size: 18.0,
                        ),
                      ),
                      const SizedBox(width: 12.0),
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
                                letterSpacing: 0.9,
                              ),
                            ),
                            const SizedBox(height: 2.0),
                            Text(
                              adminAnnouncement,
                              style: const TextStyle(
                                color: AqaTheme.textPrimary,
                                fontSize: 12.5,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12.0),
              ],

              // 0b. Notification Authorization Prompt
              _buildNotificationPermissionPrompt(context, i18n),

              // 0c. New Client (NEW) & Group Movement / Multi-Group Notifications
              ...data.coachNotifications.where((notif) {
                final id = notif['id']?.toString() ?? '';
                if (id.isEmpty || notifSettings.dismissedIds.contains(id)) {
                  return false;
                }
                final eventType = notif['eventType']?.toString() ?? 'NEW_CLIENT';
                if (eventType == 'NEW_CLIENT') {
                  final stillNew = notif['isNewClientLabelActive'] as bool? ?? false;
                  return notifSettings.notifyNewClient && stillNew;
                }
                if (eventType == 'MOVEMENT') {
                  return notifSettings.notifyGroupMovement;
                }
                return false;
              }).take(5).map(
                    (notif) => Padding(
                      padding: const EdgeInsets.only(bottom: 10.0),
                      child: _buildCoachSwimmerNotificationCard(
                        context,
                        notif,
                        i18n,
                      ),
                    ),
                  ),

              // 1. 10-MINUTE PRE-END SESSION REMINDER & QUICK LOGGER BANNER
              if (reminderCandidate != null &&
                  !data.coach.isAssistant &&
                  notifSettings.notifySessionReminder) ...[
                _buildTenMinReminderBanner(context, reminderCandidate, i18n),
                const SizedBox(height: 14.0),
              ],

              // 2. Incoming Replacement Requests Cards (Accept / Refuse direct actions)
              if (notifSettings.notifyReplacements)
                ...data.pendingRequests.where((r) => r.isIncomingRequest).map(
                      (rep) => Padding(
                        padding: const EdgeInsets.only(bottom: 12.0),
                        child: _buildIncomingCoverageCard(context, rep, i18n),
                      ),
                    ),

              // 2b. Outgoing or Non-Incoming Pending Requests Notice
              if (data.pendingRequests.any((r) => !r.isIncomingRequest)) ...[
                AqaDoubleBezelCard(
                  padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                  child: Row(
                    children: [
                      Container(
                        width: 34.0,
                        height: 34.0,
                        decoration: BoxDecoration(
                          color: AqaTheme.statusWarningBg,
                          borderRadius: BorderRadius.circular(9.0),
                        ),
                        child: const Icon(
                          Icons.schedule_send_outlined,
                          color: AqaTheme.statusWarning,
                          size: 18.0,
                        ),
                      ),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              i18n.t(
                                'sessions.pending_replacements_alert',
                                {
                                  'count': data.pendingRequests
                                      .where((r) => !r.isIncomingRequest)
                                      .length
                                },
                              ),
                              style: const TextStyle(
                                color: AqaTheme.textPrimary,
                                fontSize: 13.0,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 2.0),
                            Text(
                              i18n.t('sessions.pending_replacements_sub'),
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
                ),
                const SizedBox(height: 14.0),
              ],

              // 3. Executive KPI Bento Strip
              Row(
                children: [
                  Expanded(
                    child: _buildKpiCard(
                      label: i18n.t('sessions.kpi_groups'),
                      value: '${data.groups.length}',
                      icon: Icons.groups_rounded,
                      color: AqaTheme.primarySkyHover,
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  Expanded(
                    child: _buildKpiCard(
                      label: i18n.t('sessions.kpi_sessions_week'),
                      value: '${allSessions.length}',
                      icon: Icons.calendar_today_rounded,
                      color: AqaTheme.accentTeal,
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  Expanded(
                    child: _buildKpiCard(
                      label: i18n.t('sessions.kpi_swimmers'),
                      value: '$totalSwimmers',
                      icon: Icons.pool_rounded,
                      color: AqaTheme.statusSuccess,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16.0),

              // 4. Date Selector Strip (7-Day Interactive Filter)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: [
                    _buildDateFilterChip(
                      keyId: 'ALL_WEEK',
                      label:
                          '${i18n.t('sessions.filter_all_week')} (${allSessions.length})',
                    ),
                    const SizedBox(width: 8.0),
                    _buildDateFilterChip(
                      keyId: 'TODAY',
                      label: '${i18n.t('sessions.filter_today')} ($todayStr)',
                    ),
                    const SizedBox(width: 8.0),
                    ...sortedDates.where((d) => d != todayStr).map(
                          (d) => Padding(
                            padding: const EdgeInsets.only(right: 8.0),
                            child: _buildDateFilterChip(
                              keyId: d,
                              label: _formatDayShort(d, i18n),
                            ),
                          ),
                        ),
                  ],
                ),
              ),
              const SizedBox(height: 16.0),

              // 5. Sessions List
              if (filteredSessions.isEmpty)
                AqaDoubleBezelCard(
                  padding: const EdgeInsets.symmetric(
                    vertical: 42.0,
                    horizontal: 20.0,
                  ),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.event_available_rounded,
                        color: AqaTheme.textLightMuted,
                        size: 38.0,
                      ),
                      const SizedBox(height: 12.0),
                      Text(
                        i18n.t('sessions.no_sessions_title'),
                        style: const TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 15.0,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6.0),
                      Text(
                        i18n.t('sessions.no_sessions_sub'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AqaTheme.textMuted,
                          fontSize: 12.5,
                        ),
                      ),
                      if (_selectedDateFilter != 'ALL_WEEK') ...[
                        const SizedBox(height: 16.0),
                        AqaIslandButton(
                          label: i18n.t('sessions.show_all_week'),
                          icon: Icons.date_range_rounded,
                          compact: true,
                          secondary: true,
                          onPressed: () =>
                              setState(() => _selectedDateFilter = 'ALL_WEEK'),
                        ),
                      ],
                    ],
                  ),
                )
              else
                ...filteredSessions.map(
                  (session) => _buildSessionCard(
                    context,
                    session,
                    i18n: i18n,
                    todayStr: todayStr,
                    isAssistant: data.coach.isAssistant,
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _respondToReplacement(
    String replacementId,
    bool accept,
    AppI18n i18n,
  ) async {
    final client = ref.read(apiClientProvider);
    try {
      final response = await client.dio.post(
        ApiEndpoints.respondReplacement(replacementId),
        data: {'accept': accept},
      );
      if (!mounted) return;
      if (response.statusCode == 200) {
        ref.invalidate(bootstrapProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor:
                accept ? AqaTheme.statusSuccess : AqaTheme.statusWarning,
            content: Text(
              accept
                  ? i18n.t('replacements.accept_confirm')
                  : i18n.t('replacements.decline_confirm'),
            ),
          ),
        );
        if (accept) {
          final notifService = ref.read(notificationServiceProvider);
          notifService.showNotification(
            title: i18n.t('replacements.urgent_incoming_title'),
            body: i18n.t('replacements.accept_confirm'),
          );
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AqaTheme.statusDanger,
          content: Text('${i18n.t('common.error')}: $e'),
        ),
      );
    }
  }

  Widget _buildNotificationPermissionPrompt(BuildContext context, AppI18n i18n) {
    final notifAuthorized = ref.watch(notificationPermissionProvider);
    if (notifAuthorized) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 12.0),
      child: AqaDoubleBezelCard(
        padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
        child: Row(
          children: [
            Container(
              width: 34.0,
              height: 34.0,
              decoration: BoxDecoration(
                color: AqaTheme.accentTeal.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(9.0),
                border: Border.all(
                  color: AqaTheme.accentTeal.withValues(alpha: 0.28),
                ),
              ),
              child: const Icon(
                Icons.notifications_active_outlined,
                color: AqaTheme.accentTeal,
                size: 18.0,
              ),
            ),
            const SizedBox(width: 12.0),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    i18n.t('notifications.permission_title'),
                    style: const TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 1.5),
                  Text(
                    i18n.t('notifications.permission_desc'),
                    style: const TextStyle(
                      color: AqaTheme.textMuted,
                      fontSize: 11.0,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10.0),
            AqaIslandButton(
              label: i18n.t('notifications.enable_btn'),
              icon: Icons.check_rounded,
              compact: true,
              onPressed: () async {
                final granted = await ref
                    .read(notificationServiceProvider)
                    .requestPermission();
                ref.read(notificationPermissionProvider.notifier).state =
                    granted;
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      backgroundColor: granted
                          ? AqaTheme.statusSuccess
                          : AqaTheme.statusWarning,
                      content: Text(
                        granted
                            ? i18n.t('notifications.enabled_badge')
                            : i18n.t('notifications.denied_msg'),
                      ),
                    ),
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIncomingCoverageCard(
    BuildContext context,
    ReplacementModel rep,
    AppI18n i18n,
  ) {
    final dateStr = rep.sessionDate.length >= 10
        ? rep.sessionDate.substring(0, 10)
        : rep.sessionDate;

    return AqaDoubleBezelCard(
      glowing: true,
      accentColor: AqaTheme.statusWarning,
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  i18n.t('replacements.urgent_incoming_title'),
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 14.0,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8.0,
                  vertical: 3.0,
                ),
                decoration: BoxDecoration(
                  color: AqaTheme.statusWarningBg,
                  borderRadius: BorderRadius.circular(6.0),
                  border: Border.all(
                    color: AqaTheme.statusWarning.withValues(alpha: 0.45),
                  ),
                ),
                child: const Text(
                  'ACTION REQUISE',
                  style: TextStyle(
                    color: AqaTheme.statusWarning,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8.0),
          Text(
            i18n.t('replacements.urgent_incoming_desc', {
              'coach': rep.originalCoachName,
              'group': rep.groupName,
              'date': dateStr,
              'time': '${rep.startTime} - ${rep.endTime}',
            }),
            style: const TextStyle(
              color: AqaTheme.textSecondary,
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4.0),
          Text(
            '${rep.groupName} (${rep.category.toUpperCase()}) • ${rep.pool}',
            style: const TextStyle(
              color: AqaTheme.accentTeal,
              fontSize: 12.0,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (rep.reason != null && rep.reason!.isNotEmpty) ...[
            const SizedBox(height: 4.0),
            Text(
              'Motif: ${rep.reason}',
              style: const TextStyle(
                color: AqaTheme.textMuted,
                fontSize: 11.5,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
          const SizedBox(height: 14.0),
          Row(
            children: [
              Expanded(
                child: AqaIslandButton(
                  label: 'Refuser',
                  icon: Icons.close_rounded,
                  compact: true,
                  secondary: true,
                  onPressed: () => _respondToReplacement(rep.id, false, i18n),
                ),
              ),
              const SizedBox(width: 10.0),
              Expanded(
                child: AqaIslandButton(
                  label: 'Accepter',
                  icon: Icons.check_rounded,
                  compact: true,
                  color: AqaTheme.statusSuccess,
                  textColor: Colors.white,
                  onPressed: () => _respondToReplacement(rep.id, true, i18n),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTenMinReminderBanner(
    BuildContext context,
    SessionReminderCandidate candidate,
    AppI18n i18n,
  ) {
    final s = candidate.session;
    final isUrgent = candidate.isWithinTenMinWindow;
    final accent = isUrgent ? AqaTheme.statusWarning : AqaTheme.primarySkyHover;

    return AqaDoubleBezelCard(
      glowing: true,
      accentColor: accent,
      padding: const EdgeInsets.all(15.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36.0,
                height: 36.0,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(10.0),
                  border: Border.all(color: accent.withValues(alpha: 0.30)),
                ),
                child: Icon(
                  Icons.alarm_on_rounded,
                  color: accent,
                  size: 18.0,
                ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      i18n.t('sessions.reminder_10min_badge'),
                      style: TextStyle(
                        color: accent,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 2.0),
                    Text(
                      '${s.groupName} • ${s.startTime} - ${s.endTime} (${s.pool})',
                      style: const TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 14.0,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              AqaGlassIconButton(
                icon: Icons.close_rounded,
                size: 30.0,
                onPressed: () {
                  ref.read(dismissedRemindersProvider.notifier).dismiss(s.id);
                },
              ),
            ],
          ),
          const SizedBox(height: 8.0),
          Text(
            i18n.t('sessions.reminder_10min_desc', {'group': s.groupName}),
            style: const TextStyle(
              color: AqaTheme.textMuted,
              fontSize: 12.0,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12.0),
          SizedBox(
            width: double.infinity,
            child: AqaIslandButton(
              label: i18n.t('sessions.open_quick_logger'),
              icon: Icons.bolt_rounded,
              compact: true,
              color: accent,
              onPressed: () {
                QuickSessionLoggerSheet.show(context, s);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return AqaDoubleBezelCard(
      outerRadius: 14.0,
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 12.0),
      child: Row(
        children: [
          Container(
            width: 34.0,
            height: 34.0,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(9.0),
              border: Border.all(color: color.withValues(alpha: 0.25)),
            ),
            child: Icon(icon, color: color, size: 17.0),
          ),
          const SizedBox(width: 10.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 17.0,
                    fontWeight: FontWeight.w800,
                    fontFeatures: AqaTheme.tabularNums,
                    letterSpacing: -0.4,
                  ),
                ),
                const SizedBox(height: 1.0),
                Text(
                  label,
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateFilterChip({
    required String keyId,
    required String label,
  }) {
    final isSelected = _selectedDateFilter == keyId;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => setState(() => _selectedDateFilter = keyId),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 13.0, vertical: 8.0),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF13223D) : AqaTheme.surfaceRecessed,
          borderRadius: BorderRadius.circular(10.0),
          border: Border.all(
            color: isSelected
                ? AqaTheme.primarySkyHover.withValues(alpha: 0.55)
                : AqaTheme.borderSubtle,
            width: 1.0,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isSelected) ...[
              Container(
                width: 6.0,
                height: 6.0,
                decoration: const BoxDecoration(
                  color: AqaTheme.accentTeal,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6.5),
            ],
            Text(
              label,
              style: TextStyle(
                color: isSelected ? AqaTheme.textPrimary : AqaTheme.textMuted,
                fontSize: 12.0,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                fontFeatures: AqaTheme.tabularNums,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDayShort(String isoDate, AppI18n i18n) {
    if (isoDate.length < 10) return isoDate;
    final dt = DateTime.tryParse(isoDate.substring(0, 10));
    if (dt == null) return isoDate;
    const daysFr = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const daysEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysAr = [
      'الإثنين',
      'الثلاثاء',
      'الأربعاء',
      'الخميس',
      'الجمعة',
      'السبت',
      'الأحد'
    ];
    final idx = (dt.weekday - 1) % 7;
    final dName = i18n.locale == 'ar'
        ? daysAr[idx]
        : (i18n.locale == 'en' ? daysEn[idx] : daysFr[idx]);
    final dayNum = dt.day.toString().padLeft(2, '0');
    final monthNum = dt.month.toString().padLeft(2, '0');
    return '$dName $dayNum/$monthNum';
  }

  Widget _buildSessionCard(
    BuildContext context,
    SwimSessionModel session, {
    required AppI18n i18n,
    required String todayStr,
    required bool isAssistant,
  }) {
    final isDone = session.isCompleted;
    final isToday = session.sessionDate == todayStr;
    final rating = session.sessionRating;

    return AqaDoubleBezelCard(
      margin: const EdgeInsets.only(bottom: 12.0),
      glowing: isToday,
      accentColor: isDone ? AqaTheme.statusSuccess : AqaTheme.primarySkyHover,
      onTap: () {
        context.push('/sessions/${session.id}');
      },
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Date Pill + Tabular Time + Rating + Status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8.0,
                      vertical: 3.5,
                    ),
                    decoration: BoxDecoration(
                      color: isToday
                          ? AqaTheme.primarySky.withValues(alpha: 0.16)
                          : AqaTheme.surfaceRecessed,
                      borderRadius: BorderRadius.circular(6.0),
                      border: Border.all(
                        color: isToday
                            ? AqaTheme.primarySkyHover.withValues(alpha: 0.35)
                            : AqaTheme.borderSubtle,
                      ),
                    ),
                    child: Text(
                      isToday
                          ? i18n.t('sessions.today_badge')
                          : _formatDayShort(session.sessionDate, i18n),
                      style: TextStyle(
                        color: isToday
                            ? AqaTheme.primarySkyHover
                            : AqaTheme.textMuted,
                        fontSize: 10.0,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  const Icon(
                    Icons.schedule_rounded,
                    color: AqaTheme.textLightMuted,
                    size: 14.5,
                  ),
                  const SizedBox(width: 4.5),
                  Text(
                    '${session.startTime} - ${session.endTime}',
                    style: const TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 13.0,
                      fontWeight: FontWeight.w700,
                      fontFeatures: AqaTheme.tabularNums,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  if (rating != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7.0,
                        vertical: 3.0,
                      ),
                      margin: const EdgeInsets.only(right: 6.0),
                      decoration: BoxDecoration(
                        color: AqaTheme.statusWarningBg,
                        borderRadius: BorderRadius.circular(6.0),
                        border: Border.all(
                          color: AqaTheme.statusWarning.withValues(alpha: 0.40),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.star_rounded,
                            color: AqaTheme.statusWarning,
                            size: 12.5,
                          ),
                          const SizedBox(width: 3.0),
                          Text(
                            '${rating.rating}/5',
                            style: const TextStyle(
                              color: AqaTheme.statusWarning,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              fontFeatures: AqaTheme.tabularNums,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8.0,
                      vertical: 3.0,
                    ),
                    decoration: BoxDecoration(
                      color: isDone
                          ? AqaTheme.statusSuccessBg
                          : AqaTheme.surfaceRecessed,
                      borderRadius: BorderRadius.circular(6.0),
                      border: Border.all(
                        color: isDone
                            ? AqaTheme.statusSuccess.withValues(alpha: 0.40)
                            : AqaTheme.borderSubtle,
                      ),
                    ),
                    child: Text(
                      isDone
                          ? i18n.t('sessions.status_closed')
                          : i18n.t('sessions.status_scheduled'),
                      style: TextStyle(
                        color: isDone
                            ? AqaTheme.statusSuccess
                            : AqaTheme.textMuted,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12.0),

          // Group Title & Pool Metadata
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      session.groupName,
                      style: const TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 16.0,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 5.0),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8.0,
                      runSpacing: 4.0,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6.5,
                            vertical: 2.0,
                          ),
                          decoration: BoxDecoration(
                            color: AqaTheme.primarySky.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(5.0),
                          ),
                          child: Text(
                            session.category.toUpperCase(),
                            style: const TextStyle(
                              color: AqaTheme.primarySkyHover,
                              fontSize: 10.0,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.4,
                            ),
                          ),
                        ),
                        if (session.level.isNotEmpty)
                          Text(
                            session.level,
                            style: const TextStyle(
                              color: AqaTheme.textMuted,
                              fontSize: 11.5,
                            ),
                          ),
                        if (session.pool.isNotEmpty)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.location_on_outlined,
                                color: AqaTheme.textLightMuted,
                                size: 13.0,
                              ),
                              const SizedBox(width: 3.0),
                              Text(
                                session.pool,
                                style: const TextStyle(
                                  color: AqaTheme.textSecondary,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          if (!session.isEvaluationUnlocked ||
              session.isViewOnly ||
              session.isReplacement) ...[
            const SizedBox(height: 10.0),
            Wrap(
              spacing: 6.0,
              runSpacing: 4.0,
              children: [
                if (!session.isEvaluationUnlocked)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8.0,
                      vertical: 3.5,
                    ),
                    decoration: BoxDecoration(
                      color: AqaTheme.statusWarningBg,
                      borderRadius: BorderRadius.circular(6.0),
                      border: Border.all(
                        color: AqaTheme.statusWarning.withValues(alpha: 0.35),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.lock_clock_outlined,
                          color: AqaTheme.statusWarning,
                          size: 12.0,
                        ),
                        const SizedBox(width: 4.5),
                        Text(
                          i18n.t('sessions.eval_locked_badge', {
                            'time': session.unlockTimeFormatted,
                          }),
                          style: const TextStyle(
                            color: AqaTheme.statusWarning,
                            fontSize: 10.0,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                if (session.isViewOnly)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8.0,
                      vertical: 3.5,
                    ),
                    decoration: BoxDecoration(
                      color: AqaTheme.statusWarningBg,
                      borderRadius: BorderRadius.circular(6.0),
                      border: Border.all(
                        color: AqaTheme.statusWarning.withValues(alpha: 0.35),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.visibility_outlined,
                          color: AqaTheme.statusWarning,
                          size: 12.0,
                        ),
                        const SizedBox(width: 4.5),
                        Text(
                          i18n.t('sessions.covered_by_other', {
                            'coach': 'un autre coach',
                          }),
                          style: const TextStyle(
                            color: AqaTheme.statusWarning,
                            fontSize: 10.0,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                if (session.isReplacement && !session.isViewOnly)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8.0,
                      vertical: 3.5,
                    ),
                    decoration: BoxDecoration(
                      color: AqaTheme.accentTeal.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6.0),
                      border: Border.all(
                        color: AqaTheme.accentTeal.withValues(alpha: 0.35),
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.swap_horiz_rounded,
                          color: AqaTheme.accentTeal,
                          size: 12.0,
                        ),
                        SizedBox(width: 4.5),
                        Text(
                          'Remplacement',
                          style: TextStyle(
                            color: AqaTheme.accentTeal,
                            fontSize: 10.0,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ],

          if (rating?.focus != null && rating!.focus!.isNotEmpty) ...[
            const SizedBox(height: 8.0),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 10.0,
                vertical: 5.0,
              ),
              decoration: BoxDecoration(
                color: AqaTheme.surfaceRecessed,
                borderRadius: BorderRadius.circular(6.0),
                border: Border.all(color: AqaTheme.borderSubtle),
              ),
              child: Text(
                '${i18n.t('sessions.focus_label')} ${rating.focus}',
                style: const TextStyle(
                  color: AqaTheme.textMuted,
                  fontSize: 11.0,
                ),
              ),
            ),
          ],

          const SizedBox(height: 14.0),
          const Divider(),
          const SizedBox(height: 12.0),

          // Footer Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 24.0,
                    height: 24.0,
                    decoration: BoxDecoration(
                      color: AqaTheme.statusSuccessBg,
                      borderRadius: BorderRadius.circular(6.0),
                    ),
                    child: const Icon(
                      Icons.how_to_reg_rounded,
                      color: AqaTheme.statusSuccess,
                      size: 14.0,
                    ),
                  ),
                  const SizedBox(width: 8.0),
                  Text(
                    i18n.t('sessions.present_count', {
                      'present': session.attendanceCount,
                      'total': session.totalMembers > 0
                          ? session.totalMembers
                          : session.attendanceCount,
                    }),
                    style: const TextStyle(
                      color: AqaTheme.textSecondary,
                      fontSize: 12.0,
                      fontWeight: FontWeight.w600,
                      fontFeatures: AqaTheme.tabularNums,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  if (!isAssistant && session.canEdit && !session.isViewOnly) ...[
                    AqaIslandButton(
                      label: session.isEvaluationUnlocked
                          ? i18n.t('sessions.log_3_steps')
                          : i18n.t('sessions.eval_locked_badge', {
                              'time': session.unlockTimeFormatted,
                            }),
                      icon: session.isEvaluationUnlocked
                          ? Icons.bolt_rounded
                          : Icons.lock_clock_outlined,
                      compact: true,
                      secondary: true,
                      onPressed: () {
                        if (!session.isEvaluationUnlocked) {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              backgroundColor: AqaTheme.surfaceDark,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16.0),
                                side: const BorderSide(
                                  color: AqaTheme.borderMedium,
                                ),
                              ),
                              title: Row(
                                children: [
                                  const Icon(
                                    Icons.lock_clock_outlined,
                                    color: AqaTheme.statusWarning,
                                  ),
                                  const SizedBox(width: 8.0),
                                  Expanded(
                                    child: Text(
                                      i18n.t('sessions.eval_locked_dialog_title'),
                                      style: const TextStyle(
                                        color: AqaTheme.textPrimary,
                                        fontSize: 15.5,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              content: Text(
                                i18n.t('sessions.eval_locked_dialog_desc', {
                                  'time': session.unlockTimeFormatted,
                                }),
                                style: const TextStyle(
                                  color: AqaTheme.textMuted,
                                  fontSize: 13.0,
                                ),
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.of(ctx).pop(),
                                  child: Text(i18n.t('common.close')),
                                ),
                              ],
                            ),
                          );
                          return;
                        }
                        QuickSessionLoggerSheet.show(context, session);
                      },
                    ),
                    const SizedBox(width: 8.0),
                  ],
                  AqaIslandButton(
                    label: session.canEdit && !isAssistant && !session.isViewOnly
                        ? i18n.t('sessions.btn_attendance')
                    : i18n.t('sessions.btn_view'),
                    icon: session.canEdit && !isAssistant && !session.isViewOnly
                        ? Icons.checklist_rounded
                        : Icons.visibility_outlined,
                    compact: true,
                    onPressed: () {
                      context.push('/sessions/${session.id}');
                    },
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCoachSwimmerNotificationCard(
    BuildContext context,
    Map<String, dynamic> notif,
    AppI18n i18n,
  ) {
    final id = notif['id']?.toString() ?? '';
    final eventType = notif['eventType']?.toString() ?? 'NEW_CLIENT';
    final isNewClientEvent = eventType == 'NEW_CLIENT';
    final movementKind = notif['movementKind']?.toString();
    final isMultiGroup = movementKind == 'multi_group';
    final memberId = notif['memberId']?.toString() ?? '';
    final memberName = notif['memberName']?.toString() ?? 'Nageur AQA';
    final groupName = notif['groupName']?.toString() ?? 'Groupe AQA';
    final fromGroupName = notif['fromGroupName']?.toString();

    final accentColor = isNewClientEvent
        ? AqaTheme.statusSuccess
        : AqaTheme.primarySkyHover;

    final String subtitleText;
    if (isNewClientEvent) {
      subtitleText = i18n.locale == 'ar'
          ? 'مشترك جديد في $groupName • تختفي شارة NEW تلقائيا بعد الحصة الأولى'
          : i18n.locale == 'en'
              ? 'New client in $groupName • NEW label disappears after their 1st session'
              : 'Nouveau client dans $groupName • Le label NEW disparait apres sa 1ere seance';
    } else if (isMultiGroup) {
      subtitleText = i18n.locale == 'ar'
          ? 'تعيين متعدد الأفواج في $groupName'
          : i18n.locale == 'en'
              ? 'Multi-group assignment to $groupName'
              : 'Affectation multi-groupe dans $groupName';
    } else {
      subtitleText = fromGroupName != null && fromGroupName.isNotEmpty
          ? (i18n.locale == 'ar'
              ? 'نقل فوج: من $fromGroupName إلى $groupName'
              : i18n.locale == 'en'
                  ? 'Group movement: from $fromGroupName to $groupName'
                  : 'Mouvement de groupe : de $fromGroupName vers $groupName')
          : (i18n.locale == 'ar'
              ? 'حركة تغيير فوج نحو $groupName'
              : i18n.locale == 'en'
                  ? 'Group movement into $groupName'
                  : 'Mouvement de groupe vers $groupName');
    }

    return AqaDoubleBezelCard(
      accentColor: accentColor,
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 11.0),
      onTap: memberId.isNotEmpty
          ? () => context.push('/members/$memberId')
          : null,
      child: Row(
        children: [
          Container(
            width: 36.0,
            height: 36.0,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10.0),
              border: Border.all(
                color: accentColor.withValues(alpha: 0.40),
              ),
            ),
            child: Icon(
              isNewClientEvent
                  ? Icons.person_add_alt_1_rounded
                  : Icons.compare_arrows_rounded,
              color: accentColor,
              size: 18.0,
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
                        memberName,
                        style: const TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 7.0),
                    if (isNewClientEvent)
                      const AqaNewClientBadge(compact: true)
                    else
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6.0,
                          vertical: 1.5,
                        ),
                        decoration: BoxDecoration(
                          color: AqaTheme.primarySky.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(5.0),
                          border: Border.all(
                            color: AqaTheme.primarySkyHover.withValues(alpha: 0.45),
                          ),
                        ),
                        child: Text(
                          isMultiGroup ? 'MULTI-GROUPE' : 'MOUVEMENT',
                          style: const TextStyle(
                            color: AqaTheme.primarySkyHover,
                            fontSize: 8.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 3.0),
                Text(
                  subtitleText,
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 11.2,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: i18n.t('common.close'),
            icon: const Icon(
              Icons.close_rounded,
              color: AqaTheme.textLightMuted,
              size: 17.0,
            ),
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
