import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/club.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/badge_chip.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_shimmer.dart';

final clubsProvider = FutureProvider<List<Club>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.clubs);
  final list = res.data as List<dynamic>;
  return list.map((e) => Club.fromJson(e as Map<String, dynamic>)).toList();
});

class ClubsScreen extends ConsumerWidget {
  const ClubsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clubs = ref.watch(clubsProvider);
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Clubs')),
      body: clubs.when(
        loading: () => const ListLoadingShimmer(),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (list) {
          if (list.isEmpty) return const EmptyState(title: 'No clubs', icon: Icons.business_outlined);
          return RefreshIndicator(
            color: AppTheme.primary,
            backgroundColor: AppTheme.surface2,
            onRefresh: () => ref.refresh(clubsProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _ClubTile(club: list[i]),
            ),
          );
        },
      ),
    );
  }
}

class _ClubTile extends StatelessWidget {
  final Club club;
  const _ClubTile({required this.club});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/clubs/${club.id}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface2,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Container(
              width: 46, height: 46,
              decoration: BoxDecoration(color: AppTheme.primaryLight, borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.business_rounded, color: AppTheme.primary, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(club.name, style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.foreground, fontSize: 15)),
                  if (club.contactName != null)
                    Text(club.contactName!, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                ],
              ),
            ),
            BadgeChip.status(club.isActive ? 'active' : 'archived'),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right_rounded, color: AppTheme.muted, size: 18),
          ],
        ),
      ),
    );
  }
}
