import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/models/swim_member.dart';
import '../../core/models/swim_session.dart';
import '../../core/theme/aqa_theme.dart';
import '../attendance/quick_session_logger_sheet.dart';

final groupDetailProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, groupId) async {
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

class _GroupDetailScreenState extends ConsumerState<GroupDetailScreen>
    with SingleTickerProviderStateMixin {
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
    final i18n = ref.watch(i18nProvider);

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: Text(i18n.t('groups.detail_title')),
        actions: [
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14.0),
            child: LanguageSwitcherPill(compact: true),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AqaTheme.accentTeal),
            onPressed: () => ref.invalidate(groupDetailProvider(widget.groupId)),
          ),
          const SizedBox(width: 4.0),
        ],
      ),
      body: AqaAmbientBackground(
        child: groupAsync.when(
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
                      onPressed: () => ref.invalidate(groupDetailProvider(widget.groupId)),
                    ),
                  ],
                ),
              ),
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
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline, color: AqaTheme.textLightMuted, size: 16.0),
                        const SizedBox(width: 8.0),
                        Expanded(
                          child: Text(
                            i18n.t('common.view_only'),
                            style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Header Details in Double-Bezel Card
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  child: AqaDoubleBezelCard(
                    glowEffect: true,
                    padding: const EdgeInsets.all(16.0),
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
                                  fontSize: 17.0,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                              decoration: BoxDecoration(
                                color: AqaTheme.statusInfoBg,
                                borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                                border: Border.all(color: AqaTheme.primarySky.withValues(alpha: 0.4)),
                              ),
                              child: Text(
                                (group['category'] as String? ?? '').toUpperCase(),
                                style: const TextStyle(
                                  color: AqaTheme.primarySky,
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8.0),
                        Row(
                          children: [
                            const Icon(Icons.pool_outlined, color: AqaTheme.accentTeal, size: 15.0),
                            const SizedBox(width: 6.0),
                            Text(
                              group['pool'] as String? ?? 'Bassin Principal',
                              style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.5),
                            ),
                            const Text(' • ', style: TextStyle(color: AqaTheme.textLightMuted)),
                            const Icon(Icons.access_time_rounded, color: AqaTheme.textLightMuted, size: 15.0),
                            const SizedBox(width: 4.0),
                            Text(
                              '${group['startTime'] ?? '09:00'} - ${group['endTime'] ?? '10:00'}',
                              style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.5),
                            ),
                          ],
                        ),
                        if (staffList.isNotEmpty) ...[
                          const SizedBox(height: 10.0),
                          Wrap(
                            spacing: 6.0,
                            runSpacing: 4.0,
                            children: staffList.map((st) {
                              final coachName = st['coachName'] as String? ??
                                  (st['coach'] is Map ? st['coach']['name'] as String? : null) ??
                                  'Coach';
                              final role = st['role'] as String? ?? 'coach';
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                                decoration: BoxDecoration(
                                  color: AqaTheme.surfaceSecondary,
                                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                                  border: Border.all(color: AqaTheme.borderSubtle),
                                ),
                                child: Text(
                                  '$coachName (${role.toUpperCase()})',
                                  style: const TextStyle(fontSize: 10.5, color: AqaTheme.textPrimary),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ],
                    ),
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
                      Tab(
                        text: i18n.t('groups.tab_swimmers', {'count': membersList.length}),
                      ),
                      Tab(
                        text: i18n.t('groups.tab_sessions', {'count': upcomingList.length}),
                      ),
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
                          ? Center(
                              child: Text(
                                i18n.t('common.empty'),
                                style: const TextStyle(color: AqaTheme.textMuted),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                              itemCount: membersList.length,
                              itemBuilder: (ctx, idx) {
                                final member = membersList[idx];
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 10.0),
                                  child: _buildSwimmerTile(context, member, isViewOnly, i18n),
                                );
                              },
                            ),

                      // Upcoming Sessions
                      upcomingList.isEmpty
                          ? Center(
                              child: Text(
                                i18n.t('sessions.empty_day'),
                                style: const TextStyle(color: AqaTheme.textMuted),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                              itemCount: upcomingList.length,
                              itemBuilder: (ctx, idx) {
                                final session = upcomingList[idx];
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 10.0),
                                  child: _buildSessionTile(context, session, isViewOnly, i18n),
                                );
                              },
                            ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildSwimmerTile(
    BuildContext context,
    SwimMemberModel member,
    bool isViewOnly,
    AppI18n i18n,
  ) {
    return AqaDoubleBezelCard(
      onTap: () {
        context.push('/members/${member.id}');
      },
      padding: const EdgeInsets.all(12.0),
      child: Row(
        children: [
          // Mascot / Badge Avatar
          Container(
            width: 46.0,
            height: 46.0,
            padding: const EdgeInsets.all(4.0),
            decoration: BoxDecoration(
              color: AqaTheme.surfaceSecondary,
              borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
              border: Border.all(color: AqaTheme.accentTeal.withValues(alpha: 0.3)),
            ),
            child: Image.asset(
              'assets/images/badges/${member.stageAsset.isNotEmpty ? member.stageAsset : member.badgeAsset}',
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => Center(
                child: Text(
                  member.fullName.isNotEmpty ? member.fullName.substring(0, 1).toUpperCase() : 'N',
                  style: const TextStyle(color: AqaTheme.accentTeal, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Text(
                              member.fullName,
                              style: const TextStyle(
                                color: AqaTheme.textPrimary,
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (member.isNewClient) ...[
                            const SizedBox(width: 6.0),
                            const AqaNewClientBadge(compact: true),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 8.0),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
                      decoration: BoxDecoration(
                        color: AqaTheme.primarySky.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(6.0),
                        border: Border.all(color: AqaTheme.primarySky.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        member.badgeLabel.toUpperCase(),
                        style: const TextStyle(
                          color: AqaTheme.primarySky,
                          fontSize: 9.0,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6.0),
                Wrap(
                  spacing: 4.0,
                  runSpacing: 2.0,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      i18n.t('attendance.rate', {'rate': member.attendanceRate}),
                      style: TextStyle(
                        color: member.attendanceRate >= 75
                            ? AqaTheme.statusSuccess
                            : AqaTheme.statusWarning,
                        fontSize: 11.0,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const Text('•', style: TextStyle(color: AqaTheme.textLightMuted, fontSize: 10.0)),
                    Text(
                      '${i18n.t('attendance.present')}: ${member.totalPresences} | ${i18n.t('attendance.absent')}: ${member.totalAbsences}',
                      style: const TextStyle(color: AqaTheme.textMuted, fontSize: 11.0),
                    ),
                    if (member.reviewCount > 0) ...[
                      const Text('•', style: TextStyle(color: AqaTheme.textLightMuted, fontSize: 10.0)),
                      Text(
                        i18n.t('suivi.eval_count', {'count': member.reviewCount}),
                        style: const TextStyle(
                          color: AqaTheme.accentTeal,
                          fontSize: 11.0,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8.0),
          const Icon(Icons.chevron_right_rounded, color: AqaTheme.textLightMuted, size: 20.0),
        ],
      ),
    );
  }

  Widget _buildSessionTile(
    BuildContext context,
    SwimSessionModel session,
    bool isViewOnly,
    AppI18n i18n,
  ) {
    final dateStr = session.sessionDate.length >= 10
        ? session.sessionDate.substring(0, 10)
        : session.sessionDate;

    return AqaDoubleBezelCard(
      padding: const EdgeInsets.all(14.0),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dateStr,
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3.0),
                Text(
                  '${session.startTime} - ${session.endTime}',
                  style: const TextStyle(color: AqaTheme.textMuted, fontSize: 11.5),
                ),
              ],
            ),
          ),
          if (!isViewOnly) ...[
            AqaIslandButton(
              label: i18n.t('sessions.log_3_steps'),
              icon: Icons.checklist_rounded,
              compact: true,
              secondary: true,
              onPressed: () {
                QuickSessionLoggerSheet.show(context, session).then((saved) {
                  if (saved == true) {
                    ref.invalidate(groupDetailProvider(widget.groupId));
                  }
                });
              },
            ),
            const SizedBox(width: 8.0),
          ],
          AqaIslandButton(
            label: isViewOnly
                ? i18n.t('sessions.view_btn')
                : i18n.t('sessions.sheet_btn'),
            icon: Icons.assignment_outlined,
            compact: true,
            onPressed: () {
              context.push('/sessions/${session.id}');
            },
          ),
        ],
      ),
    );
  }
}
