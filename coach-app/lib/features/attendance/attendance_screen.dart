import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
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
  String _discipline = 'Excellente';

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
      recordMap[mid] = AttendanceRecordModel(
        memberId: mid,
        memberName: m['fullName'] as String? ?? 'Swimmer',
        dateOfBirth: m['dateOfBirth']?.toString(),
        photoUrl: m['photoUrl'] as String?,
        status: (m['status'] as String? ?? 'PRESENT').toUpperCase(),
        notes: m['note'] as String?,
        isGuest: m['isGuest'] as bool? ?? false,
      );
    }

    for (final att in existingAttendance) {
      final mid = att['memberId'] as String;
      final existing = AttendanceRecordModel.fromJson(att as Map<String, dynamic>);
      recordMap[mid] = existing;
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
      _discipline = ratingMap['discipline'] as String? ?? 'Excellente';
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

  Future<void> _saveAttendance() async {
    if (_isViewOnly || _isSaving) return;

    setState(() => _isSaving = true);

    final clientMutationId = '${DateTime.now().millisecondsSinceEpoch}-${widget.sessionId}';
    final waterTemp = double.tryParse(_waterTempController.text.trim());
    final notesText = _sessionNotesController.text.trim();

    final payload = {
      'clientMutationId': clientMutationId,
      'records': _records.map((r) => r.toJson()).toList(),
      'sessionNotes': notesText,
      'waterTempC': waterTemp,
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
          const SnackBar(
            backgroundColor: AqaTheme.statusSuccess,
            content: Text('Feuille de presence et evaluation de seance enregistrees.'),
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
          const SnackBar(
            backgroundColor: AqaTheme.statusWarning,
            content: Text('Mode hors-ligne: Presences sauvegardees pour synchronisation.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _addGuestSwimmer() {
    final nameController = TextEditingController();
    String? selectedClubSwimmerId;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: AqaTheme.surfaceDark,
          title: const Text(
            'Ajouter un Nageur Invite',
            style: TextStyle(color: AqaTheme.textPrimary, fontSize: 16.0, fontWeight: FontWeight.w700),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_clubSwimmers.isNotEmpty) ...[
                  const Text(
                    'Selectionner un nageur d\'un autre groupe AQA:',
                    style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                  ),
                  const SizedBox(height: 8.0),
                  DropdownButtonFormField<String>(
                    initialValue: selectedClubSwimmerId,
                    dropdownColor: AqaTheme.surfaceSecondary,
                    style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                    decoration: const InputDecoration(
                      hintText: 'Choisir un nageur du club...',
                      contentPadding: EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
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
                const Text(
                  'Ou saisir le nom d\'un invite externe (seance d\'essai):',
                  style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                ),
                const SizedBox(height: 8.0),
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(hintText: 'Nom complet du nageur'),
                  style: const TextStyle(color: AqaTheme.textPrimary),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler', style: TextStyle(color: AqaTheme.textMuted)),
            ),
            ElevatedButton(
              onPressed: () {
                if (selectedClubSwimmerId != null) {
                  final found = _clubSwimmers.firstWhere(
                    (s) => s['id'] == selectedClubSwimmerId,
                    orElse: () => {'id': selectedClubSwimmerId, 'fullName': 'Invite Club'},
                  );
                  final exists = _records.any((r) => r.memberId == selectedClubSwimmerId);
                  if (!exists) {
                    setState(() {
                      _records.add(
                        AttendanceRecordModel(
                          memberId: selectedClubSwimmerId!,
                          memberName: '${found['fullName']} (Invite)',
                          status: 'PRESENT',
                          isGuest: true,
                        ),
                      );
                    });
                  }
                  Navigator.pop(ctx);
                } else if (nameController.text.trim().isNotEmpty) {
                  setState(() {
                    _records.add(
                      AttendanceRecordModel(
                        memberId: 'guest-${DateTime.now().millisecondsSinceEpoch}',
                        memberName: '${nameController.text.trim()} (Essai)',
                        status: 'PRESENT',
                        isGuest: true,
                      ),
                    );
                  });
                  Navigator.pop(ctx);
                }
              },
              child: const Text('Ajouter'),
            ),
          ],
        ),
      ),
    );
  }

  void _editSwimmerNote(AttendanceRecordModel rec) {
    final ctrl = TextEditingController(text: rec.notes ?? '');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AqaTheme.surfaceDark,
        title: Text(
          'Note — ${rec.memberName}',
          style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 15.0, fontWeight: FontWeight.w700),
        ),
        content: TextField(
          controller: ctrl,
          maxLines: 3,
          style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
          decoration: const InputDecoration(
            hintText: 'Remarque sur la seance (ex: retard 10m, excellente glisse)...',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler', style: TextStyle(color: AqaTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              setState(() {
                rec.notes = ctrl.text.trim().isEmpty ? null : ctrl.text.trim();
              });
              Navigator.pop(ctx);
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(sessionDetailProvider(widget.sessionId));

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Feuille de Presence & Seance'),
        actions: [
          if (!_isViewOnly) ...[
            TextButton.icon(
              onPressed: () {
                final sessionModel = _sessionData != null
                    ? SwimSessionModel.fromJson(_sessionData!)
                    : SwimSessionModel(
                        id: widget.sessionId,
                        groupId: '',
                        groupName: 'Seance AQA',
                        category: 'enfants',
                        pool: 'Bassin Principal',
                        sessionDate: DateTime.now().toIso8601String(),
                        startTime: '09:00',
                        endTime: '10:00',
                        status: 'scheduled',
                      );
                QuickSessionLoggerSheet.show(context, sessionModel).then((saved) {
                  if (saved == true) {
                    _isInitialized = false;
                    ref.invalidate(sessionDetailProvider(widget.sessionId));
                  }
                });
              },
              icon: const Icon(Icons.bolt_rounded, color: AqaTheme.accentTeal, size: 18.0),
              label: const Text(
                '3 Etapes',
                style: TextStyle(
                  color: AqaTheme.accentTeal,
                  fontSize: 12.0,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.person_add_outlined),
              tooltip: 'Ajouter Nageur Invite',
              onPressed: _addGuestSwimmer,
            ),
          ],
        ],
      ),
      body: sessionAsync.when(
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
                  'Erreur de chargement: $err',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AqaTheme.textMuted),
                ),
                const SizedBox(height: 16.0),
                ElevatedButton(
                  onPressed: () => ref.invalidate(sessionDetailProvider(widget.sessionId)),
                  child: const Text('Reessayer'),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          _populateFromData(data);
          final groupName = _sessionData?['groupName'] as String? ??
              _sessionData?['group']?['name'] as String? ??
              'Groupe';
          final sessionDate = _sessionData?['sessionDate'] as String? ?? '';
          final dateStr =
              sessionDate.length >= 10 ? sessionDate.substring(0, 10) : sessionDate;
          final startTime = _sessionData?['startTime'] as String? ?? '09:00';
          final endTime = _sessionData?['endTime'] as String? ?? '10:00';

          final presentCount = _records.where((r) => r.isPresent).length;
          final absentCount = _records.where((r) => r.isAbsent).length;
          final lateCount = _records.where((r) => r.isLate).length;
          final excusedCount = _records.where((r) => r.isExcused).length;

          return Column(
            children: [
              if (_isViewOnly)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  color: AqaTheme.surfaceSecondary,
                  child: const Row(
                    children: [
                      Icon(Icons.lock_outline, color: AqaTheme.textLightMuted, size: 16.0),
                      SizedBox(width: 8.0),
                      Expanded(
                        child: Text(
                          'Role Assistant: Mode lecture seule.',
                          style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                        ),
                      ),
                    ],
                  ),
                ),

              // Summary Header
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: const BoxDecoration(
                  color: AqaTheme.surfaceDark,
                  border: Border(bottom: BorderSide(color: AqaTheme.borderSubtle)),
                ),
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
                                groupName,
                                style: const TextStyle(
                                  color: AqaTheme.textPrimary,
                                  fontSize: 16.0,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 2.0),
                              Text(
                                '$dateStr • $startTime - $endTime',
                                style: const TextStyle(
                                  color: AqaTheme.accentTeal,
                                  fontSize: 12.0,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (!_isViewOnly)
                          TextButton.icon(
                            onPressed: () {
                              setState(() {
                                for (final r in _records) {
                                  r.status = 'PRESENT';
                                }
                              });
                            },
                            icon: const Icon(
                              Icons.done_all_rounded,
                              size: 16.0,
                              color: AqaTheme.statusSuccess,
                            ),
                            label: const Text(
                              'Tout Present',
                              style: TextStyle(
                                color: AqaTheme.statusSuccess,
                                fontSize: 12.0,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12.0),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildCountBadge('Present', presentCount, AqaTheme.statusSuccess),
                        _buildCountBadge('Absent', absentCount, AqaTheme.statusDanger),
                        _buildCountBadge('Retard', lateCount, AqaTheme.statusWarning),
                        _buildCountBadge('Excuse', excusedCount, AqaTheme.statusInfo),
                      ],
                    ),
                  ],
                ),
              ),

              // Main Scrollable Content (Swimmers + Session Rating Card)
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16.0),
                  children: [
                    if (_records.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(28.0),
                        decoration: BoxDecoration(
                          color: AqaTheme.surfaceDark,
                          borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                          border: Border.all(color: AqaTheme.borderSubtle),
                        ),
                        child: const Center(
                          child: Text(
                            'Aucun nageur inscrit pour cette seance.',
                            style: TextStyle(color: AqaTheme.textMuted),
                          ),
                        ),
                      )
                    else
                      ..._records.map(
                        (rec) => Padding(
                          padding: const EdgeInsets.only(bottom: 10.0),
                          child: _buildSwimmerAttendanceTile(rec),
                        ),
                      ),

                    const SizedBox(height: 14.0),
                    _buildSessionRatingSection(),
                  ],
                ),
              ),

              // Bottom Save Bar
              if (!_isViewOnly)
                Container(
                  padding: const EdgeInsets.all(16.0),
                  decoration: const BoxDecoration(
                    color: AqaTheme.surfaceDark,
                    border: Border(top: BorderSide(color: AqaTheme.borderSubtle)),
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14.0),
                      ),
                      onPressed: _isSaving ? null : _saveAttendance,
                      icon: _isSaving
                          ? const SizedBox(
                              height: 18.0,
                              width: 18.0,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.0,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.check_circle_outline, size: 18.0),
                      label: const Text('Enregistrer Presences & Note de Seance'),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSessionRatingSection() {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: AqaTheme.surfaceDark,
        borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
        border: Border.all(color: AqaTheme.primarySky.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.star_rounded, color: AqaTheme.statusWarning, size: 20.0),
              SizedBox(width: 8.0),
              Text(
                'Notation & Bilan de la Seance',
                style: TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 15.0,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (index) {
              final starValue = index + 1;
              final isSelected = starValue <= _sessionRatingStars;
              return IconButton(
                onPressed: _isViewOnly
                    ? null
                    : () => setState(() => _sessionRatingStars = starValue),
                icon: Icon(
                  isSelected ? Icons.star_rounded : Icons.star_outline_rounded,
                  color: isSelected ? AqaTheme.statusWarning : AqaTheme.textLightMuted,
                  size: 32.0,
                ),
              );
            }),
          ),
          const SizedBox(height: 10.0),
          const Text(
            'Intensite de la seance',
            style: TextStyle(
              color: AqaTheme.textMuted,
              fontSize: 12.0,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8.0),
          Wrap(
            spacing: 8.0,
            runSpacing: 8.0,
            children: ['Faible', 'Moderee', 'Haute', 'Max'].map((lvl) {
              final selected = _intensity == lvl;
              return ChoiceChip(
                label: Text(lvl),
                selected: selected,
                onSelected: _isViewOnly ? null : (_) => setState(() => _intensity = lvl),
                selectedColor: AqaTheme.primarySky,
                backgroundColor: AqaTheme.surfaceSecondary,
                labelStyle: TextStyle(
                  color: selected ? Colors.white : AqaTheme.textMuted,
                  fontSize: 12.0,
                  fontWeight: FontWeight.w600,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 12.0),
          const Text(
            'Dominante technique',
            style: TextStyle(
              color: AqaTheme.textMuted,
              fontSize: 12.0,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8.0),
          Wrap(
            spacing: 8.0,
            runSpacing: 8.0,
            children: [
              'Technique de Nage',
              'Endurance / Cardio',
              'Vitesse & Departs',
              'Flottabilite & Respiration',
              'Apnee & Immersion',
            ].map((item) {
              final selected = _focus == item;
              return ChoiceChip(
                label: Text(item),
                selected: selected,
                onSelected: _isViewOnly ? null : (_) => setState(() => _focus = item),
                selectedColor: AqaTheme.accentTeal.withValues(alpha: 0.25),
                backgroundColor: AqaTheme.surfaceSecondary,
                labelStyle: TextStyle(
                  color: selected ? AqaTheme.accentTeal : AqaTheme.textMuted,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 12.0),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _waterTempController,
                  readOnly: _isViewOnly,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                  decoration: const InputDecoration(
                    labelText: 'Temperature Eau (C)',
                    prefixIcon: Icon(Icons.thermostat_outlined, size: 18.0),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12.0),
          TextField(
            controller: _sessionNotesController,
            readOnly: _isViewOnly,
            maxLines: 2,
            style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
            decoration: const InputDecoration(
              labelText: 'Bilan & Observations de Seance',
              hintText: 'Resume technique, points forts du groupe...',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCountBadge(String label, int count, Color color) {
    return Column(
      children: [
        Text(
          '$count',
          style: TextStyle(color: color, fontSize: 16.0, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 2.0),
        Text(
          label,
          style: const TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.0),
        ),
      ],
    );
  }

  Widget _buildSwimmerAttendanceTile(AttendanceRecordModel rec) {
    return Container(
      padding: const EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        color: AqaTheme.surfaceDark,
        borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
        border: Border.all(color: AqaTheme.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: rec.memberId.startsWith('guest-')
                      ? null
                      : () => context.push('/members/${rec.memberId}'),
                  child: Row(
                    children: [
                      Flexible(
                        child: Text(
                          rec.memberName,
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 14.0,
                            fontWeight: FontWeight.w700,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (rec.isGuest) ...[
                        const SizedBox(width: 6.0),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
                          decoration: BoxDecoration(
                            color: AqaTheme.surfaceSecondary,
                            borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                          ),
                          child: const Text(
                            'INVITE',
                            style: TextStyle(
                              color: AqaTheme.accentTeal,
                              fontSize: 9.0,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              if (!_isViewOnly)
                IconButton(
                  icon: Icon(
                    rec.notes != null && rec.notes!.isNotEmpty
                        ? Icons.comment_rounded
                        : Icons.add_comment_outlined,
                    size: 18.0,
                    color: rec.notes != null && rec.notes!.isNotEmpty
                        ? AqaTheme.accentTeal
                        : AqaTheme.textLightMuted,
                  ),
                  tooltip: 'Note individuelle',
                  onPressed: () => _editSwimmerNote(rec),
                  visualDensity: VisualDensity.compact,
                ),
              if (!rec.memberId.startsWith('guest-'))
                IconButton(
                  icon: const Icon(
                    Icons.insights_rounded,
                    size: 18.0,
                    color: AqaTheme.primarySky,
                  ),
                  tooltip: 'Suivi Technique Nageur',
                  onPressed: () => context.push('/members/${rec.memberId}'),
                  visualDensity: VisualDensity.compact,
                ),
            ],
          ),
          if (rec.notes != null && rec.notes!.isNotEmpty) ...[
            const SizedBox(height: 4.0),
            Text(
              'Note: ${rec.notes}',
              style: const TextStyle(
                color: AqaTheme.accentTeal,
                fontSize: 11.5,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
          const SizedBox(height: 8.0),
          Row(
            children: [
              _buildStatusButton(rec, 'PRESENT', 'Present', AqaTheme.statusSuccess),
              const SizedBox(width: 6.0),
              _buildStatusButton(rec, 'ABSENT', 'Absent', AqaTheme.statusDanger),
              const SizedBox(width: 6.0),
              _buildStatusButton(rec, 'LATE', 'Retard', AqaTheme.statusWarning),
              const SizedBox(width: 6.0),
              _buildStatusButton(rec, 'EXCUSED', 'Excuse', AqaTheme.statusInfo),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusButton(
    AttendanceRecordModel rec,
    String statusKey,
    String label,
    Color color,
  ) {
    final isSelected = rec.status == statusKey;

    return Expanded(
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
          backgroundColor: isSelected ? color.withValues(alpha: 0.18) : Colors.transparent,
          side: BorderSide(
            color: isSelected ? color : AqaTheme.borderSubtle,
            width: isSelected ? 1.5 : 1.0,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
          ),
        ),
        onPressed: _isViewOnly
            ? null
            : () {
                setState(() {
                  rec.status = statusKey;
                });
              },
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? color : AqaTheme.textMuted,
            fontSize: 11.0,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
