import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/activity.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_shimmer.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

final activitiesListProvider = FutureProvider<List<Activity>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.activities);
  final list = res.data as List<dynamic>;
  return list.map((e) => Activity.fromJson(e as Map<String, dynamic>)).toList();
});

class ActivitiesListScreen extends ConsumerWidget {
  const ActivitiesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activities = ref.watch(activitiesListProvider);
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Activities')),
      body: activities.when(
        loading: () => const ListLoadingShimmer(),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (list) {
          if (list.isEmpty) {
            return const EmptyState(title: 'No activities', icon: Icons.bolt_outlined);
          }
          return RefreshIndicator(
            color: AppTheme.primary,
            backgroundColor: AppTheme.surface2,
            onRefresh: () => ref.refresh(activitiesListProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _ActivityTile(activity: list[i]),
            ),
          );
        },
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  final Activity activity;
  const _ActivityTile({required this.activity});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/activities/${activity.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.surface2,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            // Image
            ClipRRect(
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(14)),
              child: activity.imageUrl != null
                  ? CachedNetworkImage(
                      imageUrl: activity.imageUrl!,
                      width: 80, height: 80,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(width: 80, height: 80, color: AppTheme.surface),
                      errorWidget: (_, __, ___) => Container(width: 80, height: 80, color: AppTheme.surface, child: const Icon(Icons.bolt_rounded, color: AppTheme.muted)),
                    )
                  : Container(width: 80, height: 80, color: AppTheme.primaryLight, child: const Icon(Icons.bolt_rounded, color: AppTheme.primary, size: 28)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(activity.name, style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.foreground)),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: AppTheme.primaryLight, borderRadius: BorderRadius.circular(6)),
                        child: Text('${activity.creditCost} cr', style: const TextStyle(color: AppTheme.primary, fontSize: 10, fontWeight: FontWeight.w700)),
                      ),
                      if (activity.duration != null) ...[
                        const SizedBox(width: 6),
                        Text(activity.duration!, style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
                      ],
                    ],
                  ),
                  if (activity.places != null) ...[
                    const SizedBox(height: 3),
                    Text(activity.places!, style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
                  ],
                ],
              ),
            ),
            if (!activity.active)
              Container(
                margin: const EdgeInsets.only(right: 12),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                decoration: BoxDecoration(color: AppTheme.dangerBg, borderRadius: BorderRadius.circular(6)),
                child: const Text('Inactive', style: TextStyle(color: AppTheme.danger, fontSize: 10, fontWeight: FontWeight.w700)),
              ),
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: Icon(Icons.chevron_right_rounded, color: AppTheme.muted, size: 18),
            ),
          ],
        ),
      ),
    );
  }
}
