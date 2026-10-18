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
import '../../core/theme/aqa_theme.dart';

class TodaySessionsView extends ConsumerStatefulWidget {
  const TodaySessionsView({super.key});

  @override
  ConsumerState<TodaySessionsView> createState() => _TodaySessionsViewState();
}

class _TodaySessionsViewState extends ConsumerState<TodaySessionsView> {
  String _selectedDateFilter = 'TODAY';

  @override
  Widget build(BuildContext context) {
    final bootstrapAsync = ref.watch(bootstrapProvider);
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
                  style:
                      const TextStyle(color: AqaTheme.textMuted, fontSize: 12.5),
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

          final incomingReplacements =
              data.pendingRequests.where((r) => r.isIncomingRequest).toList();

          return ListView(
            padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 104.0),
            children: [
              // 1. Urgent Incoming Replacement Requests (Action required only)
              if (incomingReplacements.isNotEmpty) ...[
                ...incomingReplacements.map(
                  (rep) => Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: _buildIncomingCoverageCard(context, rep, i18n),
                  ),
                ),
              ],

              // 2. Clean Executive Date Selector
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: [
                    _buildDateFilterChip(
                      keyId: 'TODAY',
                      label: i18n.t('sessions.filter_today'),
                    ),
                    const SizedBox(width: 8.0),
                    _buildDateFilterChip(
                      keyId: 'ALL_WEEK',
                      label:
                          '${i18n.t('sessions.filter_all_week')} (${allSessions.length})',
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

              // 3. Sessions Feed
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

  Widget _buildIncomingCoverageCard(
    BuildContext context,
    ReplacementModel rep,
    AppI18n i18n,
  ) {
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
            '${rep.originalCoachName} vous propose de couvrir la séance ${rep.groupName} le ${rep.sessionDate} (${rep.startTime} - ${rep.endTime}).',
            style: const TextStyle(
              color: AqaTheme.textMuted,
              fontSize: 12.0,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12.0),
          Row(
            children: [
              Expanded(
                child: AqaIslandButton(
                  label: i18n.t('replacements.accept'),
                  icon: Icons.check_circle_outline_rounded,
                  compact: true,
                  onPressed: () => _respondToReplacement(rep.id, true, i18n),
                ),
              ),
              const SizedBox(width: 10.0),
              Expanded(
                child: AqaIslandButton(
                  label: i18n.t('replacements.decline'),
                  icon: Icons.cancel_outlined,
                  compact: true,
                  secondary: true,
                  onPressed: () => _respondToReplacement(rep.id, false, i18n),
                ),
              ),
            ],
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
        padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 8.5),
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
                fontSize: 12.5,
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
          // Row 1: Group Name & Time Pill
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Text(
                  session.groupName,
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 16.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8.0),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8.5,
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
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.schedule_rounded,
                      color: AqaTheme.textLightMuted,
                      size: 13.0,
                    ),
                    const SizedBox(width: 4.5),
                    Text(
                      '${session.startTime} - ${session.endTime}',
                      style: TextStyle(
                        color: isToday
                            ? AqaTheme.primarySkyHover
                            : AqaTheme.textSecondary,
                        fontSize: 12.0,
                        fontWeight: FontWeight.w700,
                        fontFeatures: AqaTheme.tabularNums,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8.0),

          // Row 2: Subtitle Metadata (Category, Pool, Attendance)
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
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isDone
                        ? Icons.check_circle_rounded
                        : Icons.how_to_reg_rounded,
                    color: isDone
                        ? AqaTheme.statusSuccess
                        : AqaTheme.textLightMuted,
                    size: 13.5,
                  ),
                  const SizedBox(width: 4.0),
                  Text(
                    i18n.t('sessions.present_count', {
                      'present': session.attendanceCount,
                      'total': session.totalMembers > 0
                          ? session.totalMembers
                          : session.attendanceCount,
                    }),
                    style: TextStyle(
                      color: isDone
                          ? AqaTheme.statusSuccess
                          : AqaTheme.textSecondary,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      fontFeatures: AqaTheme.tabularNums,
                    ),
                  ),
                ],
              ),
              if (isDone)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6.0,
                    vertical: 1.5,
                  ),
                  decoration: BoxDecoration(
                    color: AqaTheme.statusSuccessBg,
                    borderRadius: BorderRadius.circular(4.0),
                    border: Border.all(
                      color: AqaTheme.statusSuccess.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Text(
                    i18n.t('sessions.status_closed'),
                    style: const TextStyle(
                      color: AqaTheme.statusSuccess,
                      fontSize: 9.0,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14.0),

          // Row 3: Single Primary Action Button
          SizedBox(
            width: double.infinity,
            child: AqaIslandButton(
              label: session.canEdit && !isAssistant && !session.isViewOnly
                  ? (isDone
                      ? i18n.t('common.edit')
                      : i18n.t('sessions.btn_attendance'))
                  : i18n.t('sessions.btn_view'),
              icon: session.canEdit && !isAssistant && !session.isViewOnly
                  ? Icons.checklist_rounded
                  : Icons.visibility_outlined,
              compact: true,
              secondary: isDone,
              onPressed: () {
                context.push('/sessions/${session.id}');
              },
            ),
          ),
        ],
      ),
    );
  }
}
