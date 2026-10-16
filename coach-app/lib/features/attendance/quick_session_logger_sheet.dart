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

class _QuickSwimmerEvolution {
  int starScore = 0; // 0 = unchanged, 1..5 = quick mastery score
  String? badgeKey;
  String? badgeLabel;
  String note = '';

  _QuickSwimmerEvolution();

  bool get hasChanges =>
      starScore > 0 || (badgeKey != null && badgeKey!.isNotEmpty) || note.trim().isNotEmpty;
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
  int _currentStep = 0; // 0: Binary Presence/Absence, 1: Evolution/Badges, 2: Session Rating
  bool _isInitialized = false;
  bool _isSaving = false;

  final List<AttendanceRecordModel> _records = [];
  final Map<String, _QuickSwimmerEvolution> _evolutions = {};

  int _sessionRating = 5;
  String _intensity = 'Soutenue';
  String _focus = 'Technique Crawl & Respiration';
  int _discipline = 5;
  final TextEditingController _summaryController = TextEditingController();

  static const List<Map<String, String>> _badgeOptions = [
    {'key': 'starter', 'label': 'Starter', 'asset': 'assets/images/badges/starter.png'},
    {'key': 'beginner', 'label': 'Beginner', 'asset': 'assets/images/badges/beginner.png'},
    {'key': 'floater', 'label': 'Floater', 'asset': 'assets/images/badges/floater.png'},
    {'key': 'leaf', 'label': 'Leaf', 'asset': 'assets/images/badges/leaf.png'},
    {'key': 'dolphin', 'label': 'Dolphin', 'asset': 'assets/images/badges/dolphin.png'},
    {'key': 'crawler', 'label': 'Crawler', 'asset': 'assets/images/badges/crawler.png'},
    {'key': 'brasseur', 'label': 'Brasseur', 'asset': 'assets/images/badges/brasseur.png'},
    {'key': 'butterfly', 'label': 'Butterfly', 'asset': 'assets/images/badges/butterfly.png'},
    {'key': 'shark', 'label': 'Shark', 'asset': 'assets/images/badges/shark.png'},
    {'key': 'orca', 'label': 'Orca', 'asset': 'assets/images/badges/orca.png'},
    {'key': 'whale', 'label': 'Whale', 'asset': 'assets/images/badges/whale.png'},
    {'key': 'kraken', 'label': 'Kraken', 'asset': 'assets/images/badges/kraken.png'},
    {'key': 'mosasaurus', 'label': 'Mosasaurus', 'asset': 'assets/images/badges/mosasaurus.png'},
    {'key': 'tsunami', 'label': 'Tsunami', 'asset': 'assets/images/badges/tsunami.png'},
    {'key': 'full_swimmer', 'label': 'Full Swimmer', 'asset': 'assets/images/badges/full_swimmer.png'},
  ];

  static const List<String> _intensityOptions = [
    'Moderee',
    'Soutenue',
    'Haute Intensite',
    'Recuperation Active',
  ];

  static const List<String> _focusOptions = [
    'Technique Crawl & Respiration',
    'Flottaison & Equilibre Aquatique',
    'Propulsion Dos & Brasse',
    'Ondulation & Papillon',
    'Virages, Plongeon & Vitesse',
    'Endurance Aerobie',
  ];

