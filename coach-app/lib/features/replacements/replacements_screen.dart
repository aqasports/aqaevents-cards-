import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/replacement.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/theme/aqa_theme.dart';

class ReplacementsScreen extends ConsumerStatefulWidget {
  const ReplacementsScreen({super.key});

  @override
  ConsumerState<ReplacementsScreen> createState() => _ReplacementsScreenState();
}

class _ReplacementsScreenState extends ConsumerState<ReplacementsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _respond(String replacementId, bool accept, {String? declineReason}) async {
    final client = ref.read(apiClientProvider);

    try {
      final response = await client.dio.post(
        ApiEndpoints.respondReplacement(replacementId),
        data: {
          'accept': accept,
          if (declineReason != null) 'declineReason': declineReason,
        },
      );

      if (response.statusCode == 200 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: accept ? AqaTheme.statusSuccess : AqaTheme.statusWarning,
            content: Text(accept ? 'Replacement accepted' : 'Replacement declined'),
          ),
        );
        ref.invalidate(bootstrapProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AqaTheme.statusDanger,
            content: Text('Failed to update replacement: $e'),
          ),
        );
      }
    }
  }

  void _showDeclineDialog(String replacementId) {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AqaTheme.surfaceDark,
        title: const Text('Decline Request', style: TextStyle(color: AqaTheme.textPrimary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Optionally provide a reason for declining this replacement coverage:',
              style: TextStyle(color: AqaTheme.textMuted, fontSize: 13.0),
            ),
            const SizedBox(height: 12.0),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(hintText: 'e.g. Schedule conflict'),
              style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AqaTheme.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AqaTheme.statusDanger),
            onPressed: () {
              Navigator.pop(ctx);
              _respond(replacementId, false, declineReason: reasonController.text.trim());
            },
            child: const Text('Decline'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bootstrapAsync = ref.watch(bootstrapProvider);

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      body: bootstrapAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AqaTheme.accentTeal),
        ),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: AqaTheme.statusDanger, size: 40.0),
              const SizedBox(height: 12.0),
              Text('Error: $err', style: const TextStyle(color: AqaTheme.textMuted)),
              const SizedBox(height: 16.0),
              ElevatedButton(
                onPressed: () => ref.invalidate(bootstrapProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (data) {
          final pending = data.pendingRequests;
          final active = data.activeReplacements;

          return Column(
            children: [
              // Header with Declare Absence Button
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                decoration: const BoxDecoration(
                  color: AqaTheme.surfaceDark,
                  border: Border(bottom: BorderSide(color: AqaTheme.borderSubtle)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Coach Replacements',
                      style: TextStyle(color: AqaTheme.textPrimary, fontSize: 16.0, fontWeight: FontWeight.w700),
                    ),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
                        visualDensity: VisualDensity.compact,
                      ),
                      onPressed: () {
                        context.push('/absences/new');
                      },
                      icon: const Icon(Icons.event_busy_outlined, size: 16.0),
                      label: const Text('Declare Absence'),
                    ),
                  ],
                ),
              ),

              // Tab Bar
              Container(
                color: AqaTheme.surfaceDark,
                child: TabBar(
                  controller: _tabController,
                  indicatorColor: AqaTheme.accentTeal,
                  labelColor: AqaTheme.accentTeal,
                  unselectedLabelColor: AqaTheme.textLightMuted,
                  tabs: [
                    Tab(text: 'Requests (${pending.length})'),
                    Tab(text: 'Active / Coverage (${active.length})'),
                  ],
                ),
              ),

              // Tab Views
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    // Incoming requests
                    pending.isEmpty
                        ? const Center(
                            child: Text(
                              'No pending replacement requests',
                              style: TextStyle(color: AqaTheme.textMuted),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16.0),
                            itemCount: pending.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10.0),
                            itemBuilder: (ctx, idx) {
                              final rep = pending[idx];
                              return _buildPendingCard(rep);
                            },
                          ),

                    // Active coverages
                    active.isEmpty
                        ? const Center(
                            child: Text(
                              'No active replacement assignments',
                              style: TextStyle(color: AqaTheme.textMuted),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16.0),
                            itemCount: active.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10.0),
                            itemBuilder: (ctx, idx) {
                              final rep = active[idx];
                              return _buildActiveCard(rep);
                            },
                          ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildPendingCard(ReplacementModel rep) {
    final dateStr = rep.sessionDate.length >= 10 ? rep.sessionDate.substring(0, 10) : rep.sessionDate;

    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: AqaTheme.surfaceDark,
        borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
        border: Border.all(color: AqaTheme.statusWarning),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Request from ${rep.originalCoachName}',
                style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0, fontWeight: FontWeight.w700),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                decoration: BoxDecoration(
                  color: AqaTheme.statusWarningBg,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                ),
                child: const Text(
                  'PENDING',
                  style: TextStyle(color: AqaTheme.statusWarning, fontSize: 10.0, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8.0),
          Text(
            '${rep.groupName} (${rep.category.toUpperCase()})',
            style: const TextStyle(color: AqaTheme.accentTeal, fontSize: 13.0, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2.0),
          Text(
            'Date: $dateStr • ${rep.startTime} - ${rep.endTime} • ${rep.pool}',
            style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
          ),
          if (rep.reason != null && rep.reason!.isNotEmpty) ...[
            const SizedBox(height: 6.0),
            Text(
              'Reason: ${rep.reason}',
              style: const TextStyle(color: AqaTheme.textLightMuted, fontSize: 12.0, fontStyle: FontStyle.italic),
            ),
          ],
          const SizedBox(height: 14.0),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AqaTheme.statusDanger,
                    side: const BorderSide(color: AqaTheme.statusDanger),
                  ),
                  onPressed: () => _showDeclineDialog(rep.id),
                  child: const Text('Decline'),
                ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AqaTheme.statusSuccess),
                  onPressed: () => _respond(rep.id, true),
                  child: const Text('Accept Coverage'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActiveCard(ReplacementModel rep) {
    final dateStr = rep.sessionDate.length >= 10 ? rep.sessionDate.substring(0, 10) : rep.sessionDate;

    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: AqaTheme.surfaceDark,
        borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
        border: Border.all(color: AqaTheme.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                rep.groupName,
                style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0, fontWeight: FontWeight.w700),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                decoration: BoxDecoration(
                  color: AqaTheme.statusSuccessBg,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                ),
                child: const Text(
                  'CONFIRMED',
                  style: TextStyle(color: AqaTheme.statusSuccess, fontSize: 10.0, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4.0),
          Text(
            'Assigned Replacement Coach: ${rep.replacementCoachName}',
            style: const TextStyle(color: AqaTheme.primarySky, fontSize: 12.0, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 2.0),
          Text(
            'Date: $dateStr • ${rep.startTime} - ${rep.endTime} • ${rep.pool}',
            style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
          ),
        ],
      ),
    );
  }
}
