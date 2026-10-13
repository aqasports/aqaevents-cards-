import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/swim_attendance.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/sync/offline_sync_manager.dart';
import '../../core/theme/aqa_theme.dart';

final sessionDetailProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, sessionId) async {
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
  final TextEditingController _sessionNotesController = TextEditingController();
  final TextEditingController _waterTempController = TextEditingController();

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

    final existingAttendance = (data['attendance'] as List<dynamic>?) ?? [];
    final groupMembers = (data['groupMembers'] as List<dynamic>?) ?? [];

    final Map<String, AttendanceRecordModel> recordMap = {};

    // First populate from group enrolled members as default PRESENT
    for (final m in groupMembers) {
      final mid = m['id'] as String;
      recordMap[mid] = AttendanceRecordModel(
        memberId: mid,
        memberName: m['fullName'] as String? ?? 'Swimmer',
        dateOfBirth: m['dateOfBirth'] as String?,
        photoUrl: m['photoUrl'] as String?,
        status: 'PRESENT',
        isGuest: false,
      );
    }

    // Overlay existing recorded attendance
    for (final att in existingAttendance) {
      final mid = att['memberId'] as String;
      final existing = AttendanceRecordModel.fromJson(att as Map<String, dynamic>);
      recordMap[mid] = existing;
    }

    _records.clear();
    _records.addAll(recordMap.values);

    if (_sessionData?['notes'] != null) {
      _sessionNotesController.text = _sessionData!['notes'].toString();
    }
    if (_sessionData?['waterTempC'] != null) {
      _waterTempController.text = _sessionData!['waterTempC'].toString();
    }

    _isInitialized = true;
  }

  Future<void> _saveAttendance() async {
    if (_isViewOnly || _isSaving) return;

    setState(() => _isSaving = true);

    final clientMutationId = '${DateTime.now().millisecondsSinceEpoch}-${widget.sessionId}';
    final payload = {
      'clientMutationId': clientMutationId,
      'records': _records.map((r) => r.toJson()).toList(),
      'sessionNotes': _sessionNotesController.text.trim(),
      'waterTempC': double.tryParse(_waterTempController.text.trim()),
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
            content: Text('Attendance sheet saved successfully'),
          ),
        );
        ref.invalidate(sessionDetailProvider(widget.sessionId));
        ref.invalidate(bootstrapProvider);
      }
    } catch (e) {
      // Save offline outbox mutation
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
            content: Text('Network unavailable. Attendance saved offline and queued for sync.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _addGuestSwimmer() {
    final nameController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AqaTheme.surfaceDark,
        title: const Text('Add Guest Swimmer', style: TextStyle(color: AqaTheme.textPrimary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Enter swimmer name to mark attendance as a guest for this session.',
              style: TextStyle(color: AqaTheme.textMuted, fontSize: 13.0),
            ),
            const SizedBox(height: 12.0),
            TextField(
              controller: nameController,
              decoration: const InputDecoration(hintText: 'Swimmer Full Name'),
              style: const TextStyle(color: AqaTheme.textPrimary),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AqaTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.trim().isNotEmpty) {
                setState(() {
                  _records.add(
                    AttendanceRecordModel(
                      memberId: 'guest-${DateTime.now().millisecondsSinceEpoch}',
                      memberName: '${nameController.text.trim()} (Guest)',
                      status: 'PRESENT',
                      isGuest: true,
                    ),
                  );
                });
                Navigator.pop(ctx);
              }
            },
            child: const Text('Add Guest'),
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
        title: const Text('Presence Sheet'),
        actions: [
          if (!_isViewOnly)
            IconButton(
              icon: const Icon(Icons.person_add_outlined),
              tooltip: 'Add Guest Swimmer',
              onPressed: _addGuestSwimmer,
            ),
        ],
      ),
      body: sessionAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AqaTheme.accentTeal),
        ),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: AqaTheme.statusDanger, size: 40.0),
              const SizedBox(height: 12.0),
              Text('Error loading session: $err', style: const TextStyle(color: AqaTheme.textMuted)),
              const SizedBox(height: 16.0),
              ElevatedButton(
                onPressed: () => ref.invalidate(sessionDetailProvider(widget.sessionId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (data) {
          _populateFromData(data);
          final groupName = _sessionData?['group']?['name'] as String? ?? 'Group';
          final sessionDate = _sessionData?['sessionDate'] as String? ?? '';
          final dateStr = sessionDate.length >= 10 ? sessionDate.substring(0, 10) : sessionDate;

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
                          'Assistant Role: View-only mode. Attendance cannot be modified.',
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
                        Text(
                          groupName,
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 16.0,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          dateStr,
                          style: const TextStyle(color: AqaTheme.accentTeal, fontSize: 13.0, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12.0),
                    // Quick counts counters
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildCountBadge('Present', presentCount, AqaTheme.statusSuccess),
                        _buildCountBadge('Absent', absentCount, AqaTheme.statusDanger),
                        _buildCountBadge('Late', lateCount, AqaTheme.statusWarning),
                        _buildCountBadge('Excused', excusedCount, AqaTheme.statusInfo),
                      ],
                    ),
                  ],
                ),
              ),

              // Swimmers List
              Expanded(
                child: _records.isEmpty
                    ? const Center(
                        child: Text('No swimmers found for this session', style: TextStyle(color: AqaTheme.textMuted)),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16.0),
                        itemCount: _records.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8.0),
                        itemBuilder: (ctx, idx) {
                          final rec = _records[idx];
                          return _buildSwimmerAttendanceTile(rec);
                        },
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
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14.0),
                    ),
                    onPressed: _isSaving ? null : _saveAttendance,
                    child: _isSaving
                        ? const SizedBox(
                            height: 20.0,
                            width: 20.0,
                            child: CircularProgressIndicator(strokeWidth: 2.0, color: Colors.white),
                          )
                        : const Text('Save Attendance Sheet'),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildCountBadge(String label, int count, Color color) {
    return Column(
      children: [
        Text(
          '$count',
          style: TextStyle(color: color, fontSize: 16.0, fontWeight: FontWeight.w700),
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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Text(
                      rec.memberName,
                      style: const TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 14.0,
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
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
                          'GUEST',
                          style: TextStyle(color: AqaTheme.accentTeal, fontSize: 9.0, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10.0),
          // 4 Status buttons
          Row(
            children: [
              _buildStatusButton(rec, 'PRESENT', 'Present', AqaTheme.statusSuccess),
              const SizedBox(width: 6.0),
              _buildStatusButton(rec, 'ABSENT', 'Absent', AqaTheme.statusDanger),
              const SizedBox(width: 6.0),
              _buildStatusButton(rec, 'LATE', 'Late', AqaTheme.statusWarning),
              const SizedBox(width: 6.0),
              _buildStatusButton(rec, 'EXCUSED', 'Excused', AqaTheme.statusInfo),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusButton(AttendanceRecordModel rec, String statusKey, String label, Color color) {
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
