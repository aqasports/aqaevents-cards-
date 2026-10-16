import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/models/swim_session.dart';
import '../../core/providers/bootstrap_provider.dart';
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
                  size: 46.0,
                ),
                const SizedBox(height: 14.0),
                Text(
                  i18n.t('common.error'),
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 16.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8.0),
                Text(
                  err.toString(),
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
          final pendingCount = data.pendingRequests.length;
          final adminAnnouncement =
              data.appConfig['announcement']?.toString().trim() ?? '';

          return ListView(
            padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 100.0),
            children: [
              // 0. Live Admin Broadcast Banner from AQA Swim Command Center
              if (adminAnnouncement.isNotEmpty) ...[
                AqaDoubleBezelCard(
                  glowing: true,
                  accentColor: AqaTheme.primarySky,
                  padding: const EdgeInsets.all(14.0),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8.0),
                        decoration: BoxDecoration(
                          color: AqaTheme.primarySky.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(10.0),
                        ),
                        child: const Icon(
                          Icons.campaign_outlined,
                          color: AqaTheme.primarySkyHover,
                          size: 20.0,
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
                                color: AqaTheme.accentTeal,
                                fontSize: 10.0,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.0,
                              ),
                            ),
                            const SizedBox(height: 2.0),
                            Text(
                              adminAnnouncement,
                              style: const TextStyle(
                                color: AqaTheme.textPrimary,
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
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

              // 1. 10-MINUTE PRE-END SESSION REMINDER & QUICK LOGGER BANNER
              if (reminderCandidate != null && !data.coach.isAssistant) ...[
                _buildTenMinReminderBanner(context, reminderCandidate, i18n),
                const SizedBox(height: 16.0),
              ],

              // 2. Pending Replacement Requests Alert
              if (pendingCount > 0) ...[
                AqaDoubleBezelCard(
                  glowing: true,
                  accentColor: AqaTheme.statusWarning,
                  padding: const EdgeInsets.all(14.0),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8.0),
                        decoration: BoxDecoration(
                          color: AqaTheme.statusWarningBg,
                          borderRadius: BorderRadius.circular(10.0),
                        ),
                        child: const Icon(
                          Icons.notification_important_outlined,
                          color: AqaTheme.statusWarning,
                          size: 20.0,
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
                                {'count': pendingCount},
                              ),
                              style: const TextStyle(
                                color: AqaTheme.textPrimary,
                                fontSize: 13.0,
                                fontWeight: FontWeight.w800,
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
                const SizedBox(height: 16.0),
              ],

              // 3. Double-Bezel Executive KPI Strip
              Row(
                children: [
                  Expanded(
                    child: _buildKpiCard(
                      label: i18n.t('sessions.kpi_groups'),
                      value: '${data.groups.length}',
                      icon: Icons.groups_rounded,
                      color: AqaTheme.primarySky,
                    ),
                  ),
                  const SizedBox(width: 8.0),
                  Expanded(
                    child: _buildKpiCard(
                      label: i18n.t('sessions.kpi_sessions_week'),
                      value: '${allSessions.length}',
                      icon: Icons.calendar_today_rounded,
                      color: AqaTheme.accentTeal,
                    ),
                  ),
                  const SizedBox(width: 8.0),
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
                      label: '${i18n.t('sessions.filter_all_week')} (${allSessions.length})',
                    ),
                    const SizedBox(width: 8.0),
                    _buildDateFilterChip(
                      keyId: 'TODAY',
                      label: '${i18n.t('sessions.filter_today')} ($todayStr)',
                    ),
                    const SizedBox(width: 8.0),
                    ...sortedDates
                        .where((d) => d != todayStr)
                        .map(
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
                  padding: const EdgeInsets.symmetric(vertical: 40.0, horizontal: 20.0),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.event_available_rounded,
                        color: AqaTheme.textLightMuted,
                        size: 40.0,
                      ),
                      const SizedBox(height: 12.0),
                      Text(
                        i18n.t('sessions.no_sessions_title'),
                        style: const TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 15.0,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6.0),
                      Text(
                        i18n.t('sessions.no_sessions_sub'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.5),
                      ),
                      const SizedBox(height: 14.0),
                      if (_selectedDateFilter != 'ALL_WEEK')
                        OutlinedButton(
                          onPressed: () => setState(() => _selectedDateFilter = 'ALL_WEEK'),
                          child: Text(i18n.t('sessions.show_all_week')),
                        ),
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

  Widget _buildTenMinReminderBanner(
    BuildContext context,
    SessionReminderCandidate candidate,
    AppI18n i18n,
  ) {
    final s = candidate.session;
    final isUrgent = candidate.isWithinTenMinWindow;
    final accent = isUrgent ? AqaTheme.statusWarning : AqaTheme.accentTeal;

    return AqaDoubleBezelCard(
      glowing: true,
      accentColor: accent,
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(9.0),
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(12.0),
                ),
                child: Icon(
                  Icons.alarm_on_rounded,
                  color: accent,
                  size: 20.0,
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
                        fontSize: 10.0,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.9,
                      ),
                    ),
                    const SizedBox(height: 2.0),
                    Text(
                      '${s.groupName} • ${s.startTime} - ${s.endTime} (${s.pool})',
                      style: const TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: () {
                  ref.read(dismissedRemindersProvider.notifier).dismiss(s.id);
                },
                icon: const Icon(
                  Icons.close_rounded,
                  size: 18.0,
                  color: AqaTheme.textLightMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8.0),
          Text(
            i18n.t('sessions.reminder_10min_desc'),
            style: const TextStyle(
              color: AqaTheme.textMuted,
              fontSize: 12.0,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14.0),
          SizedBox(
            width: double.infinity,
            child: AqaIslandButton(
              label: i18n.t('sessions.open_quick_logger'),
              icon: Icons.bolt_rounded,
              color: accent,
              textColor: AqaTheme.bgDark,
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
      outerRadius: 16.0,
      padding: const EdgeInsets.symmetric(horizontal: 11.0, vertical: 12.0),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8.0),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10.0),
            ),
            child: Icon(icon, color: color, size: 17.0),
          ),
          const SizedBox(width: 9.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 16.0,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'monospace',
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 10.0,
                    fontWeight: FontWeight.w600,
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
      onTap: () => setState(() => _selectedDateFilter = keyId),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 8.0),
        decoration: BoxDecoration(
          gradient: isSelected
              ? const LinearGradient(
                  colors: [Color(0xFF0EA5E9), Color(0xFF00F2FF)],
                )
              : null,
          color: isSelected ? null : const Color(0xFF090F1E),
          borderRadius: BorderRadius.circular(999.0),
          border: Border.all(
            color: isSelected
                ? AqaTheme.accentTeal
                : Colors.white.withValues(alpha: 0.10),
            width: 1.0,
          ),
          boxShadow: isSelected
              ? const [
                  BoxShadow(
                    color: Color(0x3300F2FF),
                    blurRadius: 10.0,
                    offset: Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? const Color(0xFF030712) : const Color(0xFF94A3B8),
            fontSize: 12.0,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
          ),
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
    const daysAr = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
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
      accentColor: isDone ? AqaTheme.statusSuccess : AqaTheme.accentTeal,
      onTap: () {
        context.push('/sessions/${session.id}');
      },
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Date/Time + Status + Rating
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8.0,
                      vertical: 4.0,
                    ),
                    decoration: BoxDecoration(
                      color: isToday
                          ? AqaTheme.accentTeal.withValues(alpha: 0.16)
                          : AqaTheme.surfaceSecondary,
                      borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                    ),
                    child: Text(
                      isToday
                          ? i18n.t('sessions.today_badge')
                          : _formatDayShort(session.sessionDate, i18n),
                      style: TextStyle(
                        color: isToday
                            ? AqaTheme.accentTeal
                            : AqaTheme.textMuted,
                        fontSize: 10.0,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8.0),
                  const Icon(
                    Icons.access_time_rounded,
                    color: AqaTheme.accentTeal,
                    size: 15.0,
                  ),
                  const SizedBox(width: 4.0),
                  Text(
                    '${session.startTime} - ${session.endTime}',
                    style: const TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'monospace',
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
                        borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                        border: Border.all(color: AqaTheme.statusWarning),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.star_rounded,
                            color: AqaTheme.statusWarning,
                            size: 13.0,
                          ),
                          const SizedBox(width: 3.0),
                          Text(
                            '${rating.rating}/5',
                            style: const TextStyle(
                              color: AqaTheme.statusWarning,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
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
                          : AqaTheme.surfaceSecondary,
                      borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                      border: Border.all(
                        color: isDone
                            ? AqaTheme.statusSuccess
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
                        fontSize: 10.0,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12.0),

          // Group Title & Pool
          Text(
            session.groupName,
            style: const TextStyle(
              color: AqaTheme.textPrimary,
              fontSize: 16.5,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4.0),
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 6.0,
            children: [
              Text(
                session.category.toUpperCase(),
                style: const TextStyle(
                  color: AqaTheme.primarySky,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (session.level.isNotEmpty) ...[
                const Text('•', style: TextStyle(color: AqaTheme.textLightMuted)),
                Text(
                  session.level,
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 11.5,
                  ),
                ),
              ],
              if (session.pool.isNotEmpty) ...[
                const Text('•', style: TextStyle(color: AqaTheme.textLightMuted)),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      color: AqaTheme.accentTeal,
                      size: 13.0,
                    ),
                    const SizedBox(width: 2.0),
                    Text(
                      session.pool,
                      style: const TextStyle(
                        color: AqaTheme.accentTeal,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),

          if (rating?.focus != null && rating!.focus!.isNotEmpty) ...[
            const SizedBox(height: 8.0),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 10.0,
                vertical: 5.0,
              ),
              decoration: BoxDecoration(
                color: AqaTheme.surfaceSecondary,
                borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
              ),
              child: Text(
                '${i18n.t('sessions.focus_label')} : ${rating.focus}${rating.intensity != null ? ' (${rating.intensity})' : ''}',
                style: const TextStyle(
                  color: AqaTheme.textMuted,
                  fontSize: 11.0,
                ),
              ),
            ),
          ],

          const SizedBox(height: 12.0),
          const Divider(),
          const SizedBox(height: 10.0),

          // Footer Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.how_to_reg_rounded,
                    color: AqaTheme.statusSuccess,
                    size: 16.0,
                  ),
                  const SizedBox(width: 6.0),
                  Text(
                    i18n.t('sessions.present_count', {
                      'present': session.attendanceCount,
                      'total': session.totalMembers > 0 ? session.totalMembers : session.attendanceCount,
                    }),
                    style: const TextStyle(
                      color: AqaTheme.textMuted,
                      fontSize: 12.0,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  if (!isAssistant && session.canEdit) ...[
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 36.0),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10.0,
                          vertical: 6.0,
                        ),
                        visualDensity: VisualDensity.compact,
                        side: const BorderSide(color: AqaTheme.borderTeal),
                        foregroundColor: AqaTheme.accentTeal,
                      ),
                      onPressed: () {
                        QuickSessionLoggerSheet.show(context, session);
                      },
                      icon: const Icon(Icons.bolt_rounded, size: 15.0),
                      label: Text(
                        i18n.t('sessions.log_3_steps'),
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8.0),
                  ],
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(0, 36.0),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12.0,
                        vertical: 6.0,
                      ),
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: () {
                      context.push('/sessions/${session.id}');
                    },
                    icon: Icon(
                      session.canEdit && !isAssistant
                          ? Icons.checklist_rounded
                          : Icons.visibility_outlined,
                      size: 15.0,
                    ),
                    label: Text(
                      session.canEdit && !isAssistant
                          ? i18n.t('sessions.btn_attendance')
                          : i18n.t('sessions.btn_view'),
                      style: const TextStyle(fontSize: 11.5),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
