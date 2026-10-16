import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: AqaTheme.statusDanger, size: 40.0),
                const SizedBox(height: 12.0),
                Text(
                  'Impossible de charger les groupes: $err',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AqaTheme.textMuted),
                ),
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
            padding: const EdgeInsets.all(16.0),
            children: [
              // Search input
              TextField(
                onChanged: (val) => setState(() => _searchQuery = val.trim()),
                style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0),
                decoration: const InputDecoration(
                  hintText: 'Rechercher un groupe par nom, categorie ou bassin...',
                  prefixIcon: Icon(Icons.search, color: AqaTheme.textLightMuted, size: 20.0),
                ),
              ),
              const SizedBox(height: 12.0),

              // Categories Filter
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: categories.map((cat) {
                    final isSelected = _selectedCategory == cat;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: FilterChip(
                        label: Text(
                          cat == 'ALL' ? 'TOUS LES SECTEURS' : cat,
                          style: const TextStyle(fontSize: 11.0),
                        ),
                        selected: isSelected,
                        onSelected: (_) {
                          setState(() => _selectedCategory = cat);
                        },
                        selectedColor: AqaTheme.primarySky,
                        backgroundColor: AqaTheme.surfaceDark,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : AqaTheme.textMuted,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        ),
                        side: BorderSide(
                          color: isSelected ? AqaTheme.primarySky : AqaTheme.borderSubtle,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 16.0),

              // Summary row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${filtered.length} Groupe${filtered.length > 1 ? 's' : ''} • $totalSwimmers Nageurs',
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
                      child: const Text(
                        'SUPERVISION GLOBALE',
                        style: TextStyle(
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
                Container(
                  padding: const EdgeInsets.all(40.0),
                  decoration: BoxDecoration(
                    color: AqaTheme.surfaceDark,
                    borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                    border: Border.all(color: AqaTheme.borderSubtle),
                  ),
                  child: const Center(
                    child: Text(
                      'Aucun groupe ne correspond aux filtres selectionnes.',
                      style: TextStyle(color: AqaTheme.textMuted, fontSize: 13.0),
                    ),
                  ),
                )
              else
                ...filtered.map((group) => _buildGroupCard(context, group)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildGroupCard(BuildContext context, SwimGroupModel group) {
    final fillRatio = group.capacity > 0
        ? (group.activeMembersCount / group.capacity).clamp(0.0, 1.0)
        : 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12.0),
      decoration: BoxDecoration(
        color: AqaTheme.surfaceDark,
        borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
        border: Border.all(color: AqaTheme.borderSubtle),
        boxShadow: AqaTheme.cardShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
          onTap: () {
            context.push('/groups/${group.id}');
          },
          child: Padding(
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
                          fontSize: 16.0,
                          fontWeight: FontWeight.w800,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8.0),
                    _buildRoleBadge(group),
                  ],
                ),
                const SizedBox(height: 6.0),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
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
                          style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
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
        ),
      ),
    );
  }

  Widget _buildRoleBadge(SwimGroupModel group) {
    if (group.roleInGroup == 'assistant' || group.isViewOnly) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
        decoration: BoxDecoration(
          color: AqaTheme.surfaceSecondary,
          borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
          border: Border.all(color: AqaTheme.borderSubtle),
        ),
        child: const Text(
          'ASSISTANT (LECTURE)',
          style: TextStyle(color: AqaTheme.textMuted, fontSize: 9.5, fontWeight: FontWeight.w700),
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
            fontWeight: FontWeight.w700,
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
        style: TextStyle(color: AqaTheme.primarySky, fontSize: 9.5, fontWeight: FontWeight.w700),
      ),
    );
  }
}
