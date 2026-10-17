import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/models/swim_attendance.dart';
import '../../core/models/swim_session.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/theme/aqa_theme.dart';
import 'attendance_screen.dart';

class _StrokeBarOption {
  final String key;
  final String labelFr;
  final String labelEn;
  final String labelAr;

  const _StrokeBarOption({
    required this.key,
    required this.labelFr,
    required this.labelEn,
    required this.labelAr,
  });

  String labelFor(String locale) {
    if (locale == 'ar') return labelAr;
    if (locale == 'en') return labelEn;
    return labelFr;
  }
}

class _QuickSwimmerEvalBilan {
  final String memberId;
  final String memberName;

  // 5 Progress Bars (0% to 200%)
  Map<String, double> bars = {
    'basics': 0,
    'crawl': 0,
    'backstroke': 0,
    'breaststroke': 0,
    'butterfly': 0,
  };
  String lastTouchedBar = 'basics';
  bool showAllBars = false;

  // Bilan fields
  int storedTotalDistanceMeters = 0;
  final TextEditingController volumeController = TextEditingController();
  final TextEditingController observationController = TextEditingController();
  final TextEditingController record50mController = TextEditingController();
  final TextEditingController recordApneaController = TextEditingController();
  final TextEditingController weightKgController = TextEditingController();
  final TextEditingController heightCmController = TextEditingController();
  final TextEditingController wordFromCoachController = TextEditingController();

  bool recordsUnlocked = false;
  String? badgeKey;
  String? badgeLabel;
  String? honorRequestType; // 'swimmer_of_the_month' | 'swimmer_of_the_year' | null

  bool touched = false;

  _QuickSwimmerEvalBilan({
    required this.memberId,
    required this.memberName,
  });

  /// Volume only appears in Crawl or other bars after Basics has 1% or above.
  /// No volume for a Basic-level swimmer.
  bool get isVolumeAllowed {
    final basicsPct = bars['basics'] ?? 0;
    if (basicsPct < 1) return false;
    final hasOtherProgress = (bars['crawl'] ?? 0) > 0 ||
        (bars['backstroke'] ?? 0) > 0 ||
        (bars['breaststroke'] ?? 0) > 0 ||
        (bars['butterfly'] ?? 0) > 0;
    return lastTouchedBar != 'basics' || hasOtherProgress;
  }

  void dispose() {
    volumeController.dispose();
    observationController.dispose();
    record50mController.dispose();
    recordApneaController.dispose();
    weightKgController.dispose();
    heightCmController.dispose();
    wordFromCoachController.dispose();
  }
}

class QuickSessionLoggerSheet extends ConsumerStatefulWidget {
  final SwimSessionModel session;

  const QuickSessionLoggerSheet({
    super.key,
    required this.session,
  });

  static Future<bool?> show(BuildContext context, SwimSessionModel session) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => QuickSessionLoggerSheet(session: session),
    );
  }

  @override
  ConsumerState<QuickSessionLoggerSheet> createState() => _QuickSessionLoggerSheetState();
}

class _QuickSessionLoggerSheetState extends ConsumerState<QuickSessionLoggerSheet> {
  // 0: Presences (Binary), 1: Evaluation (Progress Bars 0-200% ONLY), 2: Bilan
  int _currentStep = 0;
  bool _isInitialized = false;
  bool _isSaving = false;
  bool _showAllBarsGlobal = false;

  final List<AttendanceRecordModel> _records = [];
  final Map<String, _QuickSwimmerEvalBilan> _evolutions = {};
  String? _selectedBilanMemberId;

  bool _monthHonorLocked = false;
  String? _monthHonorWinnerName;
  bool _yearHonorLocked = false;
  String? _yearHonorWinnerName;

  int _sessionRating = 5;
  String _focus = 'Technique Crawl & Respiration';
  int _discipline = 5;
  final TextEditingController _summaryController = TextEditingController();

  static const List<_StrokeBarOption> _strokeBarOptions = [
    _StrokeBarOption(
      key: 'basics',
      labelFr: '1 - Basics',
      labelEn: '1 - Basics',
      labelAr: '1 - الأساسيات',
    ),
    _StrokeBarOption(
      key: 'crawl',
      labelFr: '2 - Crawl',
      labelEn: '2 - Crawl',
      labelAr: '2 - الكراول',
    ),
    _StrokeBarOption(
      key: 'backstroke',
      labelFr: '3 - Backstroke',
      labelEn: '3 - Backstroke',
      labelAr: '3 - الظهر',
    ),
    _StrokeBarOption(
      key: 'breaststroke',
      labelFr: '4 - Breaststroke (Brasse)',
      labelEn: '4 - Breaststroke (Brasse)',
      labelAr: '4 - الصدر (Brasse)',
    ),
    _StrokeBarOption(
      key: 'butterfly',
      labelFr: '5 - Butterfly',
      labelEn: '5 - Butterfly',
      labelAr: '5 - الفراشة',
    ),
  ];

