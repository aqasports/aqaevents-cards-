import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/swim_member.dart';
import '../../core/models/swim_session.dart';
import '../../core/theme/aqa_theme.dart';

final groupDetailProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, groupId) async {
  final client = ref.watch(apiClientProvider);
  final response = await client.dio.get(ApiEndpoints.groupDetails(groupId));
  if (response.statusCode == 200 && response.data != null) {
    return response.data as Map<String, dynamic>;
  }
  throw Exception('Failed to load group details');
});

class GroupDetailScreen extends ConsumerStatefulWidget {
  final String groupId;

  const GroupDetailScreen({super.key, required this.groupId});

  @override
  ConsumerState<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends ConsumerState<GroupDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final groupAsync = ref.watch(groupDetailProvider(widget.groupId));

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Group Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(groupDetailProvider(widget.groupId)),
          ),
        ],
      ),
      body: groupAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AqaTheme.accentTeal),
        ),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: AqaTheme.statusDanger, size: 40.0),
              const SizedBox(height: 12.0),
              Text('Error: $err', style: const TextStyle(color: AqaTheme.textMuted)),
              const SizedBox(height: 16.0),
              ElevatedButton(
                onPressed: () => ref.invalidate(groupDetailProvider(widget.groupId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (data) {
          final group = data['group'] as Map<String, dynamic>;
          final isViewOnly = data['isViewOnly'] as bool? ?? false;
          final staffList = (data['staff'] as List<dynamic>?) ?? [];
          final membersList = ((data['members'] as List<dynamic>?) ?? [])
              .map((m) => SwimMemberModel.fromJson(m as Map<String, dynamic>))
              .toList();
          final upcomingList = ((data['upcomingSessions'] as List<dynamic>?) ?? [])
              .map((s) => SwimSessionModel.fromJson(s as Map<String, dynamic>))
              .toList();

          return Column(
            children: [
              // View-only banner if Assistant
              if (isViewOnly)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  color: AqaTheme.surfaceSecondary,
                  child: const Row(
                    children: [
                      Icon(Icons.info_outline, color: AqaTheme.textLightMuted, size: 16.0),
                      SizedBox(width: 8.0),
                      Expanded(
                        child: Text(
                          'Assistant Access: View-only mode for rosters and attendance.',
                          style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                        ),
                      ),
                    ],
                  ),
                ),

              // Header Details
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: const BoxDecoration(
                  color: AqaTheme.surfaceDark,
                  border: Border(
                    bottom: BorderSide(color: AqaTheme.borderSubtle),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            group['name'] as String? ?? '',
                            style: const TextStyle(
                              color: AqaTheme.textPrimary,
                              fontSize: 18.0,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                          decoration: BoxDecoration(
                            color: AqaTheme.statusInfoBg,
                            borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                          ),
                          child: Text(
                            (group['category'] as String? ?? '').toUpperCase(),
                            style: const TextStyle(
                              color: AqaTheme.primarySky,
                              fontSize: 11.0,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6.0),
                    Row(
                      children: [
                        const Icon(Icons.pool_outlined, color: AqaTheme.accentTeal, size: 15.0),
                        const SizedBox(width: 6.0),
                        Text(
                          group['pool'] as String? ?? 'Main Pool',
                          style: const TextStyle(color: AqaTheme.textMuted, fontSize: 13.0),
                        ),
                        const Text(' • ', style: TextStyle(color: AqaTheme.textLightMuted)),
                        const Icon(Icons.access_time, color: AqaTheme.textLightMuted, size: 15.0),
                        const SizedBox(width: 4.0),
                        Text(
                          '${group['startTime']} - ${group['endTime']}',
                          style: const TextStyle(color: AqaTheme.textMuted, fontSize: 13.0),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10.0),
                    // Staff Badges
                    Wrap(
                      spacing: 6.0,
                      runSpacing: 4.0,
                      children: [
                        ...staffList.map((st) {
                          final coachName = st['coach']?['name'] as String? ?? 'Coach';
                          final role = st['role'] as String? ?? 'coach';
                          return Chip(
                            backgroundColor: AqaTheme.surfaceSecondary,
                            label: Text(
                              '$coachName (${role.toUpperCase()})',
                              style: const TextStyle(fontSize: 11.0, color: AqaTheme.textPrimary),
                            ),
                            side: const BorderSide(color: AqaTheme.borderSubtle),
                            visualDensity: VisualDensity.compact,
                          );
                        }),
                      ],
                    ),
                  ],
                ),
              ),

              // Tab Bar
              Container(
                color: AqaTheme.surfaceDark,
                child: TabBar(
                  controller: _tabController,
                  indicatorColor: AqaTheme.accentTeal,
                  labelColor: AqaTheme.accentTeal,
                  unselectedLabelColor: AqaTheme.textLightMuted,
                  tabs: [
                    Tab(text: 'Swimmers (${membersList.length})'),
                    Tab(text: 'Sessions (${upcomingList.length})'),
                  ],
                ),
              ),

              // Tab Views
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    // Swimmers Roster
                    membersList.isEmpty
                        ? const Center(
                            child: Text(
                              'No swimmers enrolled in this group',
                              style: TextStyle(color: AqaTheme.textMuted),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16.0),
                            itemCount: membersList.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8.0),
                            itemBuilder: (ctx, idx) {
                              final member = membersList[idx];
                              return _buildSwimmerTile(context, member, isViewOnly);
                            },
                          ),

                    // Upcoming Sessions
                    upcomingList.isEmpty
                        ? const Center(
                            child: Text(
                              'No upcoming sessions found',
                              style: TextStyle(color: AqaTheme.textMuted),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16.0),
                            itemCount: upcomingList.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8.0),
                            itemBuilder: (ctx, idx) {
                              final session = upcomingList[idx];
                              return _buildSessionTile(context, session, isViewOnly);
                            },
                          ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSwimmerTile(BuildContext context, SwimMemberModel member, bool isViewOnly) {
    return Container(
      decoration: BoxDecoration(
        color: AqaTheme.surfaceDark,
        borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
        border: Border.all(color: AqaTheme.borderSubtle),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AqaTheme.surfaceSecondary,
          child: Text(
            member.fullName.isNotEmpty ? member.fullName.substring(0, 1).toUpperCase() : 'S',
            style: const TextStyle(color: AqaTheme.accentTeal, fontWeight: FontWeight.w700),
          ),
        ),
        title: Text(
          member.fullName,
          style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0, fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          'Presences: ${member.totalPresences} | Absences: ${member.totalAbsences}',
          style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
        ),
        trailing: const Icon(Icons.chevron_right, color: AqaTheme.textLightMuted),
        onTap: () {
          context.push('/members/${member.id}');
        },
      ),
    );
  }

  Widget _buildSessionTile(BuildContext context, SwimSessionModel session, bool isViewOnly) {
    return Container(
      decoration: BoxDecoration(
        color: AqaTheme.surfaceDark,
        borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
        border: Border.all(color: AqaTheme.borderSubtle),
      ),
      child: ListTile(
        title: Text(
          session.sessionDate.length >= 10 ? session.sessionDate.substring(0, 10) : session.sessionDate,
          style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0, fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          '${session.startTime} - ${session.endTime}',
          style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
        ),
        trailing: ElevatedButton(
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
            visualDensity: VisualDensity.compact,
          ),
          onPressed: () {
            context.push('/sessions/${session.id}');
          },
          child: Text(isViewOnly ? 'View' : 'Presence'),
        ),
      ),
    );
  }
}
