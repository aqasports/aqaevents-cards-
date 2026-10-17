import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/models/swim_member.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/theme/aqa_theme.dart';

class SuiviTechHubScreen extends ConsumerStatefulWidget {
  const SuiviTechHubScreen({super.key});

  @override
  ConsumerState<SuiviTechHubScreen> createState() => _SuiviTechHubScreenState();
}

class _SuiviTechHubScreenState extends ConsumerState<SuiviTechHubScreen> {
  String _selectedStageFilter = 'ALL';
  String _selectedGroupFilter = 'ALL';
  String _searchQuery = '';

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
          final rawSwimmers = data.swimmers;
          final isAssistant = data.coach.isAssistant;

          final allSwimmers = rawSwimmers
              .map((s) => SwimMemberModel.fromJson(s))
              .toList();

          final groupOptions = {
            'ALL',
            ...allSwimmers
                .map((s) => s.category.toUpperCase())
                .where((c) => c.isNotEmpty),
          };

          String normalizeStage(String sKey) {
            final l = sKey.toLowerCase();
            if (l == 'elephant') return 'basics';
            if (l == 'crocodile') return 'crawl';
            if (l == 'dauphin') return 'backstroke';
            if (l == 'requin') return 'elite';
            return l;
          }

          final filtered = allSwimmers.where((s) {
            final normKey = normalizeStage(s.stageKey);
            final matchesStage = _selectedStageFilter == 'ALL' ||
                normKey == _selectedStageFilter.toLowerCase();
            final matchesGroup = _selectedGroupFilter == 'ALL' ||
                s.category.toUpperCase() == _selectedGroupFilter;
            final query = _searchQuery.toLowerCase();
            final matchesQuery = query.isEmpty ||
                s.fullName.toLowerCase().contains(query) ||
                s.swimId.toLowerCase().contains(query) ||
                s.badgeLabel.toLowerCase().contains(query) ||
                s.stageLabel.toLowerCase().contains(query);
            return matchesStage && matchesGroup && matchesQuery;
          }).toList();

          final basicsCount = allSwimmers
              .where((s) => normalizeStage(s.stageKey) == 'basics')
              .length;
          final crawlCount = allSwimmers
              .where((s) => normalizeStage(s.stageKey) == 'crawl')
              .length;
          final backstrokeCount = allSwimmers
              .where((s) => normalizeStage(s.stageKey) == 'backstroke')
              .length;
          final breaststrokeCount = allSwimmers
              .where((s) => normalizeStage(s.stageKey) == 'breaststroke')
              .length;
          final butterflyCount = allSwimmers
              .where((s) => normalizeStage(s.stageKey) == 'butterfly')
              .length;
          final eliteCount = allSwimmers
              .where((s) => normalizeStage(s.stageKey) == 'elite')
              .length;

