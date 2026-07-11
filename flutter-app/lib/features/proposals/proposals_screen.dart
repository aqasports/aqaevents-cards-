import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/demand.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/badge_chip.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_shimmer.dart';

final proposalsProvider = FutureProvider<List<ActivityProposal>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.proposals);
  final list = res.data as List<dynamic>;
  return list.map((e) => ActivityProposal.fromJson(e as Map<String, dynamic>)).toList();
});

class ProposalsScreen extends ConsumerWidget {
  const ProposalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final proposals = ref.watch(proposalsProvider);
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Proposals')),
      body: proposals.when(
        loading: () => const ListLoadingShimmer(),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (list) {
          if (list.isEmpty) return const EmptyState(title: 'No proposals', icon: Icons.lightbulb_outline_rounded);
          return RefreshIndicator(
            color: AppTheme.primary,
            backgroundColor: AppTheme.surface2,
            onRefresh: () => ref.refresh(proposalsProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _ProposalTile(proposal: list[i], onStatusChanged: () => ref.refresh(proposalsProvider.future)),
            ),
          );
        },
      ),
    );
  }
}

class _ProposalTile extends ConsumerWidget {
  final ActivityProposal proposal;
  final VoidCallback onStatusChanged;
  const _ProposalTile({required this.proposal, required this.onStatusChanged});

  Future<void> _updateStatus(BuildContext ctx, WidgetRef ref, String status) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch(ApiConfig.proposalById(proposal.id), data: {'status': status});
      onStatusChanged();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: proposal.isPending ? AppTheme.info.withOpacity(0.3) : AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(proposal.title, style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.foreground, fontSize: 15))),
              BadgeChip.status(proposal.status),
            ],
          ),
          const SizedBox(height: 8),
          Text(proposal.description, style: const TextStyle(color: AppTheme.muted, fontSize: 13), maxLines: 3, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 8),
          Text('By ${proposal.userName}  |  ${proposal.userPhone}', style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
          if (proposal.isPending) ...[
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: OutlinedButton(
                onPressed: () => _updateStatus(context, ref, 'archived'),
                style: OutlinedButton.styleFrom(foregroundColor: AppTheme.muted, side: BorderSide(color: AppTheme.muted.withOpacity(0.3))),
                child: const Text('Archive'),
              )),
              const SizedBox(width: 10),
              Expanded(child: ElevatedButton(
                onPressed: () => _updateStatus(context, ref, 'reviewed'),
                child: const Text('Mark Reviewed'),
              )),
            ]),
          ],
        ],
      ),
    );
  }
}
