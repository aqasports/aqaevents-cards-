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
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
              children: [
                // Search Input with Double Bezel styling
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val.trim()),
                  style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.5),
                  decoration: InputDecoration(
                    hintText: i18n.locale == 'ar'
                        ? 'البحث عن فوج بالاسم، الفئة أو المسبح...'
                        : i18n.locale == 'en'
                            ? 'Search groups by name, category, or pool...'
                            : 'Rechercher un groupe par nom, categorie ou bassin...',
                    prefixIcon: const Icon(Icons.search_rounded, color: AqaTheme.textLightMuted, size: 20.0),
                  ),
                ),
                const SizedBox(height: 12.0),

                // Categories Filter
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: categories.map((cat) {
                      final isSelected = _selectedCategory == cat;
                      final catLabel = cat == 'ALL'
                          ? (i18n.locale == 'ar'
                              ? 'جميع الأفواج'
                              : i18n.locale == 'en'
                                  ? 'ALL GROUPS'
                                  : 'TOUS LES GROUPES')
                          : cat;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: FilterChip(
                          label: Text(
                            catLabel,
                            style: const TextStyle(fontSize: 11.0),
                          ),
                          selected: isSelected,
                          onSelected: (_) {
                            setState(() => _selectedCategory = cat);
                          },
                          selectedColor: AqaTheme.primarySky.withValues(alpha: 0.3),
                          backgroundColor: AqaTheme.surfaceDark,
                          labelStyle: TextStyle(
                            color: isSelected ? AqaTheme.accentTeal : AqaTheme.textMuted,
                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                          ),
                          side: BorderSide(
                            color: isSelected ? AqaTheme.accentTeal : AqaTheme.borderSubtle,
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
                      i18n.locale == 'ar'
                          ? '${filtered.length} أفواج • $totalSwimmers سباح'
                          : i18n.locale == 'en'
                              ? '${filtered.length} Group${filtered.length > 1 ? 's' : ''} • $totalSwimmers Swimmers'
                              : '${filtered.length} Groupe${filtered.length > 1 ? 's' : ''} • $totalSwimmers Nageurs',
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
                          i18n.locale == 'ar' ? 'إشراف عام' : 'SUPERVISION GLOBALE',
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
                      child: Text(
                        i18n.locale == 'ar'
                            ? 'لا توجد أفواج مطابقة لمعايير البحث'
                            : i18n.locale == 'en'
                                ? 'No groups found matching filter criteria.'
                                : 'Aucun groupe ne correspond aux filtres selectionnes.',
                        style: const TextStyle(color: AqaTheme.textMuted, fontSize: 13.0),
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
          i18n.locale == 'ar' ? 'مساعد (عرض فقط)' : 'ASSISTANT (LECTURE)',
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
        child: const Text(
          'HEAD COACH',
          style: TextStyle(
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
      child: const Text(
        'COACH',
        style: TextStyle(color: AqaTheme.primarySky, fontSize: 9.5, fontWeight: FontWeight.w800),
      ),
    );
  }
}