          return ListView(
            padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 108.0),
            children: [
              // 1. Hero Section Header
              AqaSectionHeader(
                eyebrow: 'AQA SWIM PEDAGOGIE',
                title: i18n.t('suivi.hub_title'),
                subtitle: i18n.t('suivi.hub_subtitle'),
              ),
              const SizedBox(height: 16.0),

              // 2. 6 Pedagogical Stages Strip
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: [
                    _buildStageMascotCard(
                      stageKey: 'ALL',
                      label: i18n.t('suivi.filter_all'),
                      asset: 'elephant.png',
                      count: allSwimmers.length,
                      color: AqaTheme.accentTeal,
                      isSelected: _selectedStageFilter == 'ALL',
                      i18n: i18n,
                    ),
                    const SizedBox(width: 8.0),
                    _buildStageMascotCard(
                      stageKey: 'basics',
                      label: '1. ${i18n.t('suivi.stage_basics')}',
                      asset: 'elephant.png',
                      count: basicsCount,
                      color: const Color(0xFF38BDF8),
                      isSelected: _selectedStageFilter == 'basics',
                      i18n: i18n,
                    ),
                    const SizedBox(width: 8.0),
                    _buildStageMascotCard(
                      stageKey: 'crawl',
                      label: '2. ${i18n.t('suivi.stage_crawl')}',
                      asset: 'crawler.png',
                      count: crawlCount,
                      color: const Color(0xFF00F2FF),
                      isSelected: _selectedStageFilter == 'crawl',
                      i18n: i18n,
                    ),
                    const SizedBox(width: 8.0),
                    _buildStageMascotCard(
                      stageKey: 'backstroke',
                      label: '3. ${i18n.t('suivi.stage_backstroke')}',
                      asset: 'leaf.png',
                      count: backstrokeCount,
                      color: const Color(0xFF10B981),
                      isSelected: _selectedStageFilter == 'backstroke',
                      i18n: i18n,
                    ),
                    const SizedBox(width: 8.0),
                    _buildStageMascotCard(
                      stageKey: 'breaststroke',
                      label: '4. ${i18n.t('suivi.stage_breaststroke')}',
                      asset: 'brasseur.png',
                      count: breaststrokeCount,
                      color: const Color(0xFFF59E0B),
                      isSelected: _selectedStageFilter == 'breaststroke',
                      i18n: i18n,
                    ),
                    const SizedBox(width: 8.0),
                    _buildStageMascotCard(
                      stageKey: 'butterfly',
                      label: '5. ${i18n.t('suivi.stage_butterfly')}',
                      asset: 'butterfly.png',
                      count: butterflyCount,
                      color: const Color(0xFFA855F7),
                      isSelected: _selectedStageFilter == 'butterfly',
                      i18n: i18n,
                    ),
                    const SizedBox(width: 8.0),
                    _buildStageMascotCard(
                      stageKey: 'elite',
                      label: '6. ${i18n.t('suivi.stage_elite')}',
                      asset: 'requin.png',
                      count: eliteCount,
                      color: const Color(0xFFEF4444),
                      isSelected: _selectedStageFilter == 'elite',
                      i18n: i18n,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16.0),

              // 3. Search and Category Filter
              AqaDoubleBezelCard(
                outerRadius: 14.0,
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  children: [
                    TextField(
                      onChanged: (v) => setState(() => _searchQuery = v.trim()),
                      style: const TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 13.5,
                      ),
                      decoration: InputDecoration(
                        hintText: i18n.t('suivi.search_hint'),
                        prefixIcon: const Icon(
                          Icons.search_rounded,
                          color: AqaTheme.textMuted,
                          size: 19.0,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14.0,
                          vertical: 12.0,
                        ),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(
                                  Icons.clear,
                                  color: AqaTheme.textLightMuted,
                                  size: 18.0,
                                ),
                                onPressed: () =>
                                    setState(() => _searchQuery = ''),
                              )
                            : null,
                      ),
                    ),
                    if (groupOptions.length > 2) ...[
                      const SizedBox(height: 10.0),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        child: Row(
                          children: groupOptions.map((cat) {
                            final isSelected = _selectedGroupFilter == cat;
                            final label = cat == 'ALL'
                                ? i18n.t('common.all_sectors')
                                : cat;
                            return Padding(
                              padding: const EdgeInsets.only(right: 6.0),
                              child: GestureDetector(
                                behavior: HitTestBehavior.opaque,
                                onTap: () =>
                                    setState(() => _selectedGroupFilter = cat),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 180),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 11.0,
                                    vertical: 6.0,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? const Color(0xFF13223D)
                                        : AqaTheme.surfaceRecessed,
                                    borderRadius: BorderRadius.circular(8.0),
                                    border: Border.all(
                                      color: isSelected
                                          ? AqaTheme.primarySkyHover
                                              .withValues(alpha: 0.45)
                                          : AqaTheme.borderSubtle,
                                    ),
                                  ),
                                  child: Text(
                                    label,
                                    style: TextStyle(
                                      color: isSelected
                                          ? AqaTheme.textPrimary
                                          : AqaTheme.textMuted,
                                      fontSize: 11.0,
                                      fontWeight: isSelected
                                          ? FontWeight.w700
                                          : FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 14.0),

              // Summary Count
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    i18n.locale == 'ar'
                        ? '${filtered.length} سباح في النطاق'
                        : i18n.locale == 'en'
                            ? '${filtered.length} Swimmer(s) in scope'
                            : '${filtered.length} Nageur(s) dans le perimetre',
                    style: const TextStyle(
                      color: AqaTheme.textMuted,
                      fontSize: 12.0,
                      fontWeight: FontWeight.w600,
                      fontFeatures: AqaTheme.tabularNums,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8.0,
                      vertical: 3.0,
                    ),
                    decoration: BoxDecoration(
                      color: AqaTheme.primarySky.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6.0),
                      border: Border.all(
                        color: AqaTheme.primarySkyHover.withValues(alpha: 0.30),
                      ),
                    ),
                    child: Text(
                      i18n.t('suivi.badges_title').toUpperCase(),
                      style: const TextStyle(
                        color: AqaTheme.primarySkyHover,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12.0),

              // 4. Swimmers List
              if (filtered.isEmpty)
                AqaDoubleBezelCard(
                  padding: const EdgeInsets.all(36.0),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.search_off_rounded,
                        color: AqaTheme.textLightMuted,
                        size: 38.0,
                      ),
                      const SizedBox(height: 12.0),
                      Text(
                        i18n.t('suivi.no_swimmers_found'),
                        style: const TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 14.0,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6.0),
                      Text(
                        i18n.locale == 'ar'
                            ? 'قم بتعديل معايير البحث أو اختيار مرحلة بيداغوجية أخرى.'
                            : i18n.locale == 'en'
                                ? 'Modify your search or select another pedagogical stage.'
                                : 'Modifiez votre recherche ou selectionnez un autre palier pedagogique.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AqaTheme.textMuted,
                          fontSize: 12.0,
                        ),
                      ),
                    ],
                  ),
                )
              else
                ...filtered.map(
                  (swimmer) => _buildSwimmerSuiviCard(
                    context,
                    swimmer,
                    i18n: i18n,
                    isAssistant: isAssistant,
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStageMascotCard({
    required String stageKey,
    required String label,
    required String asset,
    required int count,
    required Color color,
    required bool isSelected,
    required AppI18n i18n,
  }) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => setState(() => _selectedStageFilter = stageKey),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 9.0),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF13223D)
              : AqaTheme.surfaceRecessed,
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(
            color: isSelected
                ? color.withValues(alpha: 0.65)
                : AqaTheme.borderSubtle,
            width: 1.0,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 32.0,
              height: 32.0,
              padding: const EdgeInsets.all(4.0),
              decoration: BoxDecoration(
                color: AqaTheme.surfaceDark,
                borderRadius: BorderRadius.circular(8.0),
                border: Border.all(color: color.withValues(alpha: 0.35)),
              ),
              child: Image.asset(
                'assets/images/badges/$asset',
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) =>
                    Icon(Icons.pool_rounded, color: color, size: 15.0),
              ),
            ),
            const SizedBox(width: 9.0),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: isSelected ? color : AqaTheme.textPrimary,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  i18n.locale == 'ar'
                      ? '$count سباح'
                      : i18n.locale == 'en'
                          ? '$count swimmers'
                          : '$count nageurs',
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 10.0,
                    fontWeight: FontWeight.w500,
                    fontFeatures: AqaTheme.tabularNums,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSwimmerSuiviCard(
    BuildContext context,
    SwimMemberModel swimmer, {
    required AppI18n i18n,
    required bool isAssistant,
  }) {
    final rateColor = swimmer.attendanceRate >= 80
        ? AqaTheme.statusSuccess
        : swimmer.attendanceRate >= 50
            ? AqaTheme.statusWarning
            : AqaTheme.statusDanger;

    return AqaDoubleBezelCard(
      margin: const EdgeInsets.only(bottom: 12.0),
      outerRadius: 16.0,
      padding: const EdgeInsets.all(15.0),
      onTap: () {
        context.push('/members/${swimmer.id}');
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Badge Icon Container
              Container(
                width: 44.0,
                height: 44.0,
                padding: const EdgeInsets.all(5.0),
                decoration: BoxDecoration(
                  color: AqaTheme.surfaceRecessed,
                  borderRadius: BorderRadius.circular(11.0),
                  border: Border.all(color: AqaTheme.borderSubtle),
                ),
                child: Image.asset(
                  'assets/images/badges/${swimmer.badgeAsset}',
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Icon(
                    Icons.military_tech_rounded,
                    color: AqaTheme.accentTeal,
                    size: 22.0,
                  ),
                ),
              ),
              const SizedBox(width: 12.0),

              // Swimmer Identity & Stage Mascot Pill
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            swimmer.fullName,
                            style: const TextStyle(
                              color: AqaTheme.textPrimary,
                              fontSize: 15.0,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (swimmer.isNewClient) ...[
                          const SizedBox(width: 6.0),
                          const AqaNewClientBadge(compact: true),
                        ],
                        const SizedBox(width: 7.0),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6.0,
                            vertical: 2.0,
                          ),
                          decoration: BoxDecoration(
                            color: AqaTheme.primarySky.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(5.0),
                          ),
                          child: Text(
                            swimmer.category.toUpperCase(),
                            style: const TextStyle(
                              color: AqaTheme.primarySkyHover,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3.0),
                    Row(
                      children: [
                        Image.asset(
                          'assets/images/badges/${swimmer.stageAsset}',
                          width: 13.0,
                          height: 13.0,
                          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                        ),
                        const SizedBox(width: 4.5),
                        Flexible(
                          child: Text(
                            swimmer.stageLabel,
                            style: const TextStyle(
                              color: AqaTheme.accentTeal,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Active Bar Percentage Chip (0% - 200%)
              Builder(
                builder: (_) {
                  final activeBarKey = swimmer.lastTouchedBar;
                  final activePct = swimmer.bars[activeBarKey] ?? 0;
                  final isElite = activePct > 100;
                  final barShortLabel = activeBarKey == 'crawl'
                      ? 'CRAWL'
                      : activeBarKey == 'backstroke'
                          ? 'BACK'
                          : activeBarKey == 'breaststroke'
                              ? 'BREAST'
                              : activeBarKey == 'butterfly'
                                  ? 'FLY'
                                  : 'BASICS';
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10.0,
                      vertical: 5.5,
                    ),
                    decoration: BoxDecoration(
                      color: AqaTheme.surfaceRecessed,
                      borderRadius: BorderRadius.circular(9.0),
                      border: Border.all(
                        color: isElite
                            ? AqaTheme.statusWarning.withValues(alpha: 0.45)
                            : AqaTheme.borderSubtle,
                      ),
                    ),
                    child: Column(
                      children: [
                        Text(
                          '$activePct%',
                          style: TextStyle(
                            color: isElite
                                ? AqaTheme.statusWarning
                                : AqaTheme.accentTeal,
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            fontFeatures: AqaTheme.tabularNums,
                          ),
                        ),
                        Text(
                          barShortLabel,
                          style: const TextStyle(
                            color: AqaTheme.textLightMuted,
                            fontSize: 9.0,
                            fontWeight: FontWeight.w700,
                            fontFeatures: AqaTheme.tabularNums,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 12.0),

          // KPI Strip: Badge Title • Cumulative Distance • Binary Attendance Rate
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 11.0,
              vertical: 8.5,
            ),
            decoration: BoxDecoration(
              color: AqaTheme.surfaceRecessed,
              borderRadius: BorderRadius.circular(9.0),
              border: Border.all(color: AqaTheme.borderSubtle),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.military_tech_outlined,
                      size: 14.0,
                      color: AqaTheme.accentTeal,
                    ),
                    const SizedBox(width: 4.5),
                    Text(
                      swimmer.badgeLabel,
                      style: const TextStyle(
                        color: AqaTheme.textSecondary,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    const Icon(
                      Icons.straighten_rounded,
                      size: 13.5,
                      color: AqaTheme.primarySkyHover,
                    ),
                    const SizedBox(width: 4.0),
                    Text(
                      '${swimmer.totalDistanceMeters} m',
                      style: const TextStyle(
                        color: AqaTheme.textMuted,
                        fontSize: 11.0,
                        fontWeight: FontWeight.w700,
                        fontFeatures: AqaTheme.tabularNums,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Icon(
                      Icons.check_circle_rounded,
                      size: 13.5,
                      color: rateColor,
                    ),
                    const SizedBox(width: 4.0),
                    Text(
                      '${swimmer.attendanceRate}% ${i18n.t('attendance.present')}',
                      style: TextStyle(
                        color: rateColor,
                        fontSize: 11.0,
                        fontWeight: FontWeight.w700,
                        fontFeatures: AqaTheme.tabularNums,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12.0),

          // Action Buttons: Dossier & Radar / Evaluer
          Row(
            children: [
              Expanded(
                child: AqaIslandButton(
                  label: i18n.t('suivi.btn_dossier'),
                  icon: Icons.radar_rounded,
                  compact: true,
                  secondary: true,
                  onPressed: () {
                    context.push('/members/${swimmer.id}');
                  },
                ),
              ),
              if (!isAssistant) ...[
                const SizedBox(width: 10.0),
                Expanded(
                  child: AqaIslandButton(
                    label: i18n.t('suivi.btn_eval'),
                    icon: Icons.rate_review_rounded,
                    compact: true,
                    onPressed: () {
                      context.push('/members/${swimmer.id}/review-form');
                    },
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
