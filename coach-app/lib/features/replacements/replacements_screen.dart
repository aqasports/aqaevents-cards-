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

class _ReplacementsScreenState extends ConsumerState<ReplacementsScreen> {
  int _selectedSegment = 0;

  Future<void> _respond(
    String replacementId,
    bool accept, {
    String? declineReason,
  }) async {
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
            backgroundColor:
                accept ? AqaTheme.statusSuccess : AqaTheme.statusWarning,
            content: Text(
              accept
                  ? i18n.t('replacements.accept_confirm')
                  : i18n.t('replacements.decline_confirm'),
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
            content: Text('${i18n.t('common.error')}: $e'),
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
          borderRadius: BorderRadius.circular(16.0),
          side: const BorderSide(color: AqaTheme.borderMedium),
        ),
        title: Text(
          i18n.locale == 'ar'
              ? 'رفض طلب الاستخلاف'
              : i18n.locale == 'en'
                  ? 'Decline Replacement'
                  : 'Decliner le Remplacement',
          style: const TextStyle(
            color: AqaTheme.textPrimary,
            fontSize: 16.0,
            fontWeight: FontWeight.w700,
          ),
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
                hintText: i18n.locale == 'ar'
                    ? 'مثال: تعارض في الجدول'
                    : 'ex: Conflit d\'horaire',
              ),
              style: const TextStyle(
                color: AqaTheme.textPrimary,
                fontSize: 13.5,
              ),
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
            style: ElevatedButton.styleFrom(
              backgroundColor: AqaTheme.statusDanger,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _respond(
                replacementId,
                false,
                declineReason: reasonController.text.trim(),
              );
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

    return RefreshIndicator(
      color: AqaTheme.accentTeal,
      backgroundColor: AqaTheme.surfaceDark,
      onRefresh: () async {
        ref.invalidate(bootstrapProvider);
      },
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
                  const Icon(
                    Icons.error_outline,
                    color: AqaTheme.statusDanger,
                    size: 40.0,
                  ),
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

          return ListView(
            padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 108.0),
            children: [
              // Header with Declare Absence Button
              AqaDoubleBezelCard(
                padding: const EdgeInsets.all(16.0),
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
                              fontSize: 15.5,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                          ),
                          const SizedBox(height: 3.0),
                          Text(
                            i18n.t('replacements.subtitle'),
                            style: const TextStyle(
                              color: AqaTheme.textMuted,
                              fontSize: 11.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12.0),
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
              const SizedBox(height: 14.0),

              // Luxury Segmented Control instead of native Material TabBar
              AqaSegmentedControl<int>(
                values: const [0, 1, 2],
                labels: [
                  i18n.t('replacements.tab_requests', {'count': pending.length}),
                  i18n.t('replacements.tab_active', {'count': active.length}),
                  i18n.t('replacements.tab_absences', {'count': absences.length}),
                ],
                selectedValue: _selectedSegment,
                onValueChanged: (val) => setState(() => _selectedSegment = val),
              ),
              const SizedBox(height: 16.0),

              if (_selectedSegment == 0) ...[
                if (pending.isEmpty)
                  _buildEmptyState(
                    icon: Icons.inbox_outlined,
                    title: i18n.t('replacements.empty_requests'),
                    subtitle: i18n.t('replacements.empty_requests_sub'),
                  )
                else
                  ...pending.map(
                    (rep) => Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: _buildPendingCard(rep, i18n),
                    ),
                  ),
              ] else if (_selectedSegment == 1) ...[
                if (active.isEmpty)
                  _buildEmptyState(
                    icon: Icons.swap_horiz_rounded,
                    title: i18n.t('replacements.empty_active'),
                  )
                else
                  ...active.map(
                    (rep) => Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: _buildActiveCard(rep, i18n),
                    ),
                  ),
              ] else ...[
                if (absences.isEmpty)
                  _buildEmptyState(
                    icon: Icons.event_available_outlined,
                    title: i18n.t('replacements.empty_absences'),
                  )
                else
                  ...absences.map(
                    (abs) => Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: _buildAbsenceCard(abs, i18n),
                    ),
                  ),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    String? subtitle,
  }) {
    return AqaDoubleBezelCard(
      padding: const EdgeInsets.symmetric(vertical: 40.0, horizontal: 20.0),
      child: Column(
        children: [
          Icon(icon, color: AqaTheme.textLightMuted, size: 36.0),
          const SizedBox(height: 12.0),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AqaTheme.textPrimary,
              fontSize: 14.0,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (subtitle != null && subtitle.isNotEmpty) ...[
            const SizedBox(height: 5.0),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AqaTheme.textMuted,
                fontSize: 12.0,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPendingCard(ReplacementModel rep, AppI18n i18n) {
    final dateStr = rep.sessionDate.length >= 10
        ? rep.sessionDate.substring(0, 10)
        : rep.sessionDate;

    return AqaDoubleBezelCard(
      glowing: true,
      accentColor: AqaTheme.statusWarning,
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
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8.0,
                  vertical: 2.5,
                ),
                decoration: BoxDecoration(
                  color: AqaTheme.statusWarningBg,
                  borderRadius: BorderRadius.circular(6.0),
                  border: Border.all(
                    color: AqaTheme.statusWarning.withValues(alpha: 0.45),
                  ),
                ),
                child: Text(
                  i18n.locale == 'ar' ? 'قيد الانتظار' : 'EN ATTENTE',
                  style: const TextStyle(
                    color: AqaTheme.statusWarning,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.4,
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
            style: const TextStyle(
              color: AqaTheme.textMuted,
              fontSize: 12.0,
              fontFeatures: AqaTheme.tabularNums,
            ),
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
              const SizedBox(width: 10.0),
              Expanded(
                child: AqaIslandButton(
                  label: i18n.locale == 'ar' ? 'قبول الحصة' : 'Accepter',
                  icon: Icons.check_rounded,
                  compact: true,
                  color: AqaTheme.statusSuccess,
                  textColor: Colors.white,
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
    final dateStr = rep.sessionDate.length >= 10
        ? rep.sessionDate.substring(0, 10)
        : rep.sessionDate;

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
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8.0,
                  vertical: 2.5,
                ),
                decoration: BoxDecoration(
                  color: AqaTheme.statusSuccessBg,
                  borderRadius: BorderRadius.circular(6.0),
                  border: Border.all(
                    color: AqaTheme.statusSuccess.withValues(alpha: 0.45),
                  ),
                ),
                child: Text(
                  i18n.locale == 'ar' ? 'مؤكد' : 'CONFIRME',
                  style: const TextStyle(
                    color: AqaTheme.statusSuccess,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.4,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6.0),
          Text(
            i18n.locale == 'ar'
                ? 'الأصيل: ${rep.originalCoachName} -> المستخلف: ${rep.replacementCoachName}'
                : 'Titulaire: ${rep.originalCoachName} -> Remplacant: ${rep.replacementCoachName}',
            style: const TextStyle(
              color: AqaTheme.primarySkyHover,
              fontSize: 12.0,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  '${i18n.locale == 'ar' ? 'التاريخ' : 'Date'}: $dateStr • ${rep.startTime} - ${rep.endTime} • ${rep.pool}',
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 11.5,
                    fontFeatures: AqaTheme.tabularNums,
                  ),
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
    final startStr =
        startsAt.length >= 10 ? startsAt.substring(0, 10) : startsAt;
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
                i18n.locale == 'ar'
                    ? 'من $startStr إلى $endStr'
                    : 'Du $startStr au $endStr',
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  fontFeatures: AqaTheme.tabularNums,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8.0,
                  vertical: 2.5,
                ),
                decoration: BoxDecoration(
                  color: AqaTheme.statusInfoBg,
                  borderRadius: BorderRadius.circular(6.0),
                  border: Border.all(
                    color: AqaTheme.primarySkyHover.withValues(alpha: 0.40),
                  ),
                ),
                child: Text(
                  '$reason • $status',
                  style: const TextStyle(
                    color: AqaTheme.primarySkyHover,
                    fontSize: 9.5,
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
