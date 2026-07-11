import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/club.dart';
import '../../core/theme/app_theme.dart';

final clubDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.clubById(id));
  return res.data as Map<String, dynamic>;
});

final clubCheckInsProvider = FutureProvider.family<List<CheckIn>, String>((ref, id) async {
  final api = ref.read(apiClientProvider);
  try {
    final res = await api.get('${ApiConfig.clubById(id)}/checkins');
    final list = res.data as List<dynamic>;
    return list.map((e) => CheckIn.fromJson(e as Map<String, dynamic>)).toList();
  } catch (_) {
    return [];
  }
});

class ClubDetailScreen extends ConsumerWidget {
  final String clubId;
  const ClubDetailScreen({super.key, required this.clubId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(clubDetailProvider(clubId));
    final checkIns = ref.watch(clubCheckInsProvider(clubId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(
          (detail.valueOrNull?['name'] as String?) ?? 'Club Detail',
        ),
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        backgroundColor: AppTheme.surface2,
        onRefresh: () async {
          ref.refresh(clubDetailProvider(clubId));
          ref.refresh(clubCheckInsProvider(clubId));
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            // Club info card
            detail.when(
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
              data: (data) {
                final club = Club.fromJson(data);
                return Container(
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: AppTheme.surface2,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (club.contactName != null) _InfoRow(label: 'Contact', value: club.contactName!),
                      if (club.contactEmail != null) _InfoRow(label: 'Email', value: club.contactEmail!),
                      if (club.contactPhone != null) _InfoRow(label: 'Phone', value: club.contactPhone!),
                      _InfoRow(label: 'Status', value: club.isActive ? 'Active' : 'Inactive'),
                    ],
                  ),
                );
              },
            ),
            // Check-ins section
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                'Recent Check-ins',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: AppTheme.muted,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
            checkIns.when(
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator(color: AppTheme.primary),
                ),
              ),
              error: (e, _) => Text('$e', style: const TextStyle(color: AppTheme.muted)),
              data: (list) {
                if (list.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(
                      child: Text('No check-ins recorded yet.',
                          style: TextStyle(color: AppTheme.muted)),
                    ),
                  );
                }
                return Column(
                  children: list.take(50).map((ci) {
                    final isSuccess = ci.status == 'SUCCESS';
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.surface2,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSuccess
                              ? AppTheme.success.withOpacity(0.25)
                              : AppTheme.danger.withOpacity(0.25),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isSuccess ? Icons.check_circle_rounded : Icons.cancel_rounded,
                            color: isSuccess ? AppTheme.success : AppTheme.danger,
                            size: 18,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Client: ${ci.clientId.substring(0, 8).toUpperCase()}...',
                              style: const TextStyle(
                                  color: AppTheme.foreground,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13),
                            ),
                          ),
                          Text(
                            '${ci.scannedAt.hour.toString().padLeft(2, '0')}:${ci.scannedAt.minute.toString().padLeft(2, '0')}',
                            style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(label,
                style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(
                    color: AppTheme.foreground,
                    fontWeight: FontWeight.w600,
                    fontSize: 13)),
          ),
        ],
      ),
    );
  }
}