  static const List<Map<String, String>> _badgeOptions = [
    {'key': 'starter', 'label': 'Starter', 'asset': 'assets/images/badges/starter.png'},
    {'key': 'beginner', 'label': 'Beginner', 'asset': 'assets/images/badges/beginner.png'},
    {'key': 'floater', 'label': 'Floater', 'asset': 'assets/images/badges/floater.png'},
    {'key': 'crawler', 'label': 'Crawler', 'asset': 'assets/images/badges/crawler.png'},
    {'key': 'leaf', 'label': 'Leaf', 'asset': 'assets/images/badges/leaf.png'},
    {'key': 'brasseur', 'label': 'Brasseur', 'asset': 'assets/images/badges/brasseur.png'},
    {'key': 'butterfly', 'label': 'Butterfly', 'asset': 'assets/images/badges/butterfly.png'},
    {'key': 'full_swimmer', 'label': 'Full swimmer', 'asset': 'assets/images/badges/full_swimmer.png'},
    {'key': 'dolphin', 'label': 'Dolphin', 'asset': 'assets/images/badges/dolphin.png'},
    {'key': 'shark', 'label': 'Shark', 'asset': 'assets/images/badges/shark.png'},
    {'key': 'orca', 'label': 'Orca', 'asset': 'assets/images/badges/orca.png'},
    {'key': 'whale', 'label': 'Whale', 'asset': 'assets/images/badges/whale.png'},
    {'key': 'kraken', 'label': 'Kraken', 'asset': 'assets/images/badges/kraken.png'},
    {'key': 'mosasaurus', 'label': 'Mosasaurus', 'asset': 'assets/images/badges/mosasaurus.png'},
    {'key': 'tsunami', 'label': 'Tsunami', 'asset': 'assets/images/badges/tsunami.png'},
  ];

  @override
  void dispose() {
    for (final evo in _evolutions.values) {
      evo.dispose();
    }
    _summaryController.dispose();
    super.dispose();
  }

  void _initFromSessionData(Map<String, dynamic> data) {
    if (_isInitialized) return;

    final rawMembers = (data['members'] as List<dynamic>?) ??
        (data['groupMembers'] as List<dynamic>?) ??
        [];

    _records.clear();
    for (final m in rawMembers) {
      if (m is Map<String, dynamic>) {
        final rec = AttendanceRecordModel.fromJson(m);
        _records.add(rec);

        final evo = _QuickSwimmerEvalBilan(
          memberId: rec.memberId,
          memberName: rec.memberName,
        );

        final rawBars = m['bars'] as Map<String, dynamic>?;
        if (rawBars != null) {
          for (final opt in _strokeBarOptions) {
            final v = rawBars[opt.key];
            if (v is num) {
              evo.bars[opt.key] = v.toDouble().clamp(0.0, 200.0);
            }
          }
        }
        final lt = m['lastTouchedBar'] as String?;
        if (lt != null && evo.bars.containsKey(lt)) {
          evo.lastTouchedBar = lt;
        }
        evo.storedTotalDistanceMeters = (m['totalDistanceMeters'] as num?)?.toInt() ?? 0;

        final r50 = m['record50m'];
        if (r50 is num && r50 > 0) {
          evo.record50mController.text = r50.toString();
        }
        final rApnea = m['recordApnea'];
        if (rApnea is num && rApnea > 0) {
          evo.recordApneaController.text = rApnea.toString();
        }
        final wKg = m['weightKg'];
        if (wKg is num && wKg > 0) {
          evo.weightKgController.text = wKg.toString();
        }
        final hCm = m['heightCm'];
        if (hCm is num && hCm > 0) {
          evo.heightCmController.text = hCm.toString();
        }
        final wCoach = m['wordFromCoach'] as String?;
        if (wCoach != null && wCoach.isNotEmpty) {
          evo.wordFromCoachController.text = wCoach;
        }
        final bKey = m['badgeKey'] as String?;
        final bLabel = m['badgeLabel'] as String?;
        if (bKey != null && bKey.isNotEmpty) {
          evo.badgeKey = bKey;
          evo.badgeLabel = bLabel;
        }

        _evolutions[rec.memberId] = evo;
      }
    }

    final firstPresent = _records.where((r) => r.isPresent).firstOrNull;
    _selectedBilanMemberId = firstPresent?.memberId ??
        (_records.isNotEmpty ? _records.first.memberId : null);

    final lockStatus = data['honorLockStatus'] as Map<String, dynamic>?;
    if (lockStatus != null) {
      _monthHonorLocked = lockStatus['swimmerOfTheMonthLocked'] == true;
      final mw = lockStatus['swimmerOfTheMonthWinner'] as Map<String, dynamic>?;
      _monthHonorWinnerName = mw?['memberName'] as String?;

      _yearHonorLocked = lockStatus['swimmerOfTheYearLocked'] == true;
      final yw = lockStatus['swimmerOfTheYearWinner'] as Map<String, dynamic>?;
      _yearHonorWinnerName = yw?['memberName'] as String?;
    }

    final existingRating = data['sessionRating'] as Map<String, dynamic>?;
    if (existingRating != null) {
      _sessionRating = (existingRating['rating'] as num?)?.toInt() ?? 5;
      if (existingRating['focus'] is String) {
        _focus = existingRating['focus'] as String;
      }
      _discipline = (existingRating['discipline'] as num?)?.toInt() ?? 5;
      if (existingRating['summary'] is String) {
        _summaryController.text = existingRating['summary'] as String;
      }
    }

    _isInitialized = true;
  }

