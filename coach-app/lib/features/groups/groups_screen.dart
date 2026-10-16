import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/models/swim_group.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/theme/aqa_theme.dart';

class GroupsScreen extends ConsumerStatefulWidget {
  const GroupsScreen({super.key});

  @override
  ConsumerState<GroupsScreen> createState() => _GroupsScreenState();
}

class _GroupsScreenState extends ConsumerState<GroupsScreen> {
  String _selectedCategory = 'ALL';
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final bootstrapAsync = ref.watch(bootstrapProvider);
    final i18n = ref.watch(i18nProvider);

    return AqaAmbientBackground(
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
            final allGroups = data.groups;
            final categories = {
              'ALL',
              ...allGroups.map((g) => g.category.toUpperCase()).where((c) => c.isNotEmpty),
            };

            final filtered = allGroups.where((g) {
              final matchesCat =
                  _selectedCategory == 'ALL' || g.category.toUpperCase() == _selectedCategory;
              final matchesQuery = _searchQuery.isEmpty ||
                  g.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                  g.pool.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                  g.category.toLowerCase().contains(_searchQuery.toLowerCase());
              return matchesCat && matchesQuery;
            }).toList();

            final totalSwimmers = filtered.fold<int>(0, (acc, g) => acc + g.activeMembersCount);

            return ListView(
              padding: const EdgeInsets.fromLTRB(16.0, 14.0, 16.0, 110.0),
              children: [
                // Search Input with Double Bezel styling
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val.trim()),
                  style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.5),
                  decoration: InputDecoration(
                    hintText: i18n.t('groups.search_hint'),
                    prefixIcon: const Icon(Icons.search_rounded, color: AqaTheme.accentTeal, size: 20.0),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: AqaTheme.textLightMuted, size: 18.0),
                            onPressed: () => setState(() => _searchQuery = ''),
                          )
                        : null,
                  ),
                ),
                const SizedBox(height: 12.0),

                // Luxury Categories Filter Pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: categories.map((cat) {
                      final isSelected = _selectedCategory == cat;
                      final catLabel = cat == 'ALL' ? i18n.t('common.all_sectors') : cat;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedCategory = cat),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            curve: Curves.easeOutCubic,
                            padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 7.5),
                            decoration: BoxDecoration(
                              gradient: isSelected
                                  ? const LinearGradient(
                                      colors: [Color(0xFF0EA5E9), Color(0xFF00F2FF)],
                                    )
                                  : null,
                              color: isSelected ? null : const Color(0xFF090F1E),
                              borderRadius: BorderRadius.circular(999.0),
                              border: Border.all(
                                color: isSelected
                                    ? AqaTheme.accentTeal
                                    : Colors.white.withValues(alpha: 0.10),
                                width: 1.0,
                              ),
                              boxShadow: isSelected
                                  ? const [
                                      BoxShadow(
                                        color: Color(0x3300F2FF),
                                        blurRadius: 8.0,
                                        offset: Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Text(
                              catLabel,
                              style: TextStyle(
                                color: isSelected ? const Color(0xFF030712) : const Color(0xFF94A3B8),
                                fontSize: 11.5,
                                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 14.0),

                // Summary Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      i18n.t('groups.count_summary', {
                        'count': filtered.length,
                        'swimmers': totalSwimmers,
                      }),
                      style: const TextStyle(
                        color: AqaTheme.textMuted,
                        fontSize: 12.0,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (data.coach.isHeadCoach)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                        decoration: BoxDecoration(
                          color: AqaTheme.statusWarningBg,
                          borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                          border: Border.all(color: AqaTheme.statusWarning.withValues(alpha: 0.5)),
                        ),
                        child: Text(
                          i18n.t('auth.role_head_sub').toUpperCase(),
                          style: const TextStyle(
                            color: AqaTheme.statusWarning,
                            fontSize: 10.0,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12.0),

                if (filtered.isEmpty)
                  AqaDoubleBezelCard(
                    padding: const EdgeInsets.all(32.0),
                    child: Center(
                      child: Column(
                        children: [
                          const Icon(Icons.groups_outlined, color: AqaTheme.textLightMuted, size: 36.0),
                          const SizedBox(height: 10.0),
                          Text(
                            i18n.t('groups.no_groups_found'),
                            style: const TextStyle(
                              color: AqaTheme.textPrimary,
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4.0),
                          Text(
                            i18n.t('groups.no_groups_sub'),
                            style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...filtered.map((group) => _buildGroupCard(context, group, i18n)),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildGroupCard(BuildContext context, SwimGroupModel group, AppI18n i18n) {
    final fillRatio = group.capacity > 0
        ? (group.activeMembersCount / group.capacity).clamp(0.0, 1.0)
        : 0.0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: AqaDoubleBezelCard(
        onTap: () {
          context.push('/groups/${group.id}');
        },
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    group.name,
                    style: const TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 15.5,
                      fontWeight: FontWeight.w800,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8.0),
                _buildRoleBadge(group, i18n),
              ],
            ),
            const SizedBox(height: 8.0),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7.0, vertical: 2.5),
                  decoration: BoxDecoration(
                    color: AqaTheme.accentTeal.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(4.0),
                  ),
                  child: Text(
                    group.category.toUpperCase(),
                    style: const TextStyle(
                      color: AqaTheme.accentTeal,
                      fontSize: 10.0,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                if (group.pool.isNotEmpty) ...[
                  const SizedBox(width: 8.0),
                  const Icon(Icons.pool_outlined, size: 13.0, color: AqaTheme.textLightMuted),
                  const SizedBox(width: 4.0),
                  Expanded(
                    child: Text(
                      group.pool,
                      style: const TextStyle(color: AqaTheme.textMuted, fontSize: 11.5),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12.0),
            ClipRRect(
              borderRadius: BorderRadius.circular(4.0),
              child: LinearProgressIndicator(
                value: fillRatio,
                minHeight: 5.0,
                backgroundColor: AqaTheme.surfaceSecondary,
                valueColor: AlwaysStoppedAnimation<Color>(
                  fillRatio >= 0.9 ? AqaTheme.statusWarning : AqaTheme.primarySky,
                ),
              ),
            ),
            const SizedBox(height: 10.0),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      const Icon(
                        Icons.calendar_month_outlined,
                        color: AqaTheme.textLightMuted,
                        size: 15.0,
                      ),
                      const SizedBox(width: 6.0),
                      Expanded(
                        child: Text(
                          '${group.scheduleDays.join(', ')} • ${group.startTime}-${group.endTime}',
                          style: const TextStyle(color: AqaTheme.textMuted, fontSize: 11.5),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8.0),
                Row(
                  children: [
                    const Icon(Icons.people_outline, color: AqaTheme.accentTeal, size: 15.0),
                    const SizedBox(width: 4.0),
                    Text(
                      '${group.activeMembersCount} / ${group.capacity}',
                      style: const TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 12.0,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleBadge(SwimGroupModel group, AppI18n i18n) {
    if (group.roleInGroup == 'assistant' || group.isViewOnly) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
        decoration: BoxDecoration(
          color: AqaTheme.surfaceSecondary,
          borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
          border: Border.all(color: AqaTheme.borderSubtle),
        ),
        child: Text(
          i18n.t('common.view_only'),
          style: const TextStyle(color: AqaTheme.textMuted, fontSize: 9.5, fontWeight: FontWeight.w700),
        ),
      );
    }
    if (group.roleInGroup == 'head_coach') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
        decoration: BoxDecoration(
          color: AqaTheme.statusWarningBg,
          borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
          border: Border.all(color: AqaTheme.statusWarning),
        ),
        child: Text(
          i18n.t('auth.role_head_coach').toUpperCase(),
          style: const TextStyle(
            color: AqaTheme.statusWarning,
            fontSize: 9.5,
            fontWeight: FontWeight.w800,
          ),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
      decoration: BoxDecoration(
        color: AqaTheme.statusInfoBg,
        borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
        border: Border.all(color: AqaTheme.primarySky),
      ),
      child: Text(
        i18n.t('auth.role_coach').toUpperCase(),
        style: const TextStyle(color: AqaTheme.primarySky, fontSize: 9.5, fontWeight: FontWeight.w800),
      ),
    );
  }
}
