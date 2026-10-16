import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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
  String _selectedDateFilter = 'ALL_WEEK'; // 'TODAY' or 'ALL_WEEK' or 'yyyy-MM-dd'

  @override
  Widget build(BuildContext context) {
    final bootstrapAsync = ref.watch(bootstrapProvider);
    final dismissedSet = ref.watch(dismissedRemindersProvider);

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
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 60.0),
              const Icon(Icons.cloud_off_outlined, color: AqaTheme.statusWarning, size: 48.0),
              const SizedBox(height: 16.0),
              const Text(
                'Impossible de charger le planning',
                style: TextStyle(color: AqaTheme.textPrimary, fontSize: 16.0, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8.0),
              Text(
                err.toString(),
                textAlign: TextAlign.center,
                style: const TextStyle(color: AqaTheme.textMuted, fontSize: 13.0),
              ),
              const SizedBox(height: 20.0),
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(bootstrapProvider),
                icon: const Icon(Icons.refresh, size: 18.0),
                label: const Text('Reessayer'),
              ),
            ],
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

          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              // 1. 10-MINUTE PRE-END SESSION REMINDER & QUICK LOGGER BANNER
              if (reminderCandidate != null && !data.coach.isAssistant) ...[
                _buildTenMinReminderBanner(context, reminderCandidate),
                const SizedBox(height: 16.0),
              ],

              // 2. Pending Replacement Requests Alert
              if (pendingCount > 0) ...[
                Container(
                  padding: const EdgeInsets.all(14.0),
                  decoration: BoxDecoration(
                    color: AqaTheme.statusWarningBg,
                    borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                    border: Border.all(color: AqaTheme.statusWarning),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.notification_important_outlined,
                        color: AqaTheme.statusWarning,
                        size: 22.0,
                      ),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$pendingCount Demande${pendingCount > 1 ? 's' : ''} de Remplacement en Attente',
                              style: const TextStyle(
                                color: AqaTheme.textPrimary,
                                fontSize: 13.0,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const Text(
                              'Un collegue coach sollicite votre couverture dans l\'onglet Remplacements.',
                              style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16.0),
              ],

              // 3. Executive KPI Strip
              Row(
                children: [
                  Expanded(
                    child: _buildKpiCard(
                      label: 'Groupes',
                      value: '${data.groups.length}',
                      icon: Icons.groups_outlined,
                      color: AqaTheme.primarySky,
                    ),
                  ),
                  const SizedBox(width: 8.0),
                  Expanded(
                    child: _buildKpiCard(
                      label: 'Seances (7j)',
                      value: '${allSessions.length}',
                      icon: Icons.calendar_today_outlined,
                      color: AqaTheme.accentTeal,
                    ),
                  ),
                  const SizedBox(width: 8.0),
                  Expanded(
                    child: _buildKpiCard(
                      label: 'Nageurs',
                      value: '$totalSwimmers',
                      icon: Icons.pool_outlined,
                      color: AqaTheme.statusSuccess,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16.0),

              // 4. Date Selector Strip (7-Day Interactive Filter)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildDateFilterChip(
                      keyId: 'ALL_WEEK',
                      label: 'Semaine Complete (${allSessions.length})',
                    ),
                    const SizedBox(width: 8.0),
                    _buildDateFilterChip(
                      keyId: 'TODAY',
                      label: 'Aujourd\'hui ($todayStr)',
                    ),
                    const SizedBox(width: 8.0),
                    ...sortedDates
                        .where((d) => d != todayStr)
                        .map(
                          (d) => Padding(
                            padding: const EdgeInsets.only(right: 8.0),
                            child: _buildDateFilterChip(
                              keyId: d,
                              label: _formatFrenchDayShort(d),
                            ),
                          ),
                        ),
                  ],
                ),
              ),
              const SizedBox(height: 16.0),

              // 5. Sessions List
              if (filteredSessions.isEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 44.0, horizontal: 20.0),
                  decoration: BoxDecoration(
                    color: AqaTheme.surfaceDark,
                    borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                    border: Border.all(color: AqaTheme.borderSubtle),
                  ),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.event_available,
                        color: AqaTheme.textLightMuted,
                        size: 40.0,
                      ),
                      const SizedBox(height: 12.0),
                      const Text(
                        'Aucune seance sur ce filtre de date',
                        style: TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 14.0,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6.0),
                      const Text(
                        'Affichez la semaine complete ou consultez vos groupes dans l\'onglet Groupes.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                      ),
                      const SizedBox(height: 14.0),
                      if (_selectedDateFilter != 'ALL_WEEK')
                        OutlinedButton(
                          onPressed: () => setState(() => _selectedDateFilter = 'ALL_WEEK'),
                          child: const Text('Voir Toutes les Seances de la Semaine'),
                        ),
                    ],
                  ),
                )
              else
                ...filteredSessions.map(
                  (session) => _buildSessionCard(
                    context,
                    session,
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
  ) {
    final s = candidate.session;
    final isUrgent = candidate.isWithinTenMinWindow;

    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isUrgent
              ? [
                  const Color(0xFF1E293B),
                  AqaTheme.statusWarning.withValues(alpha: 0.18),
                ]
              : [
                  const Color(0xFF0F172A),
                  AqaTheme.accentTeal.withValues(alpha: 0.14),
                ],
        ),
        borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
        border: Border.all(
          color: isUrgent ? AqaTheme.statusWarning : AqaTheme.borderTeal,
          width: 1.5,
        ),
        boxShadow: AqaTheme.tealGlow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8.0),
                decoration: BoxDecoration(
                  color: isUrgent
                      ? AqaTheme.statusWarningBg
                      : AqaTheme.accentTeal.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10.0),
                ),
                child: Icon(
                  Icons.alarm_on,
                  color: isUrgent ? AqaTheme.statusWarning : AqaTheme.accentTeal,
                  size: 20.0,
                ),
              ),
              const SizedBox(width: 10.0),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      candidate.bannerHeadline.toUpperCase(),
                      style: TextStyle(
                        color: isUrgent
                            ? AqaTheme.statusWarning
                            : AqaTheme.accentTeal,
                        fontSize: 10.5,
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
              IconButton(
                visualDensity: VisualDensity.compact,
                tooltip: 'Masquer ce rappel',
                onPressed: () {
                  ref.read(dismissedRemindersProvider.notifier).dismiss(s.id);
                },
                icon: const Icon(
                  Icons.close,
                  size: 16.0,
                  color: AqaTheme.textLightMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8.0),
          const Text(
            'Notification automatique 10 min avant la fin de seance : validez les presences, l\'evolution des nageurs et la note de seance en 3 etapes simples.',
            style: TextStyle(
              color: AqaTheme.textMuted,
              fontSize: 12.0,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 12.0),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor:
                    isUrgent ? AqaTheme.statusWarning : AqaTheme.primarySky,
                foregroundColor: isUrgent ? Colors.black : Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12.0),
              ),
              onPressed: () {
                QuickSessionLoggerSheet.show(context, s);
              },
              icon: const Icon(Icons.bolt, size: 18.0),
              label: const Text(
                'Ouvrir le Logger Rapide (3 Etapes)',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.0),
              ),
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 12.0),
      decoration: BoxDecoration(
        color: AqaTheme.surfaceDark,
        borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
        border: Border.all(color: AqaTheme.borderSubtle),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8.0),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(8.0),
            ),
            child: Icon(icon, color: color, size: 18.0),
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
                    fontSize: 16.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 10.5,
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
    return ChoiceChip(
      label: Text(label, style: const TextStyle(fontSize: 12.0)),
      selected: isSelected,
      onSelected: (_) => setState(() => _selectedDateFilter = keyId),
      selectedColor: AqaTheme.primarySky,
      backgroundColor: AqaTheme.surfaceDark,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : AqaTheme.textMuted,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
      ),
      side: BorderSide(
        color: isSelected ? AqaTheme.primarySky : AqaTheme.borderSubtle,
      ),
    );
  }

  String _formatFrenchDayShort(String isoDate) {
    if (isoDate.length < 10) return isoDate;
    final dt = DateTime.tryParse(isoDate.substring(0, 10));
    if (dt == null) return isoDate;
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    final dName = days[(dt.weekday - 1) % 7];
    final dayNum = dt.day.toString().padLeft(2, '0');
    final monthNum = dt.month.toString().padLeft(2, '0');
    return '$dName $dayNum/$monthNum';
  }

  Widget _buildSessionCard(
    BuildContext context,
    SwimSessionModel session, {
    required String todayStr,
    required bool isAssistant,
  }) {
    final isDone = session.isCompleted;
    final isToday = session.sessionDate == todayStr;
    final rating = session.sessionRating;

    return Container(
      margin: const EdgeInsets.only(bottom: 12.0),
      decoration: BoxDecoration(
        color: AqaTheme.surfaceDark,
        borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
        border: Border.all(
          color: isToday ? AqaTheme.borderTeal : AqaTheme.borderSubtle,
        ),
        boxShadow: AqaTheme.cardShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
          onTap: () {
            context.push('/sessions/${session.id}');
          },
          child: Padding(
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
                                ? 'AUJOURD\'HUI'
                                : _formatFrenchDayShort(session.sessionDate),
                            style: TextStyle(
                              color: isToday
                                  ? AqaTheme.accentTeal
                                  : AqaTheme.textMuted,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8.0),
                        const Icon(
                          Icons.access_time,
                          color: AqaTheme.accentTeal,
                          size: 15.0,
                        ),
                        const SizedBox(width: 4.0),
                        Text(
                          '${session.startTime} - ${session.endTime}',
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
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
                            isDone ? 'CLOTUREE' : 'PLANIFIEE',
                            style: TextStyle(
                              color: isDone
                                  ? AqaTheme.statusSuccess
                                  : AqaTheme.textMuted,
                              fontSize: 10.0,
                              fontWeight: FontWeight.w700,
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
                    fontSize: 16.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4.0),
                Row(
                  children: [
                    Text(
                      session.category.toUpperCase(),
                      style: const TextStyle(
                        color: AqaTheme.primarySky,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (session.level.isNotEmpty) ...[
                      const Text(
                        ' • ',
                        style: TextStyle(color: AqaTheme.textLightMuted),
                      ),
                      Text(
                        session.level,
                        style: const TextStyle(
                          color: AqaTheme.textMuted,
                          fontSize: 11.5,
                        ),
                      ),
                    ],
                    if (session.pool.isNotEmpty) ...[
                      const Text(
                        ' • ',
                        style: TextStyle(color: AqaTheme.textLightMuted),
                      ),
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
                          fontWeight: FontWeight.w600,
                        ),
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
                      'Focus : ${rating.focus}${rating.intensity != null ? ' (${rating.intensity})' : ''}',
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
                          Icons.how_to_reg_outlined,
                          color: AqaTheme.textLightMuted,
                          size: 16.0,
                        ),
                        const SizedBox(width: 6.0),
                        Text(
                          session.totalMembers > 0
                              ? '${session.attendanceCount} / ${session.totalMembers} presents'
                              : '${session.attendanceCount} presents',
                          style: const TextStyle(
                            color: AqaTheme.textMuted,
                            fontSize: 12.0,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        if (!isAssistant && session.canEdit) ...[
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10.0,
                                vertical: 7.0,
                              ),
                              visualDensity: VisualDensity.compact,
                              side: const BorderSide(color: AqaTheme.borderTeal),
                              foregroundColor: AqaTheme.accentTeal,
                            ),
                            onPressed: () {
                              QuickSessionLoggerSheet.show(context, session);
                            },
                            icon: const Icon(Icons.bolt, size: 15.0),
                            label: const Text(
                              'Log 3 Etapes',
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8.0),
                        ],
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12.0,
                              vertical: 7.0,
                            ),
                            visualDensity: VisualDensity.compact,
                          ),
                          onPressed: () {
                            context.push('/sessions/${session.id}');
                          },
                          icon: Icon(
                            session.canEdit && !isAssistant
                                ? Icons.checklist
                                : Icons.visibility_outlined,
                            size: 15.0,
                          ),
                          label: Text(
                            session.canEdit && !isAssistant
                                ? 'Presences'
                                : 'Consulter',
                            style: const TextStyle(fontSize: 11.5),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
