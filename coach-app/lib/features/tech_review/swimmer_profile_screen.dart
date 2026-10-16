import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/i18n/app_i18n.dart';
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
    final i18n = ref.watch(i18nProvider);

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: Text(i18n.t('suivi.title')),
        actions: [
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14.0),
            child: LanguageSwitcherPill(compact: true),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AqaTheme.accentTeal),
            tooltip: i18n.t('common.sync_now'),
            onPressed: () => ref.invalidate(swimmerProfileProvider(memberId)),
          ),
          const SizedBox(width: 4.0),
        ],
      ),
      body: AqaAmbientBackground(
        child: profileAsync.when(
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
                      onPressed: () => ref.invalidate(swimmerProfileProvider(memberId)),
                    ),
                  ],
                ),
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
            final stageLabel = member['stageLabel'] as String? ?? 'Palier 1 - Elephant';
            final stageAsset = member['stageAsset'] as String? ?? 'elephant.png';
            final stageKey = member['stageKey'] as String? ?? 'elephant';
            final avgSkillScore = (member['avgSkillScore'] as num?)?.toDouble() ?? 1.0;

            final categoryAverages = (data['categoryAverages'] as Map<String, dynamic>?) ?? {};
            final latestMeta = (data['latestMeta'] as Map<String, dynamic>?) ?? {};

            // Strictly Binary Attendance (Present vs Absent only)
            final presentCount = (attendanceSummary['present'] as num?)?.toInt() ??
                (member['totalPresences'] as num?)?.toInt() ??
                0;
            final absentCount = (attendanceSummary['absent'] as num?)?.toInt() ??
                (member['totalAbsences'] as num?)?.toInt() ??
                0;
            final attendanceRate = (attendanceSummary['attendanceRate'] as num?)?.toInt() ??
                (member['attendanceRate'] as num?)?.toInt() ??
                100;

            final rateColor = attendanceRate >= 80
                ? AqaTheme.statusSuccess
                : attendanceRate >= 50
                    ? AqaTheme.statusWarning
                    : AqaTheme.statusDanger;

            return ListView(
              padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 36.0),
              children: [
                // 1. Double-Bezel Hero Dossier Header
                AqaDoubleBezelCard(
                  glowing: true,
                  outerRadius: 22.0,
                  padding: const EdgeInsets.all(18.0),
                  child: Column(
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Dual Badge & Mascot Container
                          Stack(
                            clipBehavior: Clip.none,
                            children: [
                              Container(
                                width: 72.0,
                                height: 72.0,
                                padding: const EdgeInsets.all(7.0),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF13203B), Color(0xFF091225)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(18.0),
                                  border: Border.all(color: AqaTheme.accentTeal, width: 1.5),
                                  boxShadow: AqaTheme.tealGlow,
                                ),
                                child: Image.asset(
                                  'assets/images/badges/$badgeAsset',
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, __, ___) => const Icon(
                                    Icons.military_tech_rounded,
                                    color: AqaTheme.accentTeal,
                                    size: 32.0,
                                  ),
                                ),
                              ),
                              Positioned(
                                bottom: -4,
                                right: -4,
                                child: Container(
                                  width: 28.0,
                                  height: 28.0,
                                  padding: const EdgeInsets.all(3.0),
                                  decoration: BoxDecoration(
                                    color: AqaTheme.surfaceDark,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AqaTheme.primarySky, width: 1.5),
                                  ),
                                  child: Image.asset(
                                    'assets/images/badges/$stageAsset',
                                    fit: BoxFit.contain,
                                    errorBuilder: (_, __, ___) => const Icon(
                                      Icons.pets,
                                      size: 14.0,
                                      color: AqaTheme.primarySky,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 16.0),

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
                                    letterSpacing: -0.4,
                                  ),
                                ),
                                const SizedBox(height: 3.0),
                                Text(
                                  currentGroup != null
                                      ? '${currentGroup['name']} • ${(currentGroup['category'] ?? '').toString().toUpperCase()}'
                                      : 'Groupe AQA Swim',
                                  style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                                ),
                                const SizedBox(height: 8.0),
                                Wrap(
                                  spacing: 6.0,
                                  runSpacing: 4.0,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                                      decoration: BoxDecoration(
                                        color: AqaTheme.accentTeal.withValues(alpha: 0.16),
                                        borderRadius: BorderRadius.circular(6.0),
                                        border: Border.all(color: AqaTheme.borderTeal),
                                      ),
                                      child: Text(
                                        badgeLabel.toUpperCase(),
                                        style: const TextStyle(
                                          color: AqaTheme.accentTeal,
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                                      decoration: BoxDecoration(
                                        color: AqaTheme.surfaceSecondary,
                                        borderRadius: BorderRadius.circular(6.0),
                                        border: Border.all(color: AqaTheme.borderSubtle),
                                      ),
                                      child: Text(
                                        stageLabel,
                                        style: const TextStyle(
                                          color: AqaTheme.primarySkyHover,
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w700,
                                        ),
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
                      const SizedBox(height: 12.0),

                      // Strictly Binary Attendance & Score KPI Strip
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildStatMetric(
                            label: i18n.t('attendance.present'),
                            value: '$presentCount',
                            color: AqaTheme.statusSuccess,
                            icon: Icons.check_circle_rounded,
                          ),
                          _buildStatMetric(
                            label: i18n.t('attendance.absent'),
                            value: '$absentCount',
                            color: AqaTheme.statusDanger,
                            icon: Icons.cancel_rounded,
                          ),
                          _buildStatMetric(
                            label: i18n.t('attendance.rate'),
                            value: '$attendanceRate%',
                            color: rateColor,
                            icon: Icons.pie_chart_outline_rounded,
                          ),
                          _buildStatMetric(
                            label: 'Score Moyen',
                            value: '${avgSkillScore.toStringAsFixed(1)} / 5',
                            color: AqaTheme.accentTeal,
                            icon: Icons.speed_rounded,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14.0),

                // Evaluation CTA
                if (canEdit)
                  AqaIslandButton(
                    label: i18n.t('suivi.new_eval_btn'),
                    icon: Icons.rate_review_rounded,
                    onPressed: () {
                      context.push('/members/$memberId/review-form');
                    },
                  )
                else
                  AqaDoubleBezelCard(
                    padding: const EdgeInsets.all(12.0),
                    child: Row(
                      children: [
                        const Icon(Icons.lock_outline_rounded, color: AqaTheme.textLightMuted, size: 16.0),
                        const SizedBox(width: 8.0),
                        Expanded(
                          child: Text(
                            i18n.t('common.view_only'),
                            style: const TextStyle(color: AqaTheme.textMuted, fontSize: 11.5),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 18.0),

                // 2. 5-Axis Biomechanical Radar / Spider Chart
                AqaDoubleBezelCard(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            i18n.t('suivi.radar_title'),
                            style: const TextStyle(
                              color: AqaTheme.textPrimary,
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7.0, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: AqaTheme.accentTeal.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6.0),
                            ),
                            child: const Text(
                              '5 DOMAINES AQA',
                              style: TextStyle(
                                color: AqaTheme.accentTeal,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14.0),

                      // Radar Chart Canvas
                      Center(
                        child: SizedBox(
                          width: 250.0,
                          height: 250.0,
                          child: CustomPaint(
                            painter: _BiomechanicalRadarPainter(
                              scores: [
                                (categoryAverages['water_comfort'] as num?)?.toDouble() ?? 1.0,
                                (categoryAverages['freestyle'] as num?)?.toDouble() ?? 1.0,
                                (categoryAverages['backstroke'] as num?)?.toDouble() ?? 1.0,
                                (categoryAverages['breaststroke'] as num?)?.toDouble() ?? 1.0,
                                (categoryAverages['butterfly_starts'] as num?)?.toDouble() ?? 1.0,
                              ],
                              labels: const ['AISANCE', 'CRAWL', 'DOS', 'BRASSE', 'PAP & VIR.'],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14.0),

                      // Domain Breakdown Progress Bars
                      _buildDomainBar('Aisance & Equilibre', (categoryAverages['water_comfort'] as num?)?.toDouble() ?? 1.0),
                      _buildDomainBar('Crawl (Nage Libre)', (categoryAverages['freestyle'] as num?)?.toDouble() ?? 1.0),
                      _buildDomainBar('Dos Crawle', (categoryAverages['backstroke'] as num?)?.toDouble() ?? 1.0),
                      _buildDomainBar('Brasse', (categoryAverages['breaststroke'] as num?)?.toDouble() ?? 1.0),
                      _buildDomainBar('Papillon, Departs & Virages', (categoryAverages['butterfly_starts'] as num?)?.toDouble() ?? 1.0),
                    ],
                  ),
                ),
                const SizedBox(height: 18.0),

                // 3. 4-Stage Pedagogical Pathway Roadmap
                AqaDoubleBezelCard(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        i18n.t('suivi.mascots_title'),
                        style: const TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 14.0),
                      Row(
                        children: [
                          _buildRoadmapStage('Palier 1', 'Elephant', 'elephant.png', stageKey == 'elephant', 'elephant' == stageKey),
                          _buildRoadmapArrow(),
                          _buildRoadmapStage('Palier 2', 'Crocodile', 'Crocodile.png', stageKey == 'crocodile' || stageKey == 'dauphin' || stageKey == 'requin', stageKey == 'crocodile'),
                          _buildRoadmapArrow(),
                          _buildRoadmapStage('Palier 3', 'Dauphin', 'Dauphin.png', stageKey == 'dauphin' || stageKey == 'requin', stageKey == 'dauphin'),
                          _buildRoadmapArrow(),
                          _buildRoadmapStage('Palier 4', 'Requin', 'Requin.png', stageKey == 'requin', stageKey == 'requin'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18.0),

                // 4. 15 Official AQA Suivi Badges Trophy Grid
                if (earnedBadges.isNotEmpty) ...[
                  AqaDoubleBezelCard(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              i18n.t('suivi.badges_title'),
                              style: const TextStyle(
                                color: AqaTheme.textPrimary,
                                fontSize: 14.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            Text(
                              '${earnedBadges.where((b) => b['unlocked'] == true).length} / ${earnedBadges.length} acquis',
                              style: const TextStyle(
                                color: AqaTheme.accentTeal,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14.0),
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            childAspectRatio: 0.95,
                            crossAxisSpacing: 8.0,
                            mainAxisSpacing: 8.0,
                          ),
                          itemCount: earnedBadges.length,
                          itemBuilder: (ctx, idx) {
                            final b = earnedBadges[idx] as Map<String, dynamic>;
                            final unlocked = b['unlocked'] as bool? ?? false;
                            final asset = b['asset'] as String? ?? b['assetName'] as String? ?? 'starter.png';
                            final label = b['labelFr'] as String? ?? b['label'] as String? ?? '';
                            final minScore = (b['minScore'] as num?)?.toDouble() ?? 1.0;

                            return Container(
                              padding: const EdgeInsets.all(8.0),
                              decoration: BoxDecoration(
                                color: unlocked
                                    ? AqaTheme.primarySky.withValues(alpha: 0.12)
                                    : const Color(0xFF070C18),
                                borderRadius: BorderRadius.circular(12.0),
                                border: Border.all(
                                  color: unlocked ? AqaTheme.accentTeal : AqaTheme.borderSubtle,
                                  width: unlocked ? 1.4 : 1.0,
                                ),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Opacity(
                                    opacity: unlocked ? 1.0 : 0.28,
                                    child: SizedBox(
                                      width: 38.0,
                                      height: 38.0,
                                      child: Image.asset(
                                        'assets/images/badges/$asset',
                                        fit: BoxFit.contain,
                                        errorBuilder: (_, __, ___) => Icon(
                                          Icons.military_tech_rounded,
                                          color: unlocked ? AqaTheme.accentTeal : AqaTheme.textLightMuted,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 6.0),
                                  Text(
                                    label,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: unlocked ? AqaTheme.textPrimary : AqaTheme.textLightMuted,
                                      fontSize: 10.0,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Text(
                                    '>= ${minScore.toStringAsFixed(1)}',
                                    style: TextStyle(
                                      color: unlocked ? AqaTheme.accentTeal : AqaTheme.textLightMuted,
                                      fontSize: 8.5,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18.0),
                ],

                // 5. Timed Sprints & Aquatic Metrics (if present in latest review)
                if (latestMeta.isNotEmpty &&
                    (latestMeta['chrono25mFreestyle'] != null ||
                        latestMeta['chrono50mFreestyle'] != null ||
                        latestMeta['maxDistanceMeters'] != null)) ...[
                  AqaDoubleBezelCard(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          i18n.t('suivi.metrics_title'),
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 12.0),
                        Row(
                          children: [
                            if (latestMeta['chrono25mFreestyle'] != null)
                              Expanded(
                                child: _buildMetricTile(
                                  'Chrono 25m Crawl',
                                  '${latestMeta['chrono25mFreestyle']} s',
                                  Icons.timer_outlined,
                                  AqaTheme.accentTeal,
                                ),
                              ),
                            if (latestMeta['chrono50mFreestyle'] != null) ...[
                              const SizedBox(width: 8.0),
                              Expanded(
                                child: _buildMetricTile(
                                  'Chrono 50m Crawl',
                                  '${latestMeta['chrono50mFreestyle']} s',
                                  Icons.timer,
                                  AqaTheme.primarySky,
                                ),
                              ),
                            ],
                            if (latestMeta['maxDistanceMeters'] != null) ...[
                              const SizedBox(width: 8.0),
                              Expanded(
                                child: _buildMetricTile(
                                  'Distance Continue',
                                  '${latestMeta['maxDistanceMeters']} m',
                                  Icons.straighten_rounded,
                                  AqaTheme.statusSuccess,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18.0),
                ],

                // 6. Complete Evaluation History Timeline
                Text(
                  i18n.t('suivi.history_title', {'count': reviews.length}),
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 15.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10.0),

                if (reviews.isEmpty)
                  AqaDoubleBezelCard(
                    padding: const EdgeInsets.all(32.0),
                    child: const Center(
                      child: Column(
                        children: [
                          Icon(Icons.assessment_outlined, color: AqaTheme.textLightMuted, size: 36.0),
                          SizedBox(height: 10.0),
                          Text(
                            'Aucune evaluation technique enregistree',
                            style: TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0, fontWeight: FontWeight.w600),
                          ),
                          SizedBox(height: 4.0),
                          Text(
                            'Enregistrez une evaluation pour tracer le profil radar et debloquer les badges AQA.',
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
      ),
    );
  }

  Widget _buildStatMetric({
    required String label,
    required String value,
    required Color color,
    required IconData icon,
  }) {
    return Column(
      children: [
        Icon(icon, color: color, size: 16.0),
        const SizedBox(height: 4.0),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 15.0,
            fontWeight: FontWeight.w800,
            fontFamily: 'monospace',
          ),
        ),
        const SizedBox(height: 2.0),
        Text(
          label,
          style: const TextStyle(color: AqaTheme.textLightMuted, fontSize: 10.5, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _buildDomainBar(String label, double score) {
    final pct = (score / 5.0).clamp(0.0, 1.0);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 11.5, fontWeight: FontWeight.w700)),
              Text(
                '${score.toStringAsFixed(1)} / 5.0',
                style: const TextStyle(color: AqaTheme.accentTeal, fontSize: 11.0, fontFamily: 'monospace', fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 4.0),
          ClipRRect(
            borderRadius: BorderRadius.circular(4.0),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 5.0,
              backgroundColor: AqaTheme.surfaceSecondary,
              valueColor: const AlwaysStoppedAnimation<Color>(AqaTheme.accentTeal),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoadmapStage(String stageOrder, String name, String asset, bool reached, bool active) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 38.0,
            height: 38.0,
            padding: const EdgeInsets.all(4.0),
            decoration: BoxDecoration(
              color: active ? AqaTheme.accentTeal.withValues(alpha: 0.2) : const Color(0xFF0A1122),
              shape: BoxShape.circle,
              border: Border.all(
                color: active
                    ? AqaTheme.accentTeal
                    : reached
                        ? AqaTheme.primarySky
                        : AqaTheme.borderSubtle,
                width: active ? 2.0 : 1.0,
              ),
            ),
            child: Image.asset(
              'assets/images/badges/$asset',
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => const Icon(Icons.pets, size: 16.0, color: AqaTheme.textLightMuted),
            ),
          ),
          const SizedBox(height: 4.0),
          Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: active ? AqaTheme.accentTeal : reached ? AqaTheme.textPrimary : AqaTheme.textLightMuted,
              fontSize: 10.0,
              fontWeight: active ? FontWeight.w800 : FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoadmapArrow() {
    return const Icon(Icons.chevron_right_rounded, color: AqaTheme.textLightMuted, size: 16.0);
  }

  Widget _buildMetricTile(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(10.0),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10.0),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 16.0),
          const SizedBox(height: 6.0),
          Text(
            value,
            style: TextStyle(color: color, fontSize: 14.0, fontWeight: FontWeight.w800, fontFamily: 'monospace'),
          ),
          const SizedBox(height: 2.0),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AqaTheme.textMuted, fontSize: 9.5)),
        ],
      ),
    );
  }

  Widget _buildReviewCard(TechReviewModel rev) {
    final dateStr = rev.createdAt.length >= 10 ? rev.createdAt.substring(0, 10) : rev.createdAt;

    return AqaDoubleBezelCard(
      margin: const EdgeInsets.only(bottom: 12.0),
      padding: const EdgeInsets.all(14.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(dateStr, style: const TextStyle(color: AqaTheme.accentTeal, fontSize: 13.0, fontWeight: FontWeight.w800)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                decoration: BoxDecoration(
                  color: AqaTheme.statusInfoBg,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                  border: Border.all(color: AqaTheme.primarySky),
                ),
                child: Text(
                  rev.overallLevel.toUpperCase(),
                  style: const TextStyle(color: AqaTheme.primarySky, fontSize: 10.0, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4.0),
          Text('Evaluateur: ${rev.coachName}', style: const TextStyle(color: AqaTheme.textMuted, fontSize: 11.5)),
          if (rev.evaluatorNotes != null && rev.evaluatorNotes!.isNotEmpty) ...[
            const SizedBox(height: 8.0),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10.0),
              decoration: BoxDecoration(
                color: const Color(0xFF070C18),
                borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
              ),
              child: Text(rev.evaluatorNotes!, style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 12.0)),
            ),
          ],
          if (rev.skills.isNotEmpty) ...[
            const SizedBox(height: 10.0),
            Wrap(
              spacing: 6.0,
              runSpacing: 4.0,
              children: rev.skills.entries.map((entry) {
                final val = entry.value;
                final score = val is Map ? (val['score'] ?? 0) : val;
                final label = val is Map && val['label'] != null ? val['label'].toString() : entry.key;
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7.0, vertical: 3.0),
                  decoration: BoxDecoration(
                    color: AqaTheme.surfaceSecondary,
                    borderRadius: BorderRadius.circular(6.0),
                  ),
                  child: Text('$label : $score/5', style: const TextStyle(color: AqaTheme.textMuted, fontSize: 10.5)),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }
}

/// CustomPainter for 5-Axis Biomechanical Radar / Spider Chart
class _BiomechanicalRadarPainter extends CustomPainter {
  final List<double> scores; // 5 scores from 1.0 to 5.0
  final List<String> labels;

  _BiomechanicalRadarPainter({required this.scores, required this.labels});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (math.min(size.width, size.height) / 2) - 30.0;
    const numSides = 5;
    const angleStep = (2 * math.pi) / numSides;
    const startAngle = -math.pi / 2; // top center

    final gridPaint = Paint()
      ..color = const Color(0x24FFFFFF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final axisPaint = Paint()
      ..color = const Color(0x3300F2FF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    // Draw 5 concentric web polygons (levels 1 to 5)
    for (int step = 1; step <= 5; step++) {
      final r = radius * (step / 5.0);
      final path = Path();
      for (int i = 0; i < numSides; i++) {
        final angle = startAngle + (i * angleStep);
        final x = center.dx + r * math.cos(angle);
        final y = center.dy + r * math.sin(angle);
        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      path.close();
      canvas.drawPath(path, gridPaint);
    }

    // Draw radial axes and labels
    for (int i = 0; i < numSides; i++) {
      final angle = startAngle + (i * angleStep);
      final endX = center.dx + radius * math.cos(angle);
      final endY = center.dy + radius * math.sin(angle);
      canvas.drawLine(center, Offset(endX, endY), axisPaint);

      // Label
      final labelX = center.dx + (radius + 18.0) * math.cos(angle);
      final labelY = center.dy + (radius + 18.0) * math.sin(angle);
      final textSpan = TextSpan(
        text: labels[i],
        style: const TextStyle(
          color: Color(0xFF94A3B8),
          fontSize: 9.0,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.3,
        ),
      );
      final textPainter = TextPainter(
        text: textSpan,
        textAlign: TextAlign.center,
        textDirection: TextDirection.ltr,
      )..layout();
      textPainter.paint(
        canvas,
        Offset(labelX - (textPainter.width / 2), labelY - (textPainter.height / 2)),
      );
    }

    // Draw user score filled polygon
    final polyPath = Path();
    for (int i = 0; i < numSides; i++) {
      final s = scores.length > i ? (scores[i] / 5.0).clamp(0.2, 1.0) : 0.2;
      final r = radius * s;
      final angle = startAngle + (i * angleStep);
      final x = center.dx + r * math.cos(angle);
      final y = center.dy + r * math.sin(angle);
      if (i == 0) {
        polyPath.moveTo(x, y);
      } else {
        polyPath.lineTo(x, y);
      }
    }
    polyPath.close();

    final fillPaint = Paint()
      ..color = const Color(0x3D00F2FF)
      ..style = PaintingStyle.fill;
    final strokePaint = Paint()
      ..color = const Color(0xFF00F2FF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    canvas.drawPath(polyPath, fillPaint);
    canvas.drawPath(polyPath, strokePaint);

    // Points on polygon vertices
    final vertexPaint = Paint()..color = Colors.white;
    for (int i = 0; i < numSides; i++) {
      final s = scores.length > i ? (scores[i] / 5.0).clamp(0.2, 1.0) : 0.2;
      final r = radius * s;
      final angle = startAngle + (i * angleStep);
      final x = center.dx + r * math.cos(angle);
      final y = center.dy + r * math.sin(angle);
      canvas.drawCircle(Offset(x, y), 3.0, vertexPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _BiomechanicalRadarPainter oldDelegate) => true;
}
