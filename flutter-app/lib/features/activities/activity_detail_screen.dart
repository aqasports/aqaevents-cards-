import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/activity.dart';
import '../../core/theme/app_theme.dart';

final activityDetailProvider = FutureProvider.family<Activity, String>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.activityById(id));
  return Activity.fromJson(res.data as Map<String, dynamic>);
});

class ActivityDetailScreen extends ConsumerWidget {
  final String activityId;
  const ActivityDetailScreen({super.key, required this.activityId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activity = ref.watch(activityDetailProvider(activityId));
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: Text(activity.valueOrNull?.name ?? 'Activity')),
      body: activity.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (e, _) => Center(child: Text('$e')),
        data: (act) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (act.description != null)
                Text(act.description!, style: const TextStyle(color: AppTheme.muted)),
              const SizedBox(height: 16),
              if (act.sessions?.isNotEmpty == true) ...[
                Text('Sessions', style: Theme.of(context).textTheme.titleSmall?.copyWith(color: AppTheme.muted, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                ...act.sessions!.map((s) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppTheme.surface2, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                  child: Row(
                    children: [
                      const Icon(Icons.event_rounded, color: AppTheme.primary, size: 16),
                      const SizedBox(width: 10),
                      Text('${s.sessionDate.day}/${s.sessionDate.month}/${s.sessionDate.year}', style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w600)),
                      if (s.location != null) ...[
                        const SizedBox(width: 8),
                        Expanded(child: Text(s.location!, style: const TextStyle(color: AppTheme.muted, fontSize: 12), overflow: TextOverflow.ellipsis)),
                      ],
                      if (s.capacity != null)
                        Text('${s.capacity} spots', style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
                    ],
                  ),
                )),
              ] else
                const Text('No sessions scheduled.', style: TextStyle(color: AppTheme.muted)),
            ],
          ),
        ),
      ),
    );
  }
}
