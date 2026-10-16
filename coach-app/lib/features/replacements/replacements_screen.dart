import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/i18n/app_i18n.dart';
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
    final i18n = ref.read(i18nProvider);

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
              accept
                  ? (i18n.locale == 'ar'
                      ? 'تم قبول الاستخلاف وتثبيت الحصة بنجاح.'
                      : i18n.locale == 'en'
                          ? 'Replacement accepted and session assigned.'
                          : 'Remplacement accepte et seance assignee.')
                  : (i18n.locale == 'ar'
                      ? 'تم رفض طلب الاستخلاف.'
                      : i18n.locale == 'en'
                          ? 'Replacement request declined.'
                          : 'Demande de remplacement refusee.'),
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
            content: Text(
              '${i18n.t('common.error')}: $e',
            ),
          ),
        );
      }
    }
  }

  void _showDeclineDialog(String replacementId) {
    final reasonController = TextEditingController();
    final i18n = ref.read(i18nProvider);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AqaTheme.surfaceDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
          side: const BorderSide(color: AqaTheme.borderSubtle),
        ),
        title: Text(
          i18n.locale == 'ar'
              ? 'رفض طلب الاستخلاف'
              : i18n.locale == 'en'
                  ? 'Decline Replacement'
                  : 'Decliner le Remplacement',
          style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 16.0, fontWeight: FontWeight.w700),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              i18n.locale == 'ar'
                  ? 'يرجى توضيح سبب الاعتذار (اختياري):'
                  : i18n.locale == 'en'
                      ? 'Optionally specify reason for declining:'
                      : 'Indiquez optionnellement le motif du refus:',
              style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.5),
            ),
            const SizedBox(height: 12.0),
            TextField(
              controller: reasonController,
              decoration: InputDecoration(
                hintText: i18n.locale == 'ar' ? 'مثال: تعارض في الجدول' : 'ex: Conflit d\'horaire',
              ),
              style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.5),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              i18n.t('common.cancel'),
              style: const TextStyle(color: AqaTheme.textMuted),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AqaTheme.statusDanger),
            onPressed: () {
              Navigator.pop(ctx);
              _respond(replacementId, false, declineReason: reasonController.text.trim());
            },
            child: Text(
              i18n.locale == 'ar' ? 'تأكيد الرفض' : 'Confirmer le Refus',
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bootstrapAsync = ref.watch(bootstrapProvider);
    final i18n = ref.watch(i18nProvider);

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      body: AqaAmbientBackground(
        child: bootstrapAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AqaTheme.accentTeal),
          ),
          error: (err, stack) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: AqaDoubleBezelCard(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, color: AqaTheme.statusDanger, size: 40.0),
                    const SizedBox(height: 12.0),
                    Text(
                      '${i18n.t('common.error')}: $err',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AqaTheme.textMuted),
                    ),
                    const SizedBox(height: 16.0),
                    AqaIslandButton(
                      label: i18n.t('common.retry'),
                      icon: Icons.refresh_rounded,
                      compact: true,
                      onPressed: () => ref.invalidate(bootstrapProvider),
                    ),
                  ],
                ),
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
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  child: AqaDoubleBezelCard(
                    padding: const EdgeInsets.all(14.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                i18n.t('replacements.title'),
                                style: const TextStyle(
                                  color: AqaTheme.textPrimary,
                                  fontSize: 15.0,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 2.0),
                              Text(
                                i18n.t('replacements.subtitle'),
                                style: const TextStyle(color: AqaTheme.textMuted, fontSize: 11.0),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8.0),
                        AqaIslandButton(
                          label: i18n.t('replacements.declare_btn'),
                          icon: Icons.event_busy_outlined,
                          compact: true,
                          onPressed: () {
                            context.push('/absences/new');
                          },
                        ),
                      ],
                    ),
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
                      Tab(
                        text: i18n.t('replacements.tab_requests', {'count': pending.length}),
                      ),
                      Tab(
                        text: i18n.t('replacements.tab_active', {'count': active.length}),
                      ),
                      Tab(
                        text: i18n.t('replacements.tab_absences', {'count': absences.length}),
                      ),
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
                          ? Center(
                              child: Text(
                                i18n.t('replacements.empty_requests'),
                                style: const TextStyle(color: AqaTheme.textMuted),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 110.0),
                              itemCount: pending.length,
                              itemBuilder: (ctx, idx) {
                                final rep = pending[idx];
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12.0),
                                  child: _buildPendingCard(rep, i18n),
                                );
                              },
                            ),

                      // Active coverages
                      active.isEmpty
                          ? Center(
                              child: Text(
                                i18n.t('replacements.empty_active'),
                                style: const TextStyle(color: AqaTheme.textMuted),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 110.0),
                              itemCount: active.length,
                              itemBuilder: (ctx, idx) {
                                final rep = active[idx];
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12.0),
                                  child: _buildActiveCard(rep, i18n),
                                );
                              },
                            ),

                      // Declared absences
                      absences.isEmpty
                          ? Center(
                              child: Text(
                                i18n.t('replacements.empty_absences'),
                                style: const TextStyle(color: AqaTheme.textMuted),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 110.0),
                              itemCount: absences.length,
                              itemBuilder: (ctx, idx) {
                                final abs = absences[idx];
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12.0),
                                  child: _buildAbsenceCard(abs, i18n),
                                );
                              },
                            ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildPendingCard(ReplacementModel rep, AppI18n i18n) {
    final dateStr =
        rep.sessionDate.length >= 10 ? rep.sessionDate.substring(0, 10) : rep.sessionDate;

    return AqaDoubleBezelCard(
      glowEffect: true,
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  i18n.locale == 'ar'
                      ? 'طلب استخلاف من ${rep.originalCoachName}'
                      : i18n.locale == 'en'
                          ? 'Request from ${rep.originalCoachName}'
                          : 'Demande de ${rep.originalCoachName}',
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                decoration: BoxDecoration(
                  color: AqaTheme.statusWarningBg,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                  border: Border.all(color: AqaTheme.statusWarning.withValues(alpha: 0.5)),
                ),
                child: Text(
                  i18n.locale == 'ar' ? 'قيد الانتظار' : 'EN ATTENTE',
                  style: const TextStyle(
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
          const SizedBox(height: 3.0),
          Text(
            '${i18n.locale == 'ar' ? 'التاريخ' : 'Date'}: $dateStr • ${rep.startTime} - ${rep.endTime} • ${rep.pool}',
            style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
          ),
          if (rep.reason != null && rep.reason!.isNotEmpty) ...[
            const SizedBox(height: 6.0),
            Text(
              '${i18n.locale == 'ar' ? 'السبب' : 'Motif'}: ${rep.reason}',
              style: const TextStyle(
                color: AqaTheme.textLightMuted,
                fontSize: 11.5,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
          const SizedBox(height: 14.0),
          Row(
            children: [
              Expanded(
                child: AqaIslandButton(
                  label: i18n.locale == 'ar' ? 'اعتذار' : 'Refuser',
                  icon: Icons.close_rounded,
                  compact: true,
                  secondary: true,
                  onPressed: () => _showDeclineDialog(rep.id),
                ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: AqaIslandButton(
                  label: i18n.locale == 'ar' ? 'قبول الحصة' : 'Accepter',
                  icon: Icons.check_circle_outline_rounded,
                  compact: true,
                  onPressed: () => _respond(rep.id, true),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActiveCard(ReplacementModel rep, AppI18n i18n) {
    final dateStr =
        rep.sessionDate.length >= 10 ? rep.sessionDate.substring(0, 10) : rep.sessionDate;

    return AqaDoubleBezelCard(
      padding: const EdgeInsets.all(16.0),
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
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                decoration: BoxDecoration(
                  color: AqaTheme.statusSuccessBg,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                  border: Border.all(color: AqaTheme.statusSuccess.withValues(alpha: 0.5)),
                ),
                child: Text(
                  i18n.locale == 'ar' ? 'مؤكد' : 'CONFIRME',
                  style: const TextStyle(
                    color: AqaTheme.statusSuccess,
                    fontSize: 10.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6.0),
          Text(
            i18n.locale == 'ar'
                ? 'الأصيل: ${rep.originalCoachName} ← المستخلف: ${rep.replacementCoachName}'
                : 'Titulaire: ${rep.originalCoachName} -> Remplacant: ${rep.replacementCoachName}',
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
                  '${i18n.locale == 'ar' ? 'التاريخ' : 'Date'}: $dateStr • ${rep.startTime} - ${rep.endTime} • ${rep.pool}',
                  style: const TextStyle(color: AqaTheme.textMuted, fontSize: 11.5),
                ),
              ),
              if (rep.sessionId.isNotEmpty)
                AqaIslandButton(
                  label: i18n.locale == 'ar' ? 'ورقة الحضور' : 'Feuille',
                  icon: Icons.assignment_outlined,
                  compact: true,
                  secondary: true,
                  onPressed: () => context.push('/sessions/${rep.sessionId}'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAbsenceCard(Map<String, dynamic> abs, AppI18n i18n) {
    final startsAt = abs['startsAt']?.toString() ?? '';
    final endsAt = abs['endsAt']?.toString() ?? '';
    final startStr = startsAt.length >= 10 ? startsAt.substring(0, 10) : startsAt;
    final endStr = endsAt.length >= 10 ? endsAt.substring(0, 10) : endsAt;
    final reason = abs['reason']?.toString().toUpperCase() ?? 'ABSENCE';
    final status = abs['status']?.toString().toUpperCase() ?? 'OPEN';
    final notes = abs['notes']?.toString() ?? '';

    return AqaDoubleBezelCard(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                i18n.locale == 'ar' ? 'من $startStr إلى $endStr' : 'Du $startStr au $endStr',
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
                  border: Border.all(color: AqaTheme.primarySky.withValues(alpha: 0.4)),
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
