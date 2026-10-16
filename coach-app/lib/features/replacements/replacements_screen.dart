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

class _ReplacementsScreenState extends ConsumerState<ReplacementsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
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
            content: Text(
              accept ? 'Remplacement accepte et seance assignee.' : 'Demande de remplacement refusee.',
            ),
          ),
        );
        ref.invalidate(bootstrapProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AqaTheme.statusDanger,
            content: Text('Impossible de mettre a jour le remplacement: $e'),
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
        title: const Text(
          'Decliner le Remplacement',
          style: TextStyle(color: AqaTheme.textPrimary, fontSize: 16.0, fontWeight: FontWeight.w700),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Indiquez optionnellement le motif du refus:',
              style: TextStyle(color: AqaTheme.textMuted, fontSize: 13.0),
            ),
            const SizedBox(height: 12.0),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(hintText: 'ex: Conflit d\'horaire'),
              style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler', style: TextStyle(color: AqaTheme.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AqaTheme.statusDanger),
            onPressed: () {
              Navigator.pop(ctx);
              _respond(replacementId, false, declineReason: reasonController.text.trim());
            },
            child: const Text('Confirmer le Refus'),
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
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: AqaTheme.statusDanger, size: 40.0),
                const SizedBox(height: 12.0),
                Text('Erreur: $err', style: const TextStyle(color: AqaTheme.textMuted)),
                const SizedBox(height: 16.0),
                ElevatedButton(
                  onPressed: () => ref.invalidate(bootstrapProvider),
                  child: const Text('Reessayer'),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          final pending = data.pendingRequests;
          final active = data.activeReplacements;
          final absences = data.myAbsences;

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
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Remplacements & Absences',
                          style: TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 16.0,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        SizedBox(height: 2.0),
                        Text(
                          'Continuité pedagogique des groupes AQA',
                          style: TextStyle(color: AqaTheme.textMuted, fontSize: 11.5),
                        ),
                      ],
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
                      label: const Text('Declarer Absence'),
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
                  labelStyle: const TextStyle(fontSize: 12.0, fontWeight: FontWeight.w700),
                  tabs: [
                    Tab(text: 'Demandes (${pending.length})'),
                    Tab(text: 'Couvertures (${active.length})'),
                    Tab(text: 'Absences (${absences.length})'),
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
                              'Aucune demande de remplacement en attente',
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
                              'Aucun remplacement confirme actuellement',
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

                    // Declared absences
                    absences.isEmpty
                        ? const Center(
                            child: Text(
                              'Aucune absence declaree sur la periode',
                              style: TextStyle(color: AqaTheme.textMuted),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16.0),
                            itemCount: absences.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10.0),
                            itemBuilder: (ctx, idx) {
                              final abs = absences[idx];
                              return _buildAbsenceCard(abs);
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
    final dateStr =
        rep.sessionDate.length >= 10 ? rep.sessionDate.substring(0, 10) : rep.sessionDate;

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
              Expanded(
                child: Text(
                  'Demande de ${rep.originalCoachName}',
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 14.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                decoration: BoxDecoration(
                  color: AqaTheme.statusWarningBg,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                ),
                child: const Text(
                  'EN ATTENTE',
                  style: TextStyle(
                    color: AqaTheme.statusWarning,
                    fontSize: 10.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8.0),
          Text(
            '${rep.groupName} (${rep.category.toUpperCase()})',
            style: const TextStyle(
              color: AqaTheme.accentTeal,
              fontSize: 13.0,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2.0),
          Text(
            'Date: $dateStr • ${rep.startTime} - ${rep.endTime} • ${rep.pool}',
            style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
          ),
          if (rep.reason != null && rep.reason!.isNotEmpty) ...[
            const SizedBox(height: 6.0),
            Text(
              'Motif: ${rep.reason}',
              style: const TextStyle(
                color: AqaTheme.textLightMuted,
                fontSize: 12.0,
                fontStyle: FontStyle.italic,
              ),
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
                  child: const Text('Refuser'),
                ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AqaTheme.statusSuccess),
                  onPressed: () => _respond(rep.id, true),
                  child: const Text('Accepter'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActiveCard(ReplacementModel rep) {
    final dateStr =
        rep.sessionDate.length >= 10 ? rep.sessionDate.substring(0, 10) : rep.sessionDate;

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
              Expanded(
                child: Text(
                  rep.groupName,
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 14.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                decoration: BoxDecoration(
                  color: AqaTheme.statusSuccessBg,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                ),
                child: const Text(
                  'CONFIRME',
                  style: TextStyle(
                    color: AqaTheme.statusSuccess,
                    fontSize: 10.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4.0),
          Text(
            'Titulaire: ${rep.originalCoachName} -> Remplacant: ${rep.replacementCoachName}',
            style: const TextStyle(
              color: AqaTheme.primarySky,
              fontSize: 12.0,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Date: $dateStr • ${rep.startTime} - ${rep.endTime} • ${rep.pool}',
                  style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                ),
              ),
              if (rep.sessionId.isNotEmpty)
                TextButton.icon(
                  onPressed: () => context.push('/sessions/${rep.sessionId}'),
                  icon: const Icon(Icons.fact_check_outlined, size: 15.0),
                  label: const Text('Feuille', style: TextStyle(fontSize: 12.0)),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAbsenceCard(Map<String, dynamic> abs) {
    final startsAt = abs['startsAt']?.toString() ?? '';
    final endsAt = abs['endsAt']?.toString() ?? '';
    final startStr = startsAt.length >= 10 ? startsAt.substring(0, 10) : startsAt;
    final endStr = endsAt.length >= 10 ? endsAt.substring(0, 10) : endsAt;
    final reason = abs['reason']?.toString().toUpperCase() ?? 'ABSENCE';
    final status = abs['status']?.toString().toUpperCase() ?? 'OPEN';
    final notes = abs['notes']?.toString() ?? '';

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
                'Du $startStr au $endStr',
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 14.0,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                decoration: BoxDecoration(
                  color: AqaTheme.statusInfoBg,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                ),
                child: Text(
                   '$reason • $status',
                  style: const TextStyle(
                    color: AqaTheme.primarySky,
                    fontSize: 10.0,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          if (notes.isNotEmpty) ...[
            const SizedBox(height: 6.0),
            Text(
              notes,
              style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
            ),
          ],
        ],
      ),
    );
  }
}
