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
          final allGroups = data.groups;
          final categories = {
            'ALL',
            ...allGroups
                .map((g) => g.category.toUpperCase())
                .where((c) => c.isNotEmpty),
          };

          final filtered = allGroups.where((g) {
            final matchesCat = _selectedCategory == 'ALL' ||
                g.category.toUpperCase() == _selectedCategory;
            final matchesQuery = _searchQuery.isEmpty ||
                g.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                g.pool.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                g.category.toLowerCase().contains(_searchQuery.toLowerCase());
            return matchesCat && matchesQuery;
          }).toList();

          final totalSwimmers = filtered.fold<int>(
            0,
            (acc, g) => acc + g.activeMembersCount,
          );

          return ListView(
            padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 108.0),
            children: [
              // Search Input
              TextField(
                onChanged: (val) => setState(() => _searchQuery = val.trim()),
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 13.5,
                ),
                decoration: InputDecoration(
                  hintText: i18n.t('groups.search_hint'),
                  prefixIcon: const Icon(
                    Icons.search_rounded,
                    color: AqaTheme.textMuted,
                    size: 19.0,
                  ),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(
                            Icons.clear,
                            color: AqaTheme.textLightMuted,
                            size: 18.0,
                          ),
                          onPressed: () => setState(() => _searchQuery = ''),
                        )
                      : null,
                ),
              ),
              const SizedBox(height: 12.0),

              // Precision Categories Filter Pills
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: categories.map((cat) {
                    final isSelected = _selectedCategory == cat;
                    final catLabel =
                        cat == 'ALL' ? i18n.t('common.all_sectors') : cat;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () => setState(() => _selectedCategory = cat),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          curve: Curves.easeOutCubic,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 13.0,
                            vertical: 8.0,
                          ),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFF13223D)
                                : AqaTheme.surfaceRecessed,
                            borderRadius: BorderRadius.circular(10.0),
                            border: Border.all(
                              color: isSelected
                                  ? AqaTheme.primarySkyHover
                                      .withValues(alpha: 0.55)
                                  : AqaTheme.borderSubtle,
                              width: 1.0,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (isSelected) ...[
                                Container(
                                  width: 6.0,
                                  height: 6.0,
                                  decoration: const BoxDecoration(
                                    color: AqaTheme.accentTeal,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6.0),
                              ],
                              Text(
                                catLabel,
                                style: TextStyle(
                                  color: isSelected
                                      ? AqaTheme.textPrimary
                                      : AqaTheme.textMuted,
                                  fontSize: 11.5,
                                  fontWeight: isSelected
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                ),
                              ),
                            ],
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
                      fontWeight: FontWeight.w600,
                      fontFeatures: AqaTheme.tabularNums,
                    ),
                  ),
                  if (data.coach.isHeadCoach)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8.0,
                        vertical: 3.0,
                      ),
                      decoration: BoxDecoration(
                        color: AqaTheme.statusWarningBg,
                        borderRadius: BorderRadius.circular(6.0),
                        border: Border.all(
                          color: AqaTheme.statusWarning.withValues(alpha: 0.40),
                        ),
                      ),
                      child: Text(
                        i18n.t('auth.role_head_sub').toUpperCase(),
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
              const SizedBox(height: 12.0),

              if (filtered.isEmpty)
                AqaDoubleBezelCard(
                  padding: const EdgeInsets.all(36.0),
                  child: Center(
                    child: Column(
                      children: [
                        const Icon(
                          Icons.groups_outlined,
                          color: AqaTheme.textLightMuted,
                          size: 36.0,
                        ),
                        const SizedBox(height: 10.0),
                        Text(
                          i18n.t('groups.no_groups_found'),
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4.0),
                        Text(
                          i18n.t('groups.no_groups_sub'),
                          style: const TextStyle(
                            color: AqaTheme.textMuted,
                            fontSize: 12.0,
                          ),
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
    );
  }

  Widget _buildGroupCard(
    BuildContext context,
    SwimGroupModel group,
    AppI18n i18n,
  ) {
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
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.2,
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
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7.0,
                    vertical: 2.5,
                  ),
                  decoration: BoxDecoration(
                    color: AqaTheme.primarySky.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(5.0),
                  ),
                  child: Text(
                    group.category.toUpperCase(),
                    style: const TextStyle(
                      color: AqaTheme.primarySkyHover,
                      fontSize: 10.0,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
                if (group.pool.isNotEmpty) ...[
                  const SizedBox(width: 10.0),
                  const Icon(
                    Icons.location_on_outlined,
                    size: 13.0,
                    color: AqaTheme.textLightMuted,
                  ),
                  const SizedBox(width: 3.5),
                  Expanded(
                    child: Text(
                      group.pool,
                      style: const TextStyle(
                        color: AqaTheme.textSecondary,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12.0),
            ClipRRect(
              borderRadius: BorderRadius.circular(999.0),
              child: LinearProgressIndicator(
                value: fillRatio,
                minHeight: 4.5,
                backgroundColor: AqaTheme.surfaceRecessed,
                valueColor: AlwaysStoppedAnimation<Color>(
                  fillRatio >= 0.9
                      ? AqaTheme.statusWarning
                      : AqaTheme.primarySkyHover,
                ),
              ),
            ),
            const SizedBox(height: 11.0),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      const Icon(
                        Icons.calendar_month_outlined,
                        color: AqaTheme.textLightMuted,
                        size: 14.5,
                      ),
                      const SizedBox(width: 6.0),
                      Expanded(
                        child: Text(
                          '${group.scheduleDays.join(', ')} • ${group.startTime}-${group.endTime}',
                          style: const TextStyle(
                            color: AqaTheme.textMuted,
                            fontSize: 11.5,
                            fontFeatures: AqaTheme.tabularNums,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8.0),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8.0,
                    vertical: 3.0,
                  ),
                  decoration: BoxDecoration(
                    color: AqaTheme.surfaceRecessed,
                    borderRadius: BorderRadius.circular(6.0),
                    border: Border.all(color: AqaTheme.borderSubtle),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.people_outline,
                        color: AqaTheme.accentTeal,
                        size: 13.5,
                      ),
                      const SizedBox(width: 5.0),
                      Text(
                        '${group.activeMembersCount} / ${group.capacity}',
                        style: const TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          fontFeatures: AqaTheme.tabularNums,
                        ),
                      ),
                    ],
                  ),
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
          color: AqaTheme.surfaceRecessed,
          borderRadius: BorderRadius.circular(6.0),
          border: Border.all(color: AqaTheme.borderSubtle),
        ),
        child: Text(
          i18n.t('common.view_only'),
          style: const TextStyle(
            color: AqaTheme.textMuted,
            fontSize: 9.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      );
    }
    if (group.roleInGroup == 'head_coach') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
        decoration: BoxDecoration(
          color: AqaTheme.statusWarningBg,
          borderRadius: BorderRadius.circular(6.0),
          border: Border.all(
            color: AqaTheme.statusWarning.withValues(alpha: 0.40),
          ),
        ),
        child: Text(
          i18n.t('auth.role_head_coach').toUpperCase(),
          style: const TextStyle(
            color: AqaTheme.statusWarning,
            fontSize: 9.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.3,
          ),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
      decoration: BoxDecoration(
        color: AqaTheme.statusInfoBg,
        borderRadius: BorderRadius.circular(6.0),
        border: Border.all(
          color: AqaTheme.primarySkyHover.withValues(alpha: 0.40),
        ),
      ),
      child: Text(
        i18n.t('auth.role_coach').toUpperCase(),
        style: const TextStyle(
          color: AqaTheme.primarySkyHover,
          fontSize: 9.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