  Future<void> _submitQuickLog(AppI18n i18n) async {
    if (_isSaving) return;

    if (!widget.session.isEvaluationUnlocked) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AqaTheme.statusWarning,
          content: Text(
            i18n.t(
              'sessions.eval_locked_dialog_desc',
              {'time': widget.session.unlockTimeFormatted},
            ),
          ),
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    final client = ref.read(apiClientProvider);

    final presentIds = _records.where((r) => r.isPresent).map((r) => r.memberId).toSet();

    final quickEvolutionsPayload = _evolutions.entries
        .where((e) => presentIds.contains(e.key) && !e.key.startsWith('guest-'))
        .map((e) {
          final evo = e.value;
          final vol = evo.isVolumeAllowed
              ? int.tryParse(evo.volumeController.text.trim())
              : 0;
          final r50 = double.tryParse(evo.record50mController.text.trim());
          final rApnea = double.tryParse(evo.recordApneaController.text.trim());
          final wKg = double.tryParse(evo.weightKgController.text.trim());
          final hCm = double.tryParse(evo.heightCmController.text.trim());
          final obs = evo.observationController.text.trim();
          final wordCoach = evo.wordFromCoachController.text.trim();

          return <String, dynamic>{
            'memberId': e.key,
            'bars': {
              for (final b in evo.bars.entries) b.key: b.value.round().clamp(0, 200),
            },
            'lastTouchedBar': evo.lastTouchedBar,
            if (vol != null && vol > 0) 'sessionVolumeMeters': vol,
            if (obs.isNotEmpty) 'observation': obs,
            if (r50 != null && r50 > 0) 'record50m': r50,
            if (rApnea != null && rApnea > 0) 'recordApnea': rApnea,
            if (wKg != null && wKg > 0) 'weightKg': wKg,
            if (hCm != null && hCm > 0) 'heightCm': hCm,
            if (wordCoach.isNotEmpty) 'wordFromCoach': wordCoach,
            if (evo.badgeKey != null) 'badgeKey': evo.badgeKey,
            if (evo.badgeLabel != null) 'recommendedLevel': evo.badgeLabel,
            if (evo.honorRequestType != null) 'honorRequestType': evo.honorRequestType,
          };
        })
        .toList();

    final payload = {
      'records': _records.map((r) => r.toJson()).toList(),
      'closeSession': true,
      'sessionRating': {
        'rating': _sessionRating,
        'focus': _focus,
        'discipline': _discipline,
        'summary': _summaryController.text.trim(),
      },
      'quickEvolutions': quickEvolutionsPayload,
    };

    try {
      final response = await client.dio.put(
        ApiEndpoints.submitAttendance(widget.session.id),
        data: payload,
      );

      if (response.statusCode == 200 && mounted) {
        ref.invalidate(sessionDetailProvider(widget.session.id));
        ref.invalidate(bootstrapProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AqaTheme.statusSuccess,
            content: Text(i18n.t('attendance.saved_success')),
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AqaTheme.statusDanger,
            content: Text('${i18n.t('common.error')}: $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(sessionDetailProvider(widget.session.id));
    final i18n = ref.watch(i18nProvider);
    final mediaQuery = MediaQuery.of(context);

    return Container(
      height: mediaQuery.size.height * 0.92,
      decoration: const BoxDecoration(
        color: AqaTheme.bgDark,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24.0)),
        border: Border(
          top: BorderSide(color: AqaTheme.borderTeal, width: 1.5),
        ),
      ),
      child: Column(
        children: [
          // Drag handle & Header
          Container(
            padding: const EdgeInsets.fromLTRB(20.0, 12.0, 16.0, 14.0),
            decoration: const BoxDecoration(
              color: AqaTheme.surfaceDark,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24.0)),
              border: Border(bottom: BorderSide(color: AqaTheme.borderSubtle)),
            ),
            child: Column(
              children: [
                Container(
                  width: 42.0,
                  height: 4.0,
                  decoration: BoxDecoration(
                    color: AqaTheme.surfaceTertiary,
                    borderRadius: BorderRadius.circular(2.0),
                  ),
                ),
                const SizedBox(height: 12.0),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8.0),
                      decoration: BoxDecoration(
                        color: AqaTheme.accentTeal.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(10.0),
                        border: Border.all(color: AqaTheme.borderTeal),
                      ),
                      child: const Icon(
                        Icons.bolt_rounded,
                        color: AqaTheme.accentTeal,
                        size: 20.0,
                      ),
                    ),
                    const SizedBox(width: 12.0),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            i18n.t('quick_logger.title'),
                            style: const TextStyle(
                              color: AqaTheme.textPrimary,
                              fontSize: 15.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 2.0),
                          Text(
                            '${widget.session.groupName} • ${widget.session.startTime} - ${widget.session.endTime}',
                            style: const TextStyle(
                              color: AqaTheme.textMuted,
                              fontSize: 12.0,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      icon: const Icon(Icons.close_rounded, color: AqaTheme.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 12.0),

                // 3-Step Indicator Strip: 1. Presences | 2. Evaluation (Bars 0-200%) | 3. Bilan
                Row(
                  children: [
                    Expanded(
                      child: _buildStepPill(
                        stepIndex: 0,
                        label: i18n.t('quick_logger.step1'),
                      ),
                    ),
                    const SizedBox(width: 6.0),
                    Expanded(
                      child: _buildStepPill(
                        stepIndex: 1,
                        label: i18n.locale == 'ar'
                            ? '2. التقييم (0-200%)'
                            : i18n.locale == 'en'
                                ? '2. Evaluation (0-200%)'
                                : '2. Evaluation (0-200%)',
                      ),
                    ),
                    const SizedBox(width: 6.0),
                    Expanded(
                      child: _buildStepPill(
                        stepIndex: 2,
                        label: i18n.locale == 'ar'
                            ? '3. الحصيلة (Bilan)'
                            : i18n.locale == 'en'
                                ? '3. Bilan'
                                : '3. Bilan',
                      ),
                    ),
                  ],
                ),
                if (!widget.session.isEvaluationUnlocked) ...[
                  const SizedBox(height: 10.0),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
                    decoration: BoxDecoration(
                      color: AqaTheme.statusWarningBg,
                      borderRadius: BorderRadius.circular(10.0),
                      border: Border.all(color: AqaTheme.statusWarning.withValues(alpha: 0.5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.lock_clock_outlined,
                          color: AqaTheme.statusWarning,
                          size: 16.0,
                        ),
                        const SizedBox(width: 8.0),
                        Expanded(
                          child: Text(
                            i18n.t('sessions.eval_locked_dialog_desc', {
                              'time': widget.session.unlockTimeFormatted,
                            }),
                            style: const TextStyle(
                              color: AqaTheme.statusWarning,
                              fontSize: 11.0,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Body
          Expanded(
            child: sessionAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: AqaTheme.accentTeal),
              ),
              error: (err, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Text(
                    err.toString(),
                    style: const TextStyle(color: AqaTheme.textMuted),
                  ),
                ),
              ),
              data: (data) {
                _initFromSessionData(data);
                if (_currentStep == 0) {
                  return _buildStep1BinaryPresence(i18n);
                } else if (_currentStep == 1) {
                  return _buildStep2ProgressBarsOnly(i18n);
                } else {
                  return _buildStep3SwimmerBilan(i18n);
                }
              },
            ),
          ),

          // Footer Navigation
          Container(
            padding: const EdgeInsets.fromLTRB(16.0, 12.0, 16.0, 16.0),
            decoration: const BoxDecoration(
              color: AqaTheme.surfaceDark,
              border: Border(top: BorderSide(color: AqaTheme.borderSubtle)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  if (_currentStep > 0) ...[
                    OutlinedButton.icon(
                      onPressed: () => setState(() => _currentStep -= 1),
                      icon: const Icon(Icons.arrow_back_rounded, size: 16.0),
                      label: Text(i18n.t('quick_logger.prev_step')),
                    ),
                    const SizedBox(width: 10.0),
                  ],
                  Expanded(
                    child: _currentStep < 2
                        ? AqaIslandButton(
                            label: i18n.t('quick_logger.next_step'),
                            icon: Icons.arrow_forward_rounded,
                            onPressed: () => setState(() => _currentStep += 1),
                          )
                        : AqaIslandButton(
                            label: !widget.session.isEvaluationUnlocked
                                ? i18n.t('sessions.eval_locked_badge', {
                                    'time': widget.session.unlockTimeFormatted,
                                  })
                                : _isSaving
                                    ? i18n.t('common.saving')
                                    : i18n.t('quick_logger.finish_cta'),
                            icon: !widget.session.isEvaluationUnlocked
                                ? Icons.lock_clock_outlined
                                : Icons.check_rounded,
                            loading: _isSaving,
                            color: !widget.session.isEvaluationUnlocked
                                ? AqaTheme.surfaceSecondary
                                : AqaTheme.statusSuccess,
                            textColor: !widget.session.isEvaluationUnlocked
                                ? AqaTheme.textLightMuted
                                : Colors.white,
                            onPressed: !widget.session.isEvaluationUnlocked
                                ? () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        backgroundColor: AqaTheme.statusWarning,
                                        content: Text(
                                          i18n.t('sessions.eval_locked_dialog_desc', {
                                            'time': widget.session.unlockTimeFormatted,
                                          }),
                                        ),
                                      ),
                                    );
                                  }
                                : () => _submitQuickLog(i18n),
                          ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepPill({required int stepIndex, required String label}) {
    final isCurrent = _currentStep == stepIndex;
    final isDone = _currentStep > stepIndex;
    final color = isCurrent
        ? AqaTheme.accentTeal
        : isDone
            ? AqaTheme.statusSuccess
            : AqaTheme.textLightMuted;

    return InkWell(
      onTap: () => setState(() => _currentStep = stepIndex),
      borderRadius: BorderRadius.circular(10.0),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 6.0),
        decoration: BoxDecoration(
          color: isCurrent
              ? AqaTheme.accentTeal.withValues(alpha: 0.14)
              : const Color(0xFF090F1E),
          borderRadius: BorderRadius.circular(10.0),
          border: Border.all(
            color: isCurrent ? AqaTheme.accentTeal : AqaTheme.borderSubtle,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: color,
            fontSize: 11.0,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }

  /// STEP 1: Strictly Binary PRESENT / ABSENT
  Widget _buildStep1BinaryPresence(AppI18n i18n) {
    final presentCount = _records.where((r) => r.isPresent).length;
    final absentCount = _records.where((r) => r.isAbsent).length;

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(14.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      i18n.t('quick_logger.step1_desc'),
                      style: const TextStyle(
                        color: AqaTheme.textMuted,
                        fontSize: 12.0,
                      ),
                    ),
                    const SizedBox(height: 6.0),
                    Row(
                      children: [
                        Text(
                          '$presentCount ${i18n.t('attendance.present')}',
                          style: const TextStyle(
                            color: AqaTheme.statusSuccess,
                            fontSize: 13.0,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(width: 12.0),
                        Text(
                          '$absentCount ${i18n.t('attendance.absent')}',
                          style: const TextStyle(
                            color: AqaTheme.statusDanger,
                            fontSize: 13.0,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: () {
                  setState(() {
                    for (final r in _records) {
                      r.status = 'PRESENT';
                    }
                  });
                },
                child: Text(
                  i18n.t('attendance.mark_all_present'),
                  style: const TextStyle(
                    color: AqaTheme.accentTeal,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12.0),
        ..._records.map((rec) {
          final isPresent = rec.isPresent;
          final color = isPresent ? AqaTheme.statusSuccess : AqaTheme.statusDanger;
          return AqaDoubleBezelCard(
            margin: const EdgeInsets.only(bottom: 8.0),
            outerRadius: 16.0,
            padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
            onTap: () {
              setState(() {
                rec.toggleBinaryStatus();
              });
            },
            child: Row(
              children: [
                Icon(
                  isPresent ? Icons.check_circle_rounded : Icons.cancel_rounded,
                  color: color,
                  size: 22.0,
                ),
                const SizedBox(width: 12.0),
                Expanded(
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
                      if (rec.isNewClient) ...[
                        const SizedBox(width: 6.0),
                        const AqaNewClientBadge(compact: true),
                      ],
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: color),
                  ),
                  child: Text(
                    isPresent
                        ? i18n.t('attendance.present').toUpperCase()
                        : i18n.t('attendance.absent').toUpperCase(),
                    style: TextStyle(
                      color: color,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  /// STEP 2: Evaluation — Progress Bars ONLY (0% to 200%). NO badges, NO stars.
  /// Shows the last touched progress bar by default, with a button to show all 5 progress bars.
  Widget _buildStep2ProgressBarsOnly(AppI18n i18n) {
    final presentRecords = _records.where((r) => r.isPresent).toList();

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                i18n.locale == 'ar'
                    ? 'مرر إصبعك لتقييم السباحة (0% - 100% تقني | 100% - 200% نخبة: تحمل، سرعة، قوة)'
                    : i18n.locale == 'en'
                        ? 'Slide finger to evaluate swim (0% - 100% Technical | 100% - 200% Elite: Endurance, Speed, Strength)'
                        : 'Glissez le doigt sur la barre (0% - 100% Technique | 100% - 200% Elite : Endurance, Vitesse, Force)',
                style: const TextStyle(
                  color: AqaTheme.textMuted,
                  fontSize: 12.0,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 10.0),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    setState(() {
                      _showAllBarsGlobal = !_showAllBarsGlobal;
                      for (final evo in _evolutions.values) {
                        evo.showAllBars = _showAllBarsGlobal;
                      }
                    });
                  },
                  icon: Icon(
                    _showAllBarsGlobal ? Icons.unfold_less_rounded : Icons.tune_rounded,
                    size: 16.0,
                    color: AqaTheme.accentTeal,
                  ),
                  label: Text(
                    _showAllBarsGlobal
                        ? (i18n.locale == 'ar'
                            ? 'إظهار آخر شريط تم لمسه فقط'
                            : i18n.locale == 'en'
                                ? 'Show Last Touched Progress Bar Only'
                                : 'Afficher uniquement la derniere barre touchee')
                        : (i18n.locale == 'ar'
                            ? 'إظهار الأشرطة الخمسة كاملة (5 أشرطة)'
                            : i18n.locale == 'en'
                                ? 'Show All 5 Progress Bars'
                                : 'Afficher les 5 barres de progression'),
                    style: const TextStyle(
                      color: AqaTheme.accentTeal,
                      fontSize: 12.0,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12.0),
        ...presentRecords.map((rec) {
          final evo = _evolutions.putIfAbsent(
            rec.memberId,
            () => _QuickSwimmerEvalBilan(
              memberId: rec.memberId,
              memberName: rec.memberName,
            ),
          );
          final barsToShow = evo.showAllBars
              ? _strokeBarOptions
              : _strokeBarOptions.where((b) => b.key == evo.lastTouchedBar).toList();

          return AqaDoubleBezelCard(
            margin: const EdgeInsets.only(bottom: 12.0),
            padding: const EdgeInsets.all(14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Flexible(
                            child: Text(
                              rec.memberName,
                              style: const TextStyle(
                                color: AqaTheme.textPrimary,
                                fontSize: 15.0,
                                fontWeight: FontWeight.w800,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (rec.isNewClient) ...[
                            const SizedBox(width: 6.0),
                            const AqaNewClientBadge(compact: true),
                          ],
                        ],
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () {
                        setState(() {
                          evo.showAllBars = !evo.showAllBars;
                        });
                      },
                      icon: Icon(
                        evo.showAllBars ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                        size: 16.0,
                        color: AqaTheme.accentTeal,
                      ),
                      label: Text(
                        evo.showAllBars
                            ? (i18n.locale == 'ar'
                                ? 'آخر شريط فقط'
                                : i18n.locale == 'en'
                                    ? 'Last touched'
                                    : 'Derniere barre')
                            : (i18n.locale == 'ar'
                                ? 'كل الأشرطة (5)'
                                : i18n.locale == 'en'
                                    ? 'Show all 5 bars'
                                    : 'Voir les 5 barres'),
                        style: const TextStyle(
                          color: AqaTheme.accentTeal,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),

                // Quick stroke selector pills when showing single last-touched bar
                if (!evo.showAllBars) ...[
                  const SizedBox(height: 6.0),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _strokeBarOptions.map((opt) {
                        final isCurrent = evo.lastTouchedBar == opt.key;
                        final pct = (evo.bars[opt.key] ?? 0).round();
                        return Padding(
                          padding: const EdgeInsets.only(right: 6.0),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(8.0),
                            onTap: () {
                              setState(() {
                                evo.lastTouchedBar = opt.key;
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8.0,
                                vertical: 5.0,
                              ),
                              decoration: BoxDecoration(
                                color: isCurrent
                                    ? AqaTheme.primarySky.withValues(alpha: 0.18)
                                    : const Color(0xFF080E1E),
                                borderRadius: BorderRadius.circular(8.0),
                                border: Border.all(
                                  color: isCurrent
                                      ? AqaTheme.primarySky
                                      : AqaTheme.borderSubtle,
                                ),
                              ),
                              child: Text(
                                '${opt.labelFor(i18n.locale)} ($pct%)',
                                style: TextStyle(
                                  color: isCurrent
                                      ? AqaTheme.textPrimary
                                      : AqaTheme.textMuted,
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
                const SizedBox(height: 10.0),

                ...barsToShow.map((barOpt) {
                  final val = (evo.bars[barOpt.key] ?? 0.0).clamp(0.0, 200.0);
                  final pctInt = val.round();
                  final isElite = val > 100.0;
                  final activeColor = isElite ? AqaTheme.statusWarning : AqaTheme.accentTeal;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: Text(
                                barOpt.labelFor(i18n.locale),
                                style: const TextStyle(
                                  color: AqaTheme.textPrimary,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8.0),
                            Text(
                              isElite
                                  ? '$pctInt% • Elite'
                                  : '$pctInt% • Technique (0-100%)',
                              style: TextStyle(
                                color: activeColor,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                        SliderTheme(
                          data: SliderTheme.of(context).copyWith(
                            activeTrackColor: activeColor,
                            inactiveTrackColor: AqaTheme.surfaceTertiary,
                            thumbColor: activeColor,
                            overlayColor: activeColor.withValues(alpha: 0.16),
                            trackHeight: 5.5,
                          ),
                          child: Slider(
                            value: val,
                            min: 0.0,
                            max: 200.0,
                            divisions: 200,
                            label: '$pctInt%',
                            onChanged: (newVal) {
                              setState(() {
                                evo.bars[barOpt.key] = newVal.roundToDouble();
                                evo.lastTouchedBar = barOpt.key;
                                evo.touched = true;
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          );
        }),
      ],
    );
  }

  /// STEP 3: Bilan (Volume, Observation, Stored Records, Physical Data, Badge Choose, Honor Request, Word from Coach)
  Widget _buildStep3SwimmerBilan(AppI18n i18n) {
    final presentRecords = _records.where((r) => r.isPresent).toList();
    if (presentRecords.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Text(
            i18n.locale == 'ar'
                ? 'لا يوجد سباحون حاضرون في هذه الحصة.'
                : i18n.locale == 'en'
                    ? 'No present swimmers in this session.'
                    : 'Aucun nageur marque present pour cette seance.',
            style: const TextStyle(color: AqaTheme.textMuted),
          ),
        ),
      );
    }

    final activeMemberId = presentRecords.any((r) => r.memberId == _selectedBilanMemberId)
        ? _selectedBilanMemberId!
        : presentRecords.first.memberId;

    final evo = _evolutions.putIfAbsent(
      activeMemberId,
      () => _QuickSwimmerEvalBilan(
        memberId: activeMemberId,
        memberName: presentRecords.firstWhere((r) => r.memberId == activeMemberId).memberName,
      ),
    );

    final sessionVol = int.tryParse(evo.volumeController.text.trim()) ?? 0;
    final projectedTotalMeters =
        evo.storedTotalDistanceMeters + (evo.isVolumeAllowed && sessionVol > 0 ? sessionVol : 0);

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        // Swimmer Selector Strip for Bilan
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                i18n.locale == 'ar'
                    ? 'اختر السباح لتعبئة الحصيلة (Bilan):'
                    : i18n.locale == 'en'
                        ? 'Select swimmer for Bilan:'
                        : 'Selectionnez le nageur pour son Bilan :',
                style: const TextStyle(
                  color: AqaTheme.textMuted,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8.0),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: presentRecords.map((rec) {
                    final selected = rec.memberId == activeMemberId;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(10.0),
                        onTap: () {
                          setState(() {
                            _selectedBilanMemberId = rec.memberId;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12.0,
                            vertical: 8.0,
                          ),
                          decoration: BoxDecoration(
                            color: selected
                                ? AqaTheme.accentTeal.withValues(alpha: 0.16)
                                : const Color(0xFF080E1E),
                            borderRadius: BorderRadius.circular(10.0),
                            border: Border.all(
                              color: selected ? AqaTheme.accentTeal : AqaTheme.borderSubtle,
                              width: selected ? 1.5 : 1.0,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                rec.memberName,
                                style: TextStyle(
                                  color: selected ? AqaTheme.accentTeal : AqaTheme.textPrimary,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              if (rec.isNewClient) ...[
                                const SizedBox(width: 6.0),
                                const AqaNewClientBadge(compact: true),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12.0),

        // 1. Volume (Only appears in Crawl or other bars after Basics has 1% or above)
        if (evo.isVolumeAllowed) ...[
          AqaDoubleBezelCard(
            padding: const EdgeInsets.all(14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        i18n.locale == 'ar'
                            ? 'حجم الحصة (متر) - المسافة المقطوعة'
                            : i18n.locale == 'en'
                                ? 'Session Volume (meters)'
                                : 'Volume de la Seance (metres)',
                        style: const TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    Text(
                      'Total cumule: $projectedTotalMeters m',
                      style: const TextStyle(
                        color: AqaTheme.accentTeal,
                        fontSize: 12.0,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8.0),
                TextField(
                  controller: evo.volumeController,
                  keyboardType: TextInputType.number,
                  onChanged: (_) => setState(() {}),
                  style: const TextStyle(color: AqaTheme.textPrimary),
                  decoration: InputDecoration(
                    labelText: i18n.locale == 'ar'
                        ? 'المسافة في هذه الحصة (متر)'
                        : i18n.locale == 'en'
                            ? 'Distance in this session (m)'
                            : 'Distance nagee dans cette seance (m)',
                    hintText: 'Ex: 800',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12.0),
        ],

        // 2. Observation (optional)
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                i18n.locale == 'ar'
                    ? 'ملاحظة (اختياري)'
                    : i18n.locale == 'en'
                        ? 'Observation (optional)'
                        : 'Observation (optionnel)',
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8.0),
              TextField(
                controller: evo.observationController,
                maxLines: 2,
                style: const TextStyle(color: AqaTheme.textPrimary),
                decoration: InputDecoration(
                  hintText: i18n.locale == 'ar'
                      ? 'ملاحظة حول السباح...'
                      : i18n.locale == 'en'
                          ? 'Optional observation...'
                          : 'Observation facultative...',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12.0),

        // 3. Stored Records (50m record, apnea record) - Locked by default
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      i18n.locale == 'ar'
                          ? 'الأرقام القياسية المسجلة (50م وانقطاع النفس)'
                          : i18n.locale == 'en'
                              ? 'Stored Records (50m & Apnea)'
                              : 'Records Enregistres (50m & Apnee)',
                      style: const TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () {
                      setState(() {
                        evo.recordsUnlocked = !evo.recordsUnlocked;
                      });
                    },
                    icon: Icon(
                      evo.recordsUnlocked
                          ? Icons.lock_open_rounded
                          : Icons.lock_outline_rounded,
                      size: 15.0,
                      color: evo.recordsUnlocked
                          ? AqaTheme.statusWarning
                          : AqaTheme.accentTeal,
                    ),
                    label: Text(
                      evo.recordsUnlocked
                          ? (i18n.locale == 'ar'
                              ? 'قفل'
                              : i18n.locale == 'en'
                                  ? 'Lock'
                                  : 'Verrouiller')
                          : (i18n.locale == 'ar'
                              ? 'تحديث رقم قياسي'
                              : i18n.locale == 'en'
                                  ? 'Update Record'
                                  : 'Modifier Record'),
                      style: TextStyle(
                        color: evo.recordsUnlocked
                            ? AqaTheme.statusWarning
                            : AqaTheme.accentTeal,
                        fontSize: 11.0,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8.0),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: evo.record50mController,
                      readOnly: !evo.recordsUnlocked,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: TextStyle(
                        color: evo.recordsUnlocked
                            ? AqaTheme.textPrimary
                            : AqaTheme.textMuted,
                      ),
                      decoration: InputDecoration(
                        labelText: i18n.locale == 'ar'
                            ? 'رقم 50م (ثانية)'
                            : i18n.locale == 'en'
                                ? '50m Record (s)'
                                : 'Record 50m (s)',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  Expanded(
                    child: TextField(
                      controller: evo.recordApneaController,
                      readOnly: !evo.recordsUnlocked,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: TextStyle(
                        color: evo.recordsUnlocked
                            ? AqaTheme.textPrimary
                            : AqaTheme.textMuted,
                      ),
                      decoration: InputDecoration(
                        labelText: i18n.locale == 'ar'
                            ? 'رقم انقطاع النفس (ثانية/م)'
                            : i18n.locale == 'en'
                                ? 'Apnea Record (s / m)'
                                : 'Record Apnee (s / m)',
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12.0),

        // 4. Physical Data (Stored: Weight & Tall)
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                i18n.locale == 'ar'
                    ? 'البيانات الجسدية المسجلة (الوزن والطول)'
                    : i18n.locale == 'en'
                        ? 'Stored Physical Data (Weight & Tall)'
                        : 'Donnees Physiques (Poids & Taille)',
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8.0),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: evo.weightKgController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(color: AqaTheme.textPrimary),
                      decoration: InputDecoration(
                        labelText: i18n.locale == 'ar'
                            ? 'الوزن (كغ)'
                            : i18n.locale == 'en'
                                ? 'Weight (kg)'
                                : 'Poids (kg)',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  Expanded(
                    child: TextField(
                      controller: evo.heightCmController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(color: AqaTheme.textPrimary),
                      decoration: InputDecoration(
                        labelText: i18n.locale == 'ar'
                            ? 'الطول (سم)'
                            : i18n.locale == 'en'
                                ? 'Tall / Height (cm)'
                                : 'Taille (cm)',
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12.0),

        // 5. Badge Choose (Horizontal Toggle Bar + Swimmer of the Month / Year)
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                i18n.locale == 'ar'
                    ? 'اختيار الشارة (مرر لاختيار شارة السباح)'
                    : i18n.locale == 'en'
                        ? 'Badge Choose (Slide Toggle Bar)'
                        : 'Choix du Badge (Barre glissante)',
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10.0),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _badgeOptions.map((b) {
                    final isSelected = evo.badgeKey == b['key'];
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(10.0),
                        onTap: () {
                          setState(() {
                            if (isSelected) {
                              evo.badgeKey = null;
                              evo.badgeLabel = null;
                            } else {
                              evo.badgeKey = b['key'];
                              evo.badgeLabel = b['label'];
                            }
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10.0,
                            vertical: 8.0,
                          ),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AqaTheme.accentTeal.withValues(alpha: 0.16)
                                : const Color(0xFF080E1E),
                            borderRadius: BorderRadius.circular(10.0),
                            border: Border.all(
                              color: isSelected
                                  ? AqaTheme.accentTeal
                                  : AqaTheme.borderSubtle,
                              width: isSelected ? 1.5 : 1.0,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Image.asset(
                                b['asset']!,
                                width: 22.0,
                                height: 22.0,
                                errorBuilder: (_, __, ___) => const Icon(
                                  Icons.military_tech_rounded,
                                  size: 18.0,
                                  color: AqaTheme.accentTeal,
                                ),
                              ),
                              const SizedBox(width: 6.0),
                              Text(
                                b['label']!,
                                style: TextStyle(
                                  color: isSelected
                                      ? AqaTheme.accentTeal
                                      : AqaTheme.textMuted,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
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
              const SizedBox(height: 12.0),
              Row(
                children: [
                  Expanded(
                    child: _buildHonorRequestChip(
                      evo: evo,
                      typeKey: 'swimmer_of_the_month',
                      label: i18n.locale == 'ar'
                          ? 'سباح الشهر'
                          : i18n.locale == 'en'
                              ? 'Swimmer of the Month'
                              : 'Nageur du Mois',
                      locked: _monthHonorLocked,
                      winnerName: _monthHonorWinnerName,
                    ),
                  ),
                  const SizedBox(width: 8.0),
                  Expanded(
                    child: _buildHonorRequestChip(
                      evo: evo,
                      typeKey: 'swimmer_of_the_year',
                      label: i18n.locale == 'ar'
                          ? 'سباح السنة'
                          : i18n.locale == 'en'
                              ? 'Swimmer of the Year'
                              : 'Nageur de l\'Annee',
                      locked: _yearHonorLocked,
                      winnerName: _yearHonorWinnerName,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12.0),

        // 6. Word from your Coach
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                i18n.locale == 'ar'
                    ? 'كلمة من مدربك (Word from your Coach)'
                    : i18n.locale == 'en'
                        ? 'Word from your Coach'
                        : 'Mot de votre Coach (Word from your Coach)',
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8.0),
              TextField(
                controller: evo.wordFromCoachController,
                maxLines: 3,
                style: const TextStyle(color: AqaTheme.textPrimary),
                decoration: InputDecoration(
                  hintText: i18n.locale == 'ar'
                      ? 'اكتب كلمة المدرب للسباح...'
                      : i18n.locale == 'en'
                          ? 'Edit Word from your Coach...'
                          : 'Modifier le mot du coach pour ce nageur...',
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHonorRequestChip({
    required _QuickSwimmerEvalBilan evo,
    required String typeKey,
    required String label,
    required bool locked,
    required String? winnerName,
  }) {
    final isSelected = evo.honorRequestType == typeKey;

    return InkWell(
      borderRadius: BorderRadius.circular(10.0),
      onTap: locked
          ? null
          : () {
              setState(() {
                evo.honorRequestType = isSelected ? null : typeKey;
              });
            },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 9.0),
        decoration: BoxDecoration(
          color: locked
              ? AqaTheme.surfaceSecondary.withValues(alpha: 0.4)
              : isSelected
                  ? AqaTheme.statusWarning.withValues(alpha: 0.16)
                  : const Color(0xFF080E1E),
          borderRadius: BorderRadius.circular(10.0),
          border: Border.all(
            color: locked
                ? AqaTheme.borderSubtle
                : isSelected
                    ? AqaTheme.statusWarning
                    : AqaTheme.borderSubtle,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  locked ? Icons.lock_rounded : Icons.military_tech_rounded,
                  size: 15.0,
                  color: locked
                      ? AqaTheme.textLightMuted
                      : isSelected
                          ? AqaTheme.statusWarning
                          : AqaTheme.accentTeal,
                ),
                const SizedBox(width: 5.0),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: locked ? AqaTheme.textMuted : AqaTheme.textPrimary,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2.0),
            Text(
              locked
                  ? (winnerName != null ? 'Elu: $winnerName' : 'Verrouille')
                  : (isSelected ? 'Demande ERP active' : 'Proposer a l\'ERP'),
              style: TextStyle(
                color: locked
                    ? AqaTheme.textLightMuted
                    : isSelected
                        ? AqaTheme.statusWarning
                        : AqaTheme.textMuted,
                fontSize: 10.0,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
