import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/tech_review.dart';
import '../../core/theme/aqa_theme.dart';

final swimmerProfileProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, memberId) async {
  final client = ref.watch(apiClientProvider);
  final response = await client.dio.get(ApiEndpoints.memberProfile(memberId));
  if (response.statusCode == 200 && response.data != null) {
    return response.data as Map<String, dynamic>;
  }
  throw Exception('Failed to load swimmer profile');
});

class SwimmerProfileScreen extends ConsumerWidget {
  final String memberId;

  const SwimmerProfileScreen({super.key, required this.memberId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(swimmerProfileProvider(memberId));

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Suivi & Evolution Nageur'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(swimmerProfileProvider(memberId)),
          ),
        ],
      ),
      body: profileAsync.when(
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
                  onPressed: () => ref.invalidate(swimmerProfileProvider(memberId)),
                  child: const Text('Reessayer'),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          final member = data['member'] as Map<String, dynamic>;
          final currentGroup = data['currentGroup'] as Map<String, dynamic>?;
          final attendanceSummary = data['attendanceSummary'] as Map<String, dynamic>? ?? {};
          final earnedBadges = (data['earnedBadges'] as List<dynamic>?) ?? [];
          final reviewsRaw = (data['reviews'] as List<dynamic>?) ??
              (data['techReviews'] as List<dynamic>?) ??
              [];
          final reviews = reviewsRaw
              .map((r) => TechReviewModel.fromJson(r as Map<String, dynamic>))
              .toList();
          final canEdit = data['canEdit'] as bool? ?? false;

          final badgeLabel = member['badgeLabel'] as String? ?? 'Starter';
          final badgeAsset = member['badgeAsset'] as String? ?? 'starter.png';
          final avgSkillScore = (member['avgSkillScore'] as num?)?.toDouble() ?? 1.0;

          final presentCount = (attendanceSummary['present'] as num?)?.toInt() ??
              (member['totalPresences'] as num?)?.toInt() ??
              0;
          final absentCount = (attendanceSummary['absent'] as num?)?.toInt() ??
              (member['totalAbsences'] as num?)?.toInt() ??
              0;
          final lateCount = (attendanceSummary['late'] as num?)?.toInt() ?? 0;
          final attendanceRate = (attendanceSummary['attendanceRate'] as num?)?.toInt() ??
              (member['attendanceRate'] as num?)?.toInt() ??
              100;

          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              // Swimmer Hero Card with Badge
              Container(
                padding: const EdgeInsets.all(18.0),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF0A243E)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                  border: Border.all(color: AqaTheme.accentTeal.withValues(alpha: 0.35)),
                  boxShadow: AqaTheme.tealGlow,
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 68.0,
                          height: 68.0,
                          padding: const EdgeInsets.all(6.0),
                          decoration: BoxDecoration(
                            color: AqaTheme.bgDark.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(16.0),
                            border: Border.all(
                              color: AqaTheme.accentTeal.withValues(alpha: 0.45),
                              width: 1.5,
                            ),
                          ),
                          child: Image.asset(
                            'assets/images/badges/$badgeAsset',
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => Center(
                              child: Text(
                                (member['fullName'] as String? ?? 'S')
                                    .substring(0, 1)
                                    .toUpperCase(),
                                style: const TextStyle(
                                  color: AqaTheme.accentTeal,
                                  fontSize: 24.0,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14.0),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                member['fullName'] as String? ?? 'Nageur AQA',
                                style: const TextStyle(
                                  color: AqaTheme.textPrimary,
                                  fontSize: 18.0,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 4.0),
                              Text(
                                currentGroup != null
                                    ? '${currentGroup['name']} • ${(currentGroup['category'] ?? '').toString().toUpperCase()}'
                                    : 'Aucun groupe principal',
                                style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.5),
                              ),
                              const SizedBox(height: 8.0),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8.0,
                                      vertical: 3.0,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AqaTheme.accentTeal.withValues(alpha: 0.16),
                                      borderRadius: BorderRadius.circular(6.0),
                                      border: Border.all(
                                        color: AqaTheme.accentTeal.withValues(alpha: 0.5),
                                      ),
                                    ),
                                    child: Text(
                                      'RANG: ${badgeLabel.toUpperCase()}',
                                      style: const TextStyle(
                                        color: AqaTheme.accentTeal,
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8.0),
                                  Text(
                                    'Score: ${avgSkillScore.toStringAsFixed(1)} / 4.0',
                                    style: const TextStyle(
                                      color: AqaTheme.primarySky,
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16.0),
                    const Divider(),
                    const SizedBox(height: 10.0),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStatMetric('Presences', '$presentCount', AqaTheme.statusSuccess),
                        _buildStatMetric('Absences', '$absentCount', AqaTheme.statusDanger),
                        _buildStatMetric('Retards', '$lateCount', AqaTheme.statusWarning),
                        _buildStatMetric('Assiduite', '$attendanceRate%', AqaTheme.accentTeal),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16.0),

              // Action button for new review
              if (canEdit)
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14.0),
                  ),
                  onPressed: () {
                    context.push('/members/$memberId/review-form');
                  },
                  icon: const Icon(Icons.insights_rounded, size: 18.0),
                  label: const Text('Nouvelle Evaluation & Attribution de Badge'),
                )
              else
                Container(
                  padding: const EdgeInsets.all(12.0),
                  decoration: BoxDecoration(
                    color: AqaTheme.surfaceSecondary,
                    borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.lock_outline, color: AqaTheme.textLightMuted, size: 16.0),
                      SizedBox(width: 8.0),
                      Expanded(
                        child: Text(
                          'Mode Assistant: Les evaluations techniques sont reservees aux Coachs et Head Coachs.',
                          style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 20.0),

              // 10-Badge Progression Ladder
              if (earnedBadges.isNotEmpty) ...[
                const Text(
                  'Progression des 10 Badges Officiels AQA',
                  style: TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 14.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10.0),
                SizedBox(
                  height: 92.0,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: earnedBadges.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 10.0),
                    itemBuilder: (ctx, idx) {
                      final b = earnedBadges[idx] as Map<String, dynamic>;
                      final unlocked = b['unlocked'] as bool? ?? false;
                      final asset = b['assetName'] as String? ?? 'starter.png';
                      final label = b['label'] as String? ?? '';
                      return Opacity(
                        opacity: unlocked ? 1.0 : 0.38,
                        child: Container(
                          width: 82.0,
                          padding: const EdgeInsets.all(8.0),
                          decoration: BoxDecoration(
                            color: unlocked
                                ? AqaTheme.primarySky.withValues(alpha: 0.14)
                                : AqaTheme.surfaceDark,
                            borderRadius: BorderRadius.circular(12.0),
                            border: Border.all(
                              color: unlocked ? AqaTheme.accentTeal : AqaTheme.borderSubtle,
                            ),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 38.0,
                                height: 38.0,
                                child: Image.asset(
                                  'assets/images/badges/$asset',
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, __, ___) => const Icon(
                                    Icons.workspace_premium,
                                    color: AqaTheme.accentTeal,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6.0),
                              Text(
                                label,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: unlocked ? AqaTheme.textPrimary : AqaTheme.textMuted,
                                  fontSize: 10.0,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 20.0),
              ],

              // Reviews Section
              Text(
                'Historique des Evaluations (${reviews.length})',
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 15.0,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10.0),

              if (reviews.isEmpty)
                Container(
                  padding: const EdgeInsets.all(32.0),
                  decoration: BoxDecoration(
                    color: AqaTheme.surfaceDark,
                    borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                    border: Border.all(color: AqaTheme.borderSubtle),
                  ),
                  child: const Center(
                    child: Column(
                      children: [
                        Icon(
                          Icons.assessment_outlined,
                          color: AqaTheme.textLightMuted,
                          size: 36.0,
                        ),
                        SizedBox(height: 10.0),
                        Text(
                          'Aucune evaluation technique enregistree',
                          style: TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 13.0,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        SizedBox(height: 4.0),
                        Text(
                          'Enregistrez une evaluation pour suivre la progression technique et debloquer les badges AQA.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ...reviews.map((rev) => _buildReviewCard(rev)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatMetric(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(color: color, fontSize: 16.0, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 2.0),
        Text(
          label,
          style: const TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.0),
        ),
      ],
    );
  }

  Widget _buildReviewCard(TechReviewModel rev) {
    final dateStr =
        rev.createdAt.length >= 10 ? rev.createdAt.substring(0, 10) : rev.createdAt;

    return Container(
      margin: const EdgeInsets.only(bottom: 12.0),
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
                dateStr,
                style: const TextStyle(
                  color: AqaTheme.accentTeal,
                  fontSize: 13.0,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                decoration: BoxDecoration(
                  color: AqaTheme.statusInfoBg,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                  border: Border.all(color: AqaTheme.primarySky),
                ),
                child: Text(
                  rev.overallLevel.toUpperCase(),
                  style: const TextStyle(
                    color: AqaTheme.primarySky,
                    fontSize: 10.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4.0),
          Text(
            'Evaluateur: ${rev.coachName}',
            style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
          ),
          if (rev.evaluatorNotes != null && rev.evaluatorNotes!.isNotEmpty) ...[
            const SizedBox(height: 8.0),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10.0),
              decoration: BoxDecoration(
                color: AqaTheme.surfaceSecondary,
                borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
              ),
              child: Text(
                rev.evaluatorNotes!,
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 12.0,
                ),
              ),
            ),
          ],
          if (rev.improvements != null && rev.improvements!.isNotEmpty) ...[
            const SizedBox(height: 6.0),
            Text(
              'Axes de travail: ${rev.improvements}',
              style: const TextStyle(color: AqaTheme.statusWarning, fontSize: 11.5),
            ),
          ],
          if (rev.nextGoals != null && rev.nextGoals!.isNotEmpty) ...[
            const SizedBox(height: 4.0),
            Text(
              'Objectifs: ${rev.nextGoals}',
              style: const TextStyle(color: AqaTheme.accentTeal, fontSize: 11.5),
            ),
          ],
          if (rev.skills.isNotEmpty) ...[
            const SizedBox(height: 12.0),
            const Divider(),
            const SizedBox(height: 8.0),
            Wrap(
              spacing: 8.0,
              runSpacing: 6.0,
              children: rev.skills.entries.map((entry) {
                final val = entry.value;
                final score = val is Map ? (val['score'] ?? 0) : val;
                final label = val is Map && val['label'] != null
                    ? val['label'].toString()
                    : entry.key;
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
                  decoration: BoxDecoration(
                    color: AqaTheme.surfaceSecondary,
                    borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        label,
                        style: const TextStyle(color: AqaTheme.textMuted, fontSize: 11.0),
                      ),
                      const SizedBox(width: 6.0),
                      Text(
                        '$score / 4',
                        style: const TextStyle(
                          color: AqaTheme.accentTeal,
                          fontSize: 11.0,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }
}
