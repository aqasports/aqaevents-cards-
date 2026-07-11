import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/demand.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/badge_chip.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_shimmer.dart';

final demandsProvider = FutureProvider<List<CardDemand>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.demands);
  final list = res.data as List<dynamic>;
  return list.map((e) => CardDemand.fromJson(e as Map<String, dynamic>)).toList();
});

class DemandsScreen extends ConsumerWidget {
  const DemandsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final demands = ref.watch(demandsProvider);
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Demands')),
      body: demands.when(
        loading: () => const ListLoadingShimmer(),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (list) {
          if (list.isEmpty) {
            return const EmptyState(title: 'No demands', icon: Icons.inbox_outlined);
          }
          return RefreshIndicator(
            color: AppTheme.primary,
            backgroundColor: AppTheme.surface2,
            onRefresh: () => ref.refresh(demandsProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _DemandTile(demand: list[i], onStatusChanged: () => ref.refresh(demandsProvider.future)),
            ),
          );
        },
      ),
    );
  }
}

class _DemandTile extends ConsumerWidget {
  final CardDemand demand;
  final VoidCallback onStatusChanged;
  const _DemandTile({required this.demand, required this.onStatusChanged});

  Future<void> _updateStatus(BuildContext context, WidgetRef ref, String status) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch(ApiConfig.demandById(demand.id), data: {'status': status});
      onStatusChanged();
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to update'), backgroundColor: AppTheme.danger));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: demand.isPending ? AppTheme.warning.withOpacity(0.35) : AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(demand.name, style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.foreground, fontSize: 15)),
                    Text(demand.phone, style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                  ],
                ),
              ),
              BadgeChip.status(demand.status),
            ],
          ),
          const SizedBox(height: 10),
          Text('Type: ${demand.creditType}  |  Price: ${demand.price} DA', style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
          if (demand.cardCode != null)
            Text('Card: ${demand.cardCode}', style: const TextStyle(color: AppTheme.info, fontSize: 12, fontFamily: 'monospace')),
          if (demand.isPending) ...[
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _updateStatus(context, ref, 'rejected'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.danger,
                      side: BorderSide(color: AppTheme.danger.withOpacity(0.5)),
                    ),
                    child: const Text('Reject'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _updateStatus(context, ref, 'accepted'),
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success),
                    child: const Text('Accept'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