  @override
  void dispose() {
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
        _evolutions[rec.memberId] = _QuickSwimmerEvolution();
      }
    }

    final existingRating = data['sessionRating'] as Map<String, dynamic>?;
    if (existingRating != null) {
      _sessionRating = (existingRating['rating'] as num?)?.toInt() ?? 5;
      if (existingRating['intensity'] is String) {
        _intensity = existingRating['intensity'] as String;
      }
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
    setState(() => _isSaving = true);

    final client = ref.read(apiClientProvider);

    final quickEvolutionsPayload = _evolutions.entries
        .where((e) => e.value.hasChanges)
        .map((e) => {
              'memberId': e.key,
              if (e.value.starScore > 0) 'starScore': e.value.starScore,
              if (e.value.badgeLabel != null) 'recommendedLevel': e.value.badgeLabel,
              if (e.value.badgeKey != null) 'badgeKey': e.value.badgeKey,
              if (e.value.note.trim().isNotEmpty) 'note': e.value.note.trim(),
            })
        .toList();

    final payload = {
      'records': _records.map((r) => r.toJson()).toList(),
      'closeSession': true,
      'sessionRating': {
        'rating': _sessionRating,
        'intensity': _intensity,
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
      height: mediaQuery.size.height * 0.90,
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

                // 3-Step Indicator Strip
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
                        label: i18n.t('quick_logger.step2'),
                      ),
                    ),
                    const SizedBox(width: 6.0),
                    Expanded(
                      child: _buildStepPill(
                        stepIndex: 2,
                        label: i18n.t('quick_logger.step3'),
                      ),
                    ),
                  ],
                ),
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
                  return _buildStep2Evolution(i18n);
                } else {
                  return _buildStep3SessionRating(i18n);
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
                            label: _isSaving
                                ? i18n.t('common.saving')
                                : i18n.t('quick_logger.finish_cta'),
                            icon: Icons.check_rounded,
                            loading: _isSaving,
                            color: AqaTheme.statusSuccess,
                            textColor: Colors.white,
                            onPressed: () => _submitQuickLog(i18n),
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
                  child: Text(
                    rec.memberName,
                    style: const TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 14.0,
                      fontWeight: FontWeight.w700,
                    ),
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

  /// STEP 2: Swimmer Evolution & 15 Official AQA Suivi Badges
  Widget _buildStep2Evolution(AppI18n i18n) {
    final presentRecords = _records.where((r) => r.isPresent).toList();

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Text(
          i18n.t('quick_logger.step2_desc'),
          style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.5),
        ),
        const SizedBox(height: 12.0),
        ...presentRecords.map((rec) {
          final evo = _evolutions.putIfAbsent(rec.memberId, () => _QuickSwimmerEvolution());
          return AqaDoubleBezelCard(
            margin: const EdgeInsets.only(bottom: 10.0),
            padding: const EdgeInsets.all(14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        rec.memberName,
                        style: const TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: List.generate(5, (idx) {
                        final score = idx + 1;
                        final active = score <= evo.starScore;
                        return InkWell(
                          onTap: () => setState(() {
                            evo.starScore = evo.starScore == score ? 0 : score;
                          }),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 2.0),
                            child: Icon(
                              active ? Icons.star_rounded : Icons.star_outline_rounded,
                              color: active ? AqaTheme.accentTeal : AqaTheme.textLightMuted,
                              size: 20.0,
                            ),
                          ),
                        );
                      }),
                    ),
                  ],
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
                            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 6.0),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AqaTheme.accentTeal.withValues(alpha: 0.16)
                                  : const Color(0xFF080E1E),
                              borderRadius: BorderRadius.circular(10.0),
                              border: Border.all(
                                color: isSelected ? AqaTheme.accentTeal : AqaTheme.borderSubtle,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Image.asset(
                                  b['asset']!,
                                  width: 20.0,
                                  height: 20.0,
                                  errorBuilder: (_, __, ___) => const Icon(
                                    Icons.military_tech_rounded,
                                    size: 16.0,
                                    color: AqaTheme.accentTeal,
                                  ),
                                ),
                                const SizedBox(width: 5.0),
                                Text(
                                  b['label']!,
                                  style: TextStyle(
                                    color: isSelected ? AqaTheme.accentTeal : AqaTheme.textMuted,
                                    fontSize: 11.0,
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
              ],
            ),
          );
        }),
      ],
    );
  }

  /// STEP 3: Session Rating
  Widget _buildStep3SessionRating(AppI18n i18n) {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                i18n.t('quick_logger.step3_desc'),
                style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.5),
              ),
              const SizedBox(height: 14.0),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (idx) {
                  final val = idx + 1;
                  final active = val <= _sessionRating;
                  return IconButton(
                    onPressed: () => setState(() => _sessionRating = val),
                    icon: Icon(
                      active ? Icons.star_rounded : Icons.star_outline_rounded,
                      color: active ? AqaTheme.statusWarning : AqaTheme.textLightMuted,
                      size: 36.0,
                    ),
                  );
                }),
              ),
              const SizedBox(height: 14.0),
              Text(
                i18n.t('attendance.intensity_label'),
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8.0),
              Wrap(
                spacing: 8.0,
                runSpacing: 8.0,
                children: _intensityOptions.map((opt) {
                  final selected = _intensity == opt;
                  return ChoiceChip(
                    label: Text(opt),
                    selected: selected,
                    onSelected: (_) => setState(() => _intensity = opt),
                    selectedColor: AqaTheme.primarySky,
                    backgroundColor: AqaTheme.surfaceSecondary,
                  );
                }).toList(),
              ),
              const SizedBox(height: 14.0),
              Text(
                i18n.t('sessions.focus_label'),
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8.0),
              Wrap(
                spacing: 8.0,
                runSpacing: 8.0,
                children: _focusOptions.map((opt) {
                  final selected = _focus == opt;
                  return ChoiceChip(
                    label: Text(opt),
                    selected: selected,
                    onSelected: (_) => setState(() => _focus = opt),
                    selectedColor: AqaTheme.accentTeal.withValues(alpha: 0.25),
                    backgroundColor: AqaTheme.surfaceSecondary,
                  );
                }).toList(),
              ),
              const SizedBox(height: 14.0),
              TextField(
                controller: _summaryController,
                maxLines: 3,
                style: const TextStyle(color: AqaTheme.textPrimary),
                decoration: InputDecoration(
                  labelText: i18n.t('attendance.session_notes_label'),
                  hintText: i18n.t('attendance.session_notes_hint'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
