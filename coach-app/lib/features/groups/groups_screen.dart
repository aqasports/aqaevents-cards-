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
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: AqaTheme.statusDanger, size: 40.0),
              const SizedBox(height: 12.0),
              Text(
                'Failed to load groups: $err',
                style: const TextStyle(color: AqaTheme.textMuted),
              ),
              const SizedBox(height: 16.0),
              ElevatedButton(
                onPressed: () => ref.invalidate(bootstrapProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (data) {
          final allGroups = data.groups;
          final categories = {'ALL', ...allGroups.map((g) => g.category.toUpperCase()).where((c) => c.isNotEmpty)};

          final filtered = allGroups.where((g) {
            final matchesCat = _selectedCategory == 'ALL' || g.category.toUpperCase() == _selectedCategory;
            final matchesQuery = _searchQuery.isEmpty ||
                g.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                g.pool.toLowerCase().contains(_searchQuery.toLowerCase());
            return matchesCat && matchesQuery;
          }).toList();

          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              // Search input
              TextField(
                onChanged: (val) => setState(() => _searchQuery = val.trim()),
                style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0),
                decoration: const InputDecoration(
                  hintText: 'Search groups by name or pool...',
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
                        label: Text(cat, style: const TextStyle(fontSize: 12.0)),
                        selected: isSelected,
                        onSelected: (val) {
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

              // Summary
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${filtered.length} Group${filtered.length > 1 ? 's' : ''}',
                    style: const TextStyle(
                      color: AqaTheme.textMuted,
                      fontSize: 13.0,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (data.coach.isHeadCoach)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                      decoration: BoxDecoration(
                        color: AqaTheme.statusWarningBg,
                        borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                      ),
                      child: const Text(
                        'ALL SECTORS ACCESS',
                        style: TextStyle(color: AqaTheme.statusWarning, fontSize: 10.0, fontWeight: FontWeight.w700),
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
                      'No swimming groups found matching filters.',
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
                          fontWeight: FontWeight.w700,
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
                    Text(
                      group.category.toUpperCase(),
                      style: const TextStyle(color: AqaTheme.accentTeal, fontSize: 12.0, fontWeight: FontWeight.w600),
                    ),
                    if (group.pool.isNotEmpty) ...[
                      const Text(' • ', style: TextStyle(color: AqaTheme.textLightMuted)),
                      Text(group.pool, style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0)),
                    ],
                  ],
                ),
                const SizedBox(height: 10.0),
                const Divider(),
                const SizedBox(height: 10.0),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.calendar_month_outlined, color: AqaTheme.textLightMuted, size: 16.0),
                        const SizedBox(width: 6.0),
                        Text(
                          group.scheduleDays.join(', '),
                          style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        const Icon(Icons.people_outline, color: AqaTheme.textLightMuted, size: 16.0),
                        const SizedBox(width: 6.0),
                        Text(
                          '${group.activeMembersCount} / ${group.capacity}',
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 12.0,
                            fontWeight: FontWeight.w600,
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
          'ASSISTANT (VIEW)',
          style: TextStyle(color: AqaTheme.textMuted, fontSize: 10.0, fontWeight: FontWeight.w700),
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
          style: TextStyle(color: AqaTheme.statusWarning, fontSize: 10.0, fontWeight: FontWeight.w700),
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
        style: TextStyle(color: AqaTheme.primarySky, fontSize: 10.0, fontWeight: FontWeight.w700),
      ),
    );
  }
}
