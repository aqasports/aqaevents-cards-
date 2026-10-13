import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/swim_session.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/theme/aqa_theme.dart';

class TodaySessionsView extends ConsumerWidget {
  const TodaySessionsView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrapAsync = ref.watch(bootstrapProvider);

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
                'Unable to load schedule',
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
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
        data: (data) {
          final sessions = data.todaySessions;
          final pendingCount = data.pendingRequests.length;

          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              // Pending Replacement Banner
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
                      const Icon(Icons.notification_important, color: AqaTheme.statusWarning, size: 22.0),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$pendingCount Replacement Request${pendingCount > 1 ? 's' : ''} Pending',
                              style: const TextStyle(
                                color: AqaTheme.textPrimary,
                                fontSize: 13.0,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const Text(
                              'Another coach requested you to cover their session.',
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

              // Header Card
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: AqaTheme.surfaceDark,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                  border: Border.all(color: AqaTheme.borderSubtle),
                  boxShadow: AqaTheme.cardShadow,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Today Schedule',
                          style: TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 16.0,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2.0),
                        Text(
                          sessions.isEmpty
                              ? 'No training sessions scheduled today'
                              : '${sessions.length} session${sessions.length > 1 ? 's' : ''} scheduled',
                          style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                      decoration: BoxDecoration(
                        color: AqaTheme.surfaceSecondary,
                        borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                      ),
                      child: Text(
                        data.serverTime.isNotEmpty
                            ? data.serverTime.substring(0, 10)
                            : DateTime.now().toIso8601String().substring(0, 10),
                        style: const TextStyle(
                          color: AqaTheme.accentTeal,
                          fontSize: 12.0,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16.0),

              // Sessions list
              if (sessions.isEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 48.0, horizontal: 20.0),
                  decoration: BoxDecoration(
                    color: AqaTheme.surfaceDark,
                    borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                    border: Border.all(color: AqaTheme.borderSubtle),
                  ),
                  child: const Center(
                    child: Column(
                      children: [
                        Icon(Icons.event_available, color: AqaTheme.textLightMuted, size: 40.0),
                        SizedBox(height: 12.0),
                        Text(
                          'No active sessions for today',
                          style: TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0, fontWeight: FontWeight.w600),
                        ),
                        SizedBox(height: 4.0),
                        Text(
                          'You can explore your groups in the Groups tab or check back later.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ...sessions.map((session) => _buildSessionCard(context, session)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSessionCard(BuildContext context, SwimSessionModel session) {
    final isDone = session.isCompleted;

    return Container(
      margin: const EdgeInsets.only(bottom: 12.0),
      decoration: BoxDecoration(
        color: AqaTheme.surfaceDark,
        borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
        border: Border.all(
          color: session.isReplacement ? AqaTheme.statusWarning : AqaTheme.borderSubtle,
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.access_time, color: AqaTheme.accentTeal, size: 16.0),
                        const SizedBox(width: 6.0),
                        Text(
                          '${session.startTime} - ${session.endTime}',
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 14.0,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        if (session.isReplacement)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                            margin: const EdgeInsets.only(right: 6.0),
                            decoration: BoxDecoration(
                              color: AqaTheme.statusWarningBg,
                              borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                            ),
                            child: const Text(
                              'COVERAGE',
                              style: TextStyle(color: AqaTheme.statusWarning, fontSize: 10.0, fontWeight: FontWeight.w700),
                            ),
                          ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                          decoration: BoxDecoration(
                            color: isDone ? AqaTheme.statusSuccessBg : AqaTheme.surfaceSecondary,
                            borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                            border: Border.all(
                              color: isDone ? AqaTheme.statusSuccess : AqaTheme.borderSubtle,
                            ),
                          ),
                          child: Text(
                            isDone ? 'COMPLETED' : 'SCHEDULED',
                            style: TextStyle(
                              color: isDone ? AqaTheme.statusSuccess : AqaTheme.textMuted,
                              fontSize: 10.0,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10.0),
                Text(
                  session.groupName,
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 16.0,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4.0),
                Row(
                  children: [
                    Text(
                      session.category.toUpperCase(),
                      style: const TextStyle(color: AqaTheme.primarySky, fontSize: 12.0, fontWeight: FontWeight.w600),
                    ),
                    if (session.pool.isNotEmpty) ...[
                      const Text(' • ', style: TextStyle(color: AqaTheme.textLightMuted)),
                      Text(
                        session.pool,
                        style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 12.0),
                const Divider(),
                const SizedBox(height: 10.0),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.people_outline, color: AqaTheme.textLightMuted, size: 16.0),
                        const SizedBox(width: 6.0),
                        Text(
                          '${session.attendanceCount} marked',
                          style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 8.0),
                        visualDensity: VisualDensity.compact,
                      ),
                      onPressed: () {
                        context.push('/sessions/${session.id}');
                      },
                      icon: Icon(
                        session.canEdit ? Icons.checklist : Icons.visibility_outlined,
                        size: 16.0,
                      ),
                      label: Text(
                        session.canEdit ? 'Presence Sheet' : 'View Sheet',
                        style: const TextStyle(fontSize: 12.0),
                      ),
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
