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
  String _selectedStageFilter = 'ALL'; // ALL | elephant | crocodile | dauphin | requin
  String _selectedGroupFilter = 'ALL';
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final bootstrapAsync = ref.watch(bootstrapProvider);
    final i18n = ref.watch(i18nProvider);

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      body: AqaAmbientBackground(
        child: RefreshIndicator(
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
              final rawSwimmers = data.swimmers;
              final isAssistant = data.coach.isAssistant;

              // Convert to SwimMemberModel instances
              final allSwimmers = rawSwimmers
                  .map((s) => SwimMemberModel.fromJson(s))
                  .toList();

              // Unique groups for filtering
              final groupOptions = {
                'ALL',
                ...allSwimmers.map((s) => s.category.toUpperCase()).where((c) => c.isNotEmpty),
              };

              // Filtered list
              final filtered = allSwimmers.where((s) {
                final matchesStage = _selectedStageFilter == 'ALL' ||
                    s.stageKey.toLowerCase() == _selectedStageFilter.toLowerCase();
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

              // Stage counts for stage mascot cards
              final elephantCount = allSwimmers.where((s) => s.stageKey == 'elephant').length;
              final crocodileCount = allSwimmers.where((s) => s.stageKey == 'crocodile').length;
              final dauphinCount = allSwimmers.where((s) => s.stageKey == 'dauphin').length;
              final requinCount = allSwimmers.where((s) => s.stageKey == 'requin').length;

              return ListView(
                padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 32.0),
                children: [
                  // 1. Hero Section Header
                  AqaSectionHeader(
                    eyebrow: 'AQA SWIM PEDAGOGIE',
                    title: i18n.t('suivi.hub_title'),
                    subtitle: i18n.t('suivi.hub_subtitle'),
                  ),
                  const SizedBox(height: 16.0),

                  // 2. 4 Stage Mascots Strip (Elephant, Crocodile, Dauphin, Requin)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildStageMascotCard(
                          stageKey: 'ALL',
                          label: 'Tous les Paliers',
                          asset: 'elephant.png',
                          count: allSwimmers.length,
                          color: AqaTheme.accentTeal,
                          isSelected: _selectedStageFilter == 'ALL',
                        ),
                        const SizedBox(width: 8.0),
                        _buildStageMascotCard(
                          stageKey: 'elephant',
                          label: 'Palier 1 - Elephant',
                          asset: 'elephant.png',
                          count: elephantCount,
                          color: const Color(0xFF38BDF8),
                          isSelected: _selectedStageFilter == 'elephant',
                        ),
                        const SizedBox(width: 8.0),
                        _buildStageMascotCard(
                          stageKey: 'crocodile',
                          label: 'Palier 2 - Crocodile',
                          asset: 'Crocodile.png',
                          count: crocodileCount,
                          color: const Color(0xFF10B981),
                          isSelected: _selectedStageFilter == 'crocodile',
                        ),
                        const SizedBox(width: 8.0),
                        _buildStageMascotCard(
                          stageKey: 'dauphin',
                          label: 'Palier 3 - Dauphin',
                          asset: 'Dauphin.png',
                          count: dauphinCount,
                          color: const Color(0xFF00F2FF),
                          isSelected: _selectedStageFilter == 'dauphin',
                        ),
                        const SizedBox(width: 8.0),
                        _buildStageMascotCard(
                          stageKey: 'requin',
                          label: 'Palier 4 - Requin',
                          asset: 'Requin.png',
                          count: requinCount,
                          color: const Color(0xFFF59E0B),
                          isSelected: _selectedStageFilter == 'requin',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16.0),

                  // 3. Search and Category Filter
                  AqaDoubleBezelCard(
                    outerRadius: 18.0,
                    padding: const EdgeInsets.all(12.0),
                    child: Column(
                      children: [
                        TextField(
                          onChanged: (v) => setState(() => _searchQuery = v.trim()),
                          style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.5),
                          decoration: InputDecoration(
                            hintText: 'Rechercher un nageur, badge, matricule...',
                            prefixIcon: const Icon(Icons.search_rounded, color: AqaTheme.accentTeal),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                            suffixIcon: _searchQuery.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear, color: AqaTheme.textLightMuted, size: 18.0),
                                    onPressed: () => setState(() => _searchQuery = ''),
                                  )
                                : null,
                          ),
                        ),
                        if (groupOptions.length > 2) ...[
                          const SizedBox(height: 10.0),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: groupOptions.map((cat) {
                                final isSelected = _selectedGroupFilter == cat;
                                return Padding(
                                  padding: const EdgeInsets.only(right: 6.0),
                                  child: ChoiceChip(
                                    label: Text(
                                      cat == 'ALL' ? i18n.t('common.all_sectors') : cat,
                                      style: const TextStyle(fontSize: 10.5),
                                    ),
                                    selected: isSelected,
                                    onSelected: (_) => setState(() => _selectedGroupFilter = cat),
                                    selectedColor: AqaTheme.primarySky,
                                    backgroundColor: AqaTheme.surfaceSecondary,
                                    labelStyle: TextStyle(
                                      color: isSelected ? Colors.white : AqaTheme.textMuted,
                                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
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
                        '${filtered.length} Nageur${filtered.length > 1 ? 's' : ''} dans le perimetre',
                        style: const TextStyle(
                          color: AqaTheme.textMuted,
                          fontSize: 12.0,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                        decoration: BoxDecoration(
                          color: AqaTheme.accentTeal.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                          border: Border.all(color: AqaTheme.borderTeal),
                        ),
                        child: const Text(
                          '15 BADGES OFFICIELS',
                          style: TextStyle(
                            color: AqaTheme.accentTeal,
                            fontSize: 9.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
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
                          const Icon(Icons.search_off_rounded, color: AqaTheme.textLightMuted, size: 40.0),
                          const SizedBox(height: 12.0),
                          const Text(
                            'Aucun nageur ne correspond aux filtres.',
                            style: TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 6.0),
                          const Text(
                            'Modifiez votre recherche ou selectionnez un autre palier pedagogique.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                          ),
                        ],
                      ),
                    )
                  else
                    ...filtered.map((swimmer) => _buildSwimmerSuiviCard(context, swimmer, isAssistant: isAssistant)),
                ],
              );
            },
          ),
        ),
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
  }) {
    return InkWell(
      onTap: () => setState(() => _selectedStageFilter = stageKey),
      borderRadius: BorderRadius.circular(16.0),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.18) : const Color(0xFF090F1E),
          borderRadius: BorderRadius.circular(16.0),
          border: Border.all(
            color: isSelected ? color : AqaTheme.borderSubtle,
            width: isSelected ? 1.6 : 1.0,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: color.withValues(alpha: 0.25),
                    blurRadius: 12.0,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 34.0,
              height: 34.0,
              padding: const EdgeInsets.all(4.0),
              decoration: BoxDecoration(
                color: AqaTheme.surfaceDark,
                shape: BoxShape.circle,
                border: Border.all(color: color.withValues(alpha: 0.5)),
              ),
              child: Image.asset(
                'assets/images/badges/$asset',
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Icon(Icons.pets, color: color, size: 16.0),
              ),
            ),
            const SizedBox(width: 8.0),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: isSelected ? color : AqaTheme.textPrimary,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  '$count nageurs',
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 10.0,
                    fontWeight: FontWeight.w600,
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
    required bool isAssistant,
  }) {
    final rateColor = swimmer.attendanceRate >= 80
        ? AqaTheme.statusSuccess
        : swimmer.attendanceRate >= 50
            ? AqaTheme.statusWarning
            : AqaTheme.statusDanger;

    return AqaDoubleBezelCard(
      margin: const EdgeInsets.only(bottom: 12.0),
      outerRadius: 18.0,
      padding: const EdgeInsets.all(14.0),
      onTap: () {
        context.push('/members/${swimmer.id}');
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Badge Icon with Glowing Container
              Container(
                width: 46.0,
                height: 46.0,
                padding: const EdgeInsets.all(5.0),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF13203B), Color(0xFF0A1325)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14.0),
                  border: Border.all(color: AqaTheme.borderTeal),
                  boxShadow: [
                    BoxShadow(
                      color: AqaTheme.accentTeal.withValues(alpha: 0.12),
                      blurRadius: 10.0,
                    ),
                  ],
                ),
                child: Image.asset(
                  'assets/images/badges/${swimmer.badgeAsset}',
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Icon(
                    Icons.military_tech_rounded,
                    color: AqaTheme.accentTeal,
                    size: 24.0,
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
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.2,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6.0),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
                          decoration: BoxDecoration(
                            color: AqaTheme.surfaceSecondary,
                            borderRadius: BorderRadius.circular(4.0),
                            border: Border.all(color: AqaTheme.borderSubtle),
                          ),
                          child: Text(
                            swimmer.category.toUpperCase(),
                            style: const TextStyle(
                              color: AqaTheme.primarySky,
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
                          width: 14.0,
                          height: 14.0,
                          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                        ),
                        const SizedBox(width: 4.0),
                        Flexible(
                          child: Text(
                            swimmer.stageLabel,
                            style: const TextStyle(
                              color: AqaTheme.accentTeal,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Score Chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9.0, vertical: 5.0),
                decoration: BoxDecoration(
                  color: AqaTheme.surfaceSecondary,
                  borderRadius: BorderRadius.circular(10.0),
                  border: Border.all(color: AqaTheme.borderMedium),
                ),
                child: Column(
                  children: [
                    Text(
                      swimmer.avgSkillScore > 0 ? '${swimmer.avgSkillScore}' : '1.0',
                      style: const TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 14.0,
                        fontWeight: FontWeight.w800,
                        fontFamily: 'monospace',
                      ),
                    ),
                    const Text(
                      '/ 5.0',
                      style: TextStyle(
                        color: AqaTheme.textLightMuted,
                        fontSize: 9.0,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12.0),

          // KPI Strip: Badge Title • Evaluations • Binary Attendance Rate
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
            decoration: BoxDecoration(
              color: const Color(0xFF070C18),
              borderRadius: BorderRadius.circular(10.0),
              border: Border.all(color: AqaTheme.borderSubtle),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.military_tech_outlined, size: 14.0, color: AqaTheme.accentTeal),
                    const SizedBox(width: 4.0),
                    Text(
                      'Badge : ${swimmer.badgeLabel}',
                      style: const TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    const Icon(Icons.history_rounded, size: 14.0, color: AqaTheme.textLightMuted),
                    const SizedBox(width: 4.0),
                    Text(
                      '${swimmer.reviewCount} eval${swimmer.reviewCount > 1 ? 's' : ''}',
                      style: const TextStyle(color: AqaTheme.textMuted, fontSize: 11.0),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Icon(Icons.check_circle_rounded, size: 14.0, color: rateColor),
                    const SizedBox(width: 4.0),
                    Text(
                      '${swimmer.attendanceRate}% present',
                      style: TextStyle(
                        color: rateColor,
                        fontSize: 11.0,
                        fontWeight: FontWeight.w800,
                        fontFamily: 'monospace',
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
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 36.0),
                    padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
                    visualDensity: VisualDensity.compact,
                    side: const BorderSide(color: AqaTheme.borderMedium),
                  ),
                  onPressed: () {
                    context.push('/members/${swimmer.id}');
                  },
                  icon: const Icon(Icons.radar_rounded, size: 15.0, color: AqaTheme.accentTeal),
                  label: const Text(
                    'Dossier & Radar',
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              if (!isAssistant) ...[
                const SizedBox(width: 8.0),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(0, 36.0),
                      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: () {
                      context.push('/members/${swimmer.id}/review-form');
                    },
                    icon: const Icon(Icons.rate_review_rounded, size: 15.0),
                    label: const Text(
                      'Evaluer',
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800),
                    ),
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
