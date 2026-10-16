import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/models/swim_attendance.dart';
import '../../core/models/swim_session.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/sync/offline_sync_manager.dart';
import '../../core/theme/aqa_theme.dart';
import 'quick_session_logger_sheet.dart';

final sessionDetailProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, sessionId) async {
  final client = ref.watch(apiClientProvider);
  final response = await client.dio.get(ApiEndpoints.sessionDetails(sessionId));
  if (response.statusCode == 200 && response.data != null) {
    return response.data as Map<String, dynamic>;
  }
  throw Exception('Failed to load session details');
});

class AttendanceScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const AttendanceScreen({super.key, required this.sessionId});

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  final List<AttendanceRecordModel> _records = [];
  List<Map<String, dynamic>> _clubSwimmers = [];

  final TextEditingController _sessionNotesController = TextEditingController();
  final TextEditingController _waterTempController = TextEditingController(text: '27.5');

  int _sessionRatingStars = 5;
  String _intensity = 'Moderee';
  String _focus = 'Technique de Nage';
  int _discipline = 5;

  bool _isInitialized = false;
  bool _isSaving = false;
  bool _isViewOnly = false;
  Map<String, dynamic>? _sessionData;

  @override
  void dispose() {
    _sessionNotesController.dispose();
    _waterTempController.dispose();
    super.dispose();
  }

  void _populateFromData(Map<String, dynamic> data) {
    if (_isInitialized) return;

    _sessionData = data['session'] as Map<String, dynamic>?;
    _isViewOnly = data['isViewOnly'] as bool? ?? false;
    _clubSwimmers = ((data['clubSwimmers'] as List<dynamic>?) ?? [])
        .map((e) => e as Map<String, dynamic>)
        .toList();

    final existingAttendance = (data['attendance'] as List<dynamic>?) ?? [];
    final groupMembers = (data['groupMembers'] as List<dynamic>?) ??
        (data['members'] as List<dynamic>?) ??
        [];

    final Map<String, AttendanceRecordModel> recordMap = {};

    for (final m in groupMembers) {
      final mid = m['id'] as String;
      final rawSt = (m['status'] as String? ?? 'PRESENT').trim().toUpperCase();
      recordMap[mid] = AttendanceRecordModel(
        memberId: mid,
        swimId: m['swimId']?.toString() ?? '',
        memberName: m['fullName'] as String? ?? 'Swimmer',
        level: m['level']?.toString(),
        dateOfBirth: m['dateOfBirth']?.toString(),
        photoUrl: m['photoUrl'] as String?,
        status: rawSt == 'ABSENT' ? 'ABSENT' : 'PRESENT',
        notes: m['note'] as String?,
        isGuest: m['isGuest'] as bool? ?? false,
      );
    }

    for (final att in existingAttendance) {
      final mid = att['memberId'] as String;
      final existing = AttendanceRecordModel.fromJson(att as Map<String, dynamic>);
      if (recordMap.containsKey(mid)) {
        recordMap[mid]!.status = existing.isAbsent ? 'ABSENT' : 'PRESENT';
        recordMap[mid]!.notes = existing.notes;
      } else {
        recordMap[mid] = existing;
      }
    }

    _records
      ..clear()
      ..addAll(recordMap.values);

    final ratingMap =
        data['sessionRating'] as Map<String, dynamic>? ??
        _sessionData?['sessionRating'] as Map<String, dynamic>?;
    if (ratingMap != null) {
      _sessionRatingStars = (ratingMap['rating'] as num?)?.toInt() ?? 5;
      _intensity = ratingMap['intensity'] as String? ?? 'Moderee';
      _focus = ratingMap['focus'] as String? ?? 'Technique de Nage';
      _discipline = (ratingMap['discipline'] as num?)?.toInt() ?? 5;
      if (ratingMap['waterTempC'] != null) {
        _waterTempController.text = ratingMap['waterTempC'].toString();
      }
      if (ratingMap['summary'] != null && ratingMap['summary'].toString().isNotEmpty) {
        _sessionNotesController.text = ratingMap['summary'].toString();
      }
    } else if (_sessionData?['notes'] != null) {
      _sessionNotesController.text = _sessionData!['notes'].toString();
    }

    _isInitialized = true;
  }

  Future<void> _saveAttendance(AppI18n i18n) async {
    if (_isViewOnly || _isSaving) return;

    setState(() => _isSaving = true);

    final clientMutationId = '${DateTime.now().millisecondsSinceEpoch}-${widget.sessionId}';
    final waterTemp = double.tryParse(_waterTempController.text.trim());
    final notesText = _sessionNotesController.text.trim();

    final payload = {
      'clientMutationId': clientMutationId,
      'records': _records.map((r) => r.toJson()).toList(),
      'closeSession': true,
      'sessionRating': {
        'rating': _sessionRatingStars,
        'intensity': _intensity,
        'focus': _focus,
        'discipline': _discipline,
        'waterTempC': waterTemp,
        'summary': notesText,
      },
    };

    final client = ref.read(apiClientProvider);

    try {
      final response = await client.dio.put(
        ApiEndpoints.submitAttendance(widget.sessionId),
        data: payload,
      );

      if (response.statusCode == 200 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AqaTheme.statusSuccess,
            content: Text(i18n.t('attendance.saved_success')),
          ),
        );
        ref.invalidate(sessionDetailProvider(widget.sessionId));
        ref.invalidate(bootstrapProvider);
      }
    } catch (e) {
      final syncManager = ref.read(syncManagerProvider);
      await syncManager.enqueue(
        SyncMutation(
          id: clientMutationId,
          type: 'attendance',
          payload: {
            'sessionId': widget.sessionId,
            ...payload,
          },
          timestamp: DateTime.now().toIso8601String(),
        ),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AqaTheme.statusWarning,
            content: Text(i18n.t('attendance.saved_offline')),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _addGuestSwimmer(AppI18n i18n) {
    final nameController = TextEditingController();
    String? selectedClubSwimmerId;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: AqaTheme.surfaceDark,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
            side: const BorderSide(color: AqaTheme.borderTeal),
          ),
          title: Text(
            i18n.t('attendance.add_guest_title'),
            style: const TextStyle(
              color: AqaTheme.textPrimary,
              fontSize: 16.0,
              fontWeight: FontWeight.w800,
            ),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_clubSwimmers.isNotEmpty) ...[
                  Text(
                    i18n.t('attendance.select_club_swimmer'),
                    style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                  ),
                  const SizedBox(height: 8.0),
                  DropdownButtonFormField<String>(
                    initialValue: selectedClubSwimmerId,
                    dropdownColor: AqaTheme.surfaceSecondary,
                    style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                    decoration: InputDecoration(
                      hintText: i18n.t('attendance.choose_club_swimmer'),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                    ),
                    items: _clubSwimmers
                        .map(
                          (s) => DropdownMenuItem<String>(
                            value: s['id'] as String,
                            child: Text(
                              '${s['fullName']} (${s['level'] ?? 'Club'})',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (val) {
                      setDialogState(() {
                        selectedClubSwimmerId = val;
                      });
                    },
                  ),
                  const SizedBox(height: 14.0),
                  const Divider(),
                  const SizedBox(height: 10.0),
                ],
                Text(
                  i18n.t('attendance.or_external_guest'),
                  style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                ),
                const SizedBox(height: 8.0),
                TextField(
                  controller: nameController,
                  decoration: InputDecoration(hintText: i18n.t('attendance.guest_name_hint')),
                  style: const TextStyle(color: AqaTheme.textPrimary),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(
                i18n.t('common.cancel'),
                style: const TextStyle(color: AqaTheme.textMuted),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                if (selectedClubSwimmerId != null) {
                  final match = _clubSwimmers.firstWhere(
                    (s) => s['id'] == selectedClubSwimmerId,
                  );
                  setState(() {
                    _records.add(
                      AttendanceRecordModel(
                        memberId: match['id'] as String,
                        memberName: match['fullName'] as String? ?? 'Swimmer',
                        status: 'PRESENT',
                        isGuest: true,
                      ),
                    );
                  });
                  Navigator.pop(ctx);
                  return;
                }
                final name = nameController.text.trim();
                if (name.isNotEmpty) {
                  setState(() {
                    _records.add(
                      AttendanceRecordModel(
                        memberId: 'guest-${DateTime.now().millisecondsSinceEpoch}',
                        memberName: name,
                        status: 'PRESENT',
                        isGuest: true,
                      ),
                    );
                  });
                  Navigator.pop(ctx);
                }
              },
              child: Text(i18n.t('attendance.add_btn')),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(sessionDetailProvider(widget.sessionId));
    final i18n = ref.watch(i18nProvider);

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: Text(i18n.t('attendance.title')),
        actions: [
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14.0),
            child: LanguageSwitcherPill(compact: true),
          ),
          if (!_isViewOnly)
            IconButton(
              onPressed: () => _addGuestSwimmer(i18n),
              icon: const Icon(Icons.person_add_alt_1_rounded, color: AqaTheme.accentTeal),
              tooltip: i18n.t('attendance.add_guest_title'),
            ),
          const SizedBox(width: 4.0),
        ],
      ),
      body: AqaAmbientBackground(
        child: detailAsync.when(
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
                    const Icon(Icons.error_outline, color: AqaTheme.statusDanger, size: 42.0),
                    const SizedBox(height: 12.0),
                    Text(
                      err.toString(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AqaTheme.textMuted),
                    ),
                    const SizedBox(height: 16.0),
                    AqaIslandButton(
                      label: i18n.t('common.retry'),
                      icon: Icons.refresh_rounded,
                      compact: true,
                      onPressed: () => ref.invalidate(sessionDetailProvider(widget.sessionId)),
                    ),
                  ],
                ),
              ),
            ),
          ),
          data: (data) {
            _populateFromData(data);

            final totalCount = _records.length;
            final presentCount = _records.where((r) => r.isPresent).length;
            final absentCount = _records.where((r) => r.isAbsent).length;
            final ratePct = totalCount > 0 ? ((presentCount / totalCount) * 100).round() : 100;

            return Column(
              children: [
                // 1. Top Binary Summary Bar (Strictly Present vs Absent)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16.0, 14.0, 16.0, 8.0),
                  child: AqaDoubleBezelCard(
                    glowing: true,
                    outerRadius: 20.0,
                    padding: const EdgeInsets.all(14.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _sessionData?['groupName'] as String? ?? 'Seance AQA',
                                    style: const TextStyle(
                                      color: AqaTheme.textPrimary,
                                      fontSize: 16.0,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -0.3,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2.0),
                                  Text(
                                    '${_sessionData?['sessionDate'] ?? ''} • ${_sessionData?['startTime'] ?? ''} - ${_sessionData?['endTime'] ?? ''} • ${_sessionData?['pool'] ?? 'Piscine AQA'}',
                                    style: const TextStyle(
                                      color: AqaTheme.textMuted,
                                      fontSize: 11.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (_isViewOnly)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
                                decoration: BoxDecoration(
                                  color: AqaTheme.surfaceSecondary,
                                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                                  border: Border.all(color: AqaTheme.borderMedium),
                                ),
                                child: Text(
                                  i18n.t('attendance.read_only'),
                                  style: const TextStyle(
                                    color: AqaTheme.textMuted,
                                    fontSize: 10.0,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              )
                            else
                              OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size(0, 34.0),
                                  padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 5.0),
                                  visualDensity: VisualDensity.compact,
                                  side: const BorderSide(color: AqaTheme.borderTeal),
                                  foregroundColor: AqaTheme.accentTeal,
                                ),
                                onPressed: () {
                                  if (_sessionData != null) {
                                    QuickSessionLoggerSheet.show(
                                      context,
                                      SwimSessionModel.fromJson(_sessionData!),
                                    );
                                  }
                                },
                                icon: const Icon(Icons.bolt_rounded, size: 15.0),
                                label: Text(
                                  i18n.t('sessions.log_3_steps'),
                                  style: const TextStyle(fontSize: 11.0, fontWeight: FontWeight.w800),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 12.0),

                        // Binary KPI Row: Present / Absent / Rate + Mark All Present
                        Row(
                          children: [
                            Expanded(
                              child: _buildBinaryStatChip(
                                label: i18n.t('attendance.present'),
                                count: presentCount,
                                color: AqaTheme.statusSuccess,
                                icon: Icons.check_circle_rounded,
                              ),
                            ),
                            const SizedBox(width: 8.0),
                            Expanded(
                              child: _buildBinaryStatChip(
                                label: i18n.t('attendance.absent'),
                                count: absentCount,
                                color: AqaTheme.statusDanger,
                                icon: Icons.cancel_rounded,
                              ),
                            ),
                            const SizedBox(width: 8.0),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
                              decoration: BoxDecoration(
                                color: AqaTheme.accentTeal.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(10.0),
                                border: Border.all(color: AqaTheme.borderTeal),
                              ),
                              child: Column(
                                children: [
                                  Text(
                                    '$ratePct%',
                                    style: const TextStyle(
                                      color: AqaTheme.accentTeal,
                                      fontSize: 14.0,
                                      fontWeight: FontWeight.w800,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                  Text(
                                    i18n.locale == 'fr'
                                        ? 'Assiduite'
                                        : (i18n.locale == 'en' ? 'Attendance' : 'المواظبة'),
                                    style: const TextStyle(
                                      color: AqaTheme.textMuted,
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10.0),

                        // Progress Bar + Quick Mark All Present
                        Row(
                          children: [
                            Expanded(
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(999),
                                child: LinearProgressIndicator(
                                  value: totalCount > 0 ? presentCount / totalCount : 1.0,
                                  minHeight: 6.0,
                                  backgroundColor: AqaTheme.statusDanger.withValues(alpha: 0.25),
                                  valueColor: const AlwaysStoppedAnimation<Color>(
                                    AqaTheme.statusSuccess,
                                  ),
                                ),
                              ),
                            ),
                            if (!_isViewOnly) ...[
                              const SizedBox(width: 12.0),
                              InkWell(
                                onTap: () {
                                  setState(() {
                                    for (final r in _records) {
                                      r.status = 'PRESENT';
                                    }
                                  });
                                },
                                borderRadius: BorderRadius.circular(8.0),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
                                  child: Text(
                                    i18n.t('attendance.mark_all_present'),
                                    style: const TextStyle(
                                      color: AqaTheme.accentTeal,
                                      fontSize: 11.0,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                // 2. Swimmer Binary Attendance Cards + Session Rating Card
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16.0, 6.0, 16.0, 24.0),
                    children: [
                      ..._records.map((rec) => _buildSwimmerBinaryRow(rec, i18n)),
                      const SizedBox(height: 12.0),
                      _buildSessionEvaluationCard(i18n),
                    ],
                  ),
                ),

                // 3. Bottom Sticky Save Bar
                if (!_isViewOnly)
                  Container(
                    padding: const EdgeInsets.fromLTRB(16.0, 12.0, 16.0, 16.0),
                    decoration: const BoxDecoration(
                      color: Color(0xF5070C18),
                      border: Border(top: BorderSide(color: AqaTheme.borderSubtle)),
                    ),
                    child: SafeArea(
                      top: false,
                      child: SizedBox(
                        width: double.infinity,
                        child: AqaIslandButton(
                          label: _isSaving
                              ? i18n.t('common.saving')
                              : i18n.t('attendance.save_cta'),
                          icon: Icons.check_rounded,
                          loading: _isSaving,
                          onPressed: () => _saveAttendance(i18n),
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildBinaryStatChip({
    required String label,
    required int count,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(10.0),
        border: Border.all(color: color.withValues(alpha: 0.45)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 16.0),
          const SizedBox(width: 6.0),
          Text(
            '$count',
            style: TextStyle(
              color: color,
              fontSize: 15.0,
              fontWeight: FontWeight.w800,
              fontFamily: 'monospace',
            ),
          ),
          const SizedBox(width: 5.0),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AqaTheme.textPrimary,
                fontSize: 11.0,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSwimmerBinaryRow(AttendanceRecordModel rec, AppI18n i18n) {
    final isPresent = rec.isPresent;
    final activeColor = isPresent ? AqaTheme.statusSuccess : AqaTheme.statusDanger;

    return AqaDoubleBezelCard(
      margin: const EdgeInsets.only(bottom: 10.0),
      outerRadius: 18.0,
      accentColor: activeColor,
      glowing: false,
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
      onTap: _isViewOnly
          ? null
          : () {
              setState(() {
                rec.toggleBinaryStatus();
              });
            },
      child: Row(
        children: [
          // Swimmer Avatar Indicator
          Container(
            width: 42.0,
            height: 42.0,
            decoration: BoxDecoration(
              color: activeColor.withValues(alpha: 0.16),
              shape: BoxShape.circle,
              border: Border.all(color: activeColor, width: 1.5),
            ),
            alignment: Alignment.center,
            child: Text(
              rec.memberName.isNotEmpty ? rec.memberName[0].toUpperCase() : 'N',
              style: TextStyle(
                color: activeColor,
                fontSize: 15.0,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 12.0),

          // Name & Level + Suivi Tech Quick Link
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        rec.memberName,
                        style: const TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w800,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (rec.isGuest) ...[
                      const SizedBox(width: 6.0),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: AqaTheme.statusInfoBg,
                          borderRadius: BorderRadius.circular(4.0),
                          border: Border.all(color: AqaTheme.statusInfo),
                        ),
                        child: Text(
                          i18n.t('attendance.guest_badge'),
                          style: const TextStyle(
                            color: AqaTheme.statusInfo,
                            fontSize: 9.0,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 3.0),
                Row(
                  children: [
                    if (rec.level != null && rec.level!.isNotEmpty)
                      Text(
                        rec.level!,
                        style: const TextStyle(
                          color: AqaTheme.textMuted,
                          fontSize: 11.5,
                        ),
                      )
                    else
                      Text(
                        isPresent
                            ? i18n.t('attendance.present')
                            : i18n.t('attendance.absent'),
                        style: TextStyle(
                          color: activeColor,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    if (!rec.memberId.startsWith('guest-')) ...[
                      const SizedBox(width: 10.0),
                      InkWell(
                        onTap: () => context.push('/members/${rec.memberId}'),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.radar_rounded,
                              size: 13.0,
                              color: AqaTheme.accentTeal,
                            ),
                            const SizedBox(width: 3.0),
                            Text(
                              i18n.t('groups.btn_suivi'),
                              style: const TextStyle(
                                color: AqaTheme.accentTeal,
                                fontSize: 11.0,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8.0),

          // Strictly Binary Toggle Pill: PRESENT | ABSENT
          Container(
            padding: const EdgeInsets.all(3.0),
            decoration: BoxDecoration(
              color: const Color(0xFF070C18),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: AqaTheme.borderSubtle),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildBinarySegment(
                  label: i18n.t('attendance.present'),
                  selected: isPresent,
                  activeColor: AqaTheme.statusSuccess,
                  onTap: _isViewOnly
                      ? null
                      : () => setState(() => rec.status = 'PRESENT'),
                ),
                const SizedBox(width: 3.0),
                _buildBinarySegment(
                  label: i18n.t('attendance.absent'),
                  selected: !isPresent,
                  activeColor: AqaTheme.statusDanger,
                  onTap: _isViewOnly
                      ? null
                      : () => setState(() => rec.status = 'ABSENT'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBinarySegment({
    required String label,
    required bool selected,
    required Color activeColor,
    required VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 11.0, vertical: 7.0),
        decoration: BoxDecoration(
          color: selected ? activeColor : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: activeColor.withValues(alpha: 0.35),
                    blurRadius: 8.0,
                  ),
                ]
              : null,
        ),
        child: Text(
          label.toUpperCase(),
          style: TextStyle(
            color: selected ? Colors.white : AqaTheme.textLightMuted,
            fontSize: 10.0,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.4,
          ),
        ),
      ),
    );
  }

  Widget _buildSessionEvaluationCard(AppI18n i18n) {
    return AqaDoubleBezelCard(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.stars_rounded, color: AqaTheme.statusWarning, size: 20.0),
              const SizedBox(width: 8.0),
              Expanded(
                child: Text(
                  i18n.t('attendance.session_rating_title'),
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 15.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text(
                '$_sessionRatingStars / 5',
                style: const TextStyle(
                  color: AqaTheme.statusWarning,
                  fontSize: 14.0,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12.0),

          // 5-Star Selector
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (idx) {
              final starValue = idx + 1;
              final active = starValue <= _sessionRatingStars;
              return IconButton(
                onPressed: _isViewOnly
                    ? null
                    : () => setState(() => _sessionRatingStars = starValue),
                icon: Icon(
                  active ? Icons.star_rounded : Icons.star_outline_rounded,
                  color: active ? AqaTheme.statusWarning : AqaTheme.textLightMuted,
                  size: 32.0,
                ),
              );
            }),
          ),
          const SizedBox(height: 12.0),

          // Intensity & Water Temp
          Row(
            children: [
              Expanded(
                flex: 2,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      i18n.t('attendance.intensity_label'),
                      style: const TextStyle(
                        color: AqaTheme.textMuted,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6.0),
                    DropdownButtonFormField<String>(
                      initialValue: ['Moderee', 'Soutenue', 'Haute Intensite', 'Recuperation Active']
                              .contains(_intensity)
                          ? _intensity
                          : 'Moderee',
                      dropdownColor: AqaTheme.surfaceSecondary,
                      style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                      onChanged: _isViewOnly
                          ? null
                          : (val) {
                              if (val != null) setState(() => _intensity = val);
                            },
                      items: [
                        DropdownMenuItem(
                          value: 'Moderee',
                          child: Text(i18n.t('attendance.intensity_moderate')),
                        ),
                        DropdownMenuItem(
                          value: 'Soutenue',
                          child: Text(i18n.t('attendance.intensity_sustained')),
                        ),
                        DropdownMenuItem(
                          value: 'Haute Intensite',
                          child: Text(i18n.t('attendance.intensity_high')),
                        ),
                        DropdownMenuItem(
                          value: 'Recuperation Active',
                          child: Text(i18n.t('attendance.intensity_recovery')),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      i18n.t('attendance.water_temp_label'),
                      style: const TextStyle(
                        color: AqaTheme.textMuted,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6.0),
                    TextField(
                      controller: _waterTempController,
                      readOnly: _isViewOnly,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.5),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12.0),

          Text(
            i18n.t('attendance.session_notes_label'),
            style: const TextStyle(
              color: AqaTheme.textMuted,
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6.0),
          TextField(
            controller: _sessionNotesController,
            readOnly: _isViewOnly,
            maxLines: 3,
            style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.5),
            decoration: InputDecoration(
              hintText: i18n.t('attendance.session_notes_hint'),
            ),
          ),
        ],
      ),
    );
  }
}
