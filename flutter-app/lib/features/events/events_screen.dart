import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/activity.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_shimmer.dart';

final sessionsProvider = FutureProvider<List<ActivitySession>>((ref) async {
  final api = ref.read(apiClientProvider);
  // Fetch all activities with their sessions
  final res = await api.get(ApiConfig.activities, params: {'includeSessions': 'true'});
  final list = res.data as List<dynamic>;
  final activities = list.map((e) => Activity.fromJson(e as Map<String, dynamic>)).toList();
  final sessions = activities
      .expand((a) => (a.sessions ?? <ActivitySession>[]).map((s) => s.copyWith(activityName: a.name)))
      .toList()
    ..sort((a, b) => a.sessionDate.compareTo(b.sessionDate));
  return sessions;
});

class EventsScreen extends ConsumerWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessions = ref.watch(sessionsProvider);
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Events')),
      body: sessions.when(
        loading: () => const ListLoadingShimmer(),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (list) {
          final upcoming = list.where((s) => s.sessionDate.isAfter(DateTime.now())).toList();
          final past = list.where((s) => !s.sessionDate.isAfter(DateTime.now())).toList();

          if (list.isEmpty) {
            return const EmptyState(title: 'No events scheduled', icon: Icons.event_outlined);
          }
          return RefreshIndicator(
            color: AppTheme.primary,
            backgroundColor: AppTheme.surface2,
            onRefresh: () => ref.refresh(sessionsProvider.future),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (upcoming.isNotEmpty) ...[
                  _SectionHeader(title: 'Upcoming (${upcoming.length})'),
                  ...upcoming.map((s) => _SessionTile(session: s, isPast: false)),
                ],
                if (past.isNotEmpty) ...[
                  _SectionHeader(title: 'Past (${past.length})'),
                  ...past.take(20).map((s) => _SessionTile(session: s, isPast: true)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, top: 4),
      child: Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: AppTheme.muted, fontWeight: FontWeight.w700)),
    );
  }
}

class _SessionTile extends StatelessWidget {
  final ActivitySession session;
  final bool isPast;
  const _SessionTile({required this.session, required this.isPast});

  @override
  Widget build(BuildContext context) {
    final date = session.sessionDate;
    final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isPast ? AppTheme.surface2.withOpacity(0.5) : AppTheme.surface2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isPast ? AppTheme.border.withOpacity(0.4) : AppTheme.primary.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          // Date box
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(
              color: isPast ? AppTheme.surface : AppTheme.primaryLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('${date.day}', style: TextStyle(color: isPast ? AppTheme.muted : AppTheme.primary, fontWeight: FontWeight.w900, fontSize: 16, height: 1)),
                Text(months[date.month - 1], style: TextStyle(color: isPast ? AppTheme.muted : AppTheme.primary, fontSize: 10, fontWeight: FontWeight.w700)),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(session.activityName ?? 'Session', style: TextStyle(color: isPast ? AppTheme.muted : AppTheme.foreground, fontWeight: FontWeight.w700)),
                if (session.location != null)
                  Text(session.location!, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                if (session.capacity != null)
                  Text('${session.capacity} spots', style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
              ],
            ),
          ),
          if (!isPast)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: AppTheme.successBg, borderRadius: BorderRadius.circular(8)),
              child: const Text('Upcoming', style: TextStyle(color: AppTheme.success, fontSize: 10, fontWeight: FontWeight.w700)),
            ),
        ],
      ),
    );
  }
}
