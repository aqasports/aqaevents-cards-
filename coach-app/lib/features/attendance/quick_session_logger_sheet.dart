import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/swim_attendance.dart';
import '../../core/models/swim_session.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/theme/aqa_theme.dart';
import 'attendance_screen.dart';

class _QuickSwimmerEvolution {
  int starScore = 0; // 0 = unchanged, 1..4 = quick mastery score
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
  int _currentStep = 0; // 0: Presence, 1: Evolution, 2: Session Rating
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
    {'key': 'dauphin', 'label': 'Dauphin', 'asset': 'assets/images/badges/dauphin.png'},
    {'key': 'crawler', 'label': 'Crawler', 'asset': 'assets/images/badges/crawler.png'},
    {'key': 'brasseur', 'label': 'Brasseur', 'asset': 'assets/images/badges/brasseur.png'},
    {'key': 'butterfly', 'label': 'Butterfly', 'asset': 'assets/images/badges/butterfly.png'},
    {'key': 'requin', 'label': 'Requin', 'asset': 'assets/images/badges/requin.png'},
    {'key': 'orca', 'label': 'Orca', 'asset': 'assets/images/badges/orca.png'},
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

  void _cycleStatus(AttendanceRecordModel rec) {
    setState(() {
      switch (rec.status.toUpperCase()) {
        case 'PRESENT':
          rec.status = 'ABSENT';
          break;
        case 'ABSENT':
          rec.status = 'LATE';
          break;
        case 'LATE':
          rec.status = 'EXCUSED';
          break;
        default:
          rec.status = 'PRESENT';
      }
    });
  }

  Future<void> _submitQuickLog() async {
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
          const SnackBar(
            backgroundColor: AqaTheme.statusSuccess,
            content: Text('Seance enregistree : Presences, evolutions et note validees.'),
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AqaTheme.statusDanger,
            content: Text('Erreur lors de la validation: $e'),
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
    final mediaQuery = MediaQuery.of(context);

    return Container(
      height: mediaQuery.size.height * 0.88,
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
                        color: AqaTheme.accentTeal.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10.0),
                        border: Border.all(color: AqaTheme.borderTeal),
                      ),
                      child: const Icon(
                        Icons.bolt,
                        color: AqaTheme.accentTeal,
                        size: 20.0,
                      ),
                    ),
                    const SizedBox(width: 12.0),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'ASSISTANT LOG RAPIDE (3 ETAPES)',
                            style: TextStyle(
                              color: AqaTheme.accentTeal,
                              fontSize: 10.0,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.1,
                            ),
                          ),
                          const SizedBox(height: 2.0),
                          Text(
                            '${widget.session.groupName} • ${widget.session.startTime} - ${widget.session.endTime}',
                            style: const TextStyle(
                              color: AqaTheme.textPrimary,
                              fontSize: 15.0,
                              fontWeight: FontWeight.w700,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      icon: const Icon(Icons.close, color: AqaTheme.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 14.0),
                // 3-Step Indicator Bar
                Row(
                  children: [
                    _buildStepPill(0, '1. Presences', Icons.how_to_reg_outlined),
                    const SizedBox(width: 8.0),
                    _buildStepPill(1, '2. Evolution', Icons.trending_up),
                    const SizedBox(width: 8.0),
                    _buildStepPill(2, '3. Note Seance', Icons.star_outline),
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
                    'Impossible de charger la seance: $err',
                    style: const TextStyle(color: AqaTheme.textMuted),
                  ),
                ),
              ),
              data: (data) {
                _initFromSessionData(data);
                if (_currentStep == 0) {
                  return _buildStep1Presence();
                } else if (_currentStep == 1) {
                  return _buildStep2Evolution();
                } else {
                  return _buildStep3SessionRating();
                }
              },
            ),
          ),

          // Footer Navigation Bar
          Container(
            padding: EdgeInsets.fromLTRB(
              16.0,
              12.0,
              16.0,
              12.0 + mediaQuery.padding.bottom,
            ),
            decoration: const BoxDecoration(
              color: AqaTheme.surfaceDark,
              border: Border(top: BorderSide(color: AqaTheme.borderSubtle)),
            ),
            child: Row(
              children: [
                if (_currentStep > 0) ...[
                  OutlinedButton.icon(
                    onPressed: _isSaving
                        ? null
                        : () => setState(() => _currentStep -= 1),
                    icon: const Icon(Icons.arrow_back, size: 16.0),
                    label: const Text('Retour'),
                  ),
                  const SizedBox(width: 12.0),
                ],
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _currentStep == 2
                          ? AqaTheme.statusSuccess
                          : AqaTheme.primarySky,
                      padding: const EdgeInsets.symmetric(vertical: 14.0),
                    ),
                    onPressed: _isSaving
                        ? null
                        : () {
                            if (_currentStep < 2) {
                              setState(() => _currentStep += 1);
                            } else {
                              _submitQuickLog();
                            }
                          },
                    icon: _isSaving
                        ? const SizedBox(
                            width: 18.0,
                            height: 18.0,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.0,
                              color: Colors.white,
                            ),
                          )
                        : Icon(
                            _currentStep < 2
                                ? Icons.arrow_forward
                                : Icons.check_circle_outline,
                            size: 18.0,
                          ),
                    label: Text(
                      _currentStep == 0
                          ? 'Suivant : Evolution des Nageurs (Etape 2/3)'
                          : _currentStep == 1
                              ? 'Suivant : Noter la Seance (Etape 3/3)'
                              : 'Valider & Cloturer la Seance',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepPill(int stepIndex, String title, IconData icon) {
    final isCurrent = _currentStep == stepIndex;
    final isPassed = _currentStep > stepIndex;
    final color = isCurrent
        ? AqaTheme.accentTeal
        : isPassed
            ? AqaTheme.statusSuccess
            : AqaTheme.textLightMuted;

    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
        onTap: () => setState(() => _currentStep = stepIndex),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 8.0),
          decoration: BoxDecoration(
            color: isCurrent
                ? AqaTheme.accentTeal.withValues(alpha: 0.14)
                : isPassed
                    ? AqaTheme.statusSuccessBg
                    : AqaTheme.surfaceSecondary,
            borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
            border: Border.all(
              color: isCurrent
                  ? AqaTheme.accentTeal
                  : isPassed
                      ? AqaTheme.statusSuccess
                      : AqaTheme.borderSubtle,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isPassed ? Icons.check_circle : icon,
                color: color,
                size: 14.0,
              ),
              const SizedBox(width: 5.0),
              Flexible(
                child: Text(
                  title,
                  style: TextStyle(
                    color: isCurrent ? AqaTheme.textPrimary : color,
                    fontSize: 11.0,
                    fontWeight: FontWeight.w700,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep1Presence() {
    final presentCount = _records.where((r) => r.isPresent).length;
    final absentCount = _records.where((r) => r.isAbsent).length;
    final lateCount = _records.where((r) => r.isLate).length;

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          color: AqaTheme.surfaceSecondary.withValues(alpha: 0.5),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Presents: $presentCount / ${_records.length}  •  Absents: $absentCount  •  Retards: $lateCount',
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 12.0,
                  fontWeight: FontWeight.w600,
                ),
              ),
              TextButton.icon(
                style: TextButton.styleFrom(
                  foregroundColor: AqaTheme.accentTeal,
                  visualDensity: VisualDensity.compact,
                ),
                onPressed: () {
                  setState(() {
                    for (final r in _records) {
                      r.status = 'PRESENT';
                    }
                  });
                },
                icon: const Icon(Icons.done_all, size: 16.0),
                label: const Text('Tout Present', style: TextStyle(fontSize: 12.0)),
              ),
            ],
          ),
        ),
        Expanded(
          child: _records.isEmpty
              ? const Center(
                  child: Text(
                    'Aucun nageur inscrit dans ce groupe.',
                    style: TextStyle(color: AqaTheme.textMuted),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16.0),
                  itemCount: _records.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8.0),
                  itemBuilder: (ctx, idx) {
                    final rec = _records[idx];
                    Color statusColor = AqaTheme.statusSuccess;
                    String statusLabel = 'PRESENT';
                    if (rec.isAbsent) {
                      statusColor = AqaTheme.statusDanger;
                      statusLabel = 'ABSENT';
                    } else if (rec.isLate) {
                      statusColor = AqaTheme.statusWarning;
                      statusLabel = 'RETARD';
                    } else if (rec.isExcused) {
                      statusColor = AqaTheme.statusInfo;
                      statusLabel = 'EXCUSE';
                    }

                    return InkWell(
                      borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                      onTap: () => _cycleStatus(rec),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14.0,
                          vertical: 12.0,
                        ),
                        decoration: BoxDecoration(
                          color: AqaTheme.surfaceDark,
                          borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                          border: Border.all(
                            color: statusColor.withValues(alpha: 0.5),
                          ),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 18.0,
                              backgroundColor: statusColor.withValues(alpha: 0.15),
                              child: Text(
                                rec.memberName.isNotEmpty
                                    ? rec.memberName.substring(0, 1).toUpperCase()
                                    : 'N',
                                style: TextStyle(
                                  color: statusColor,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12.0),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    rec.memberName,
                                    style: const TextStyle(
                                      color: AqaTheme.textPrimary,
                                      fontSize: 14.0,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const Text(
                                    'Touchez pour basculer le statut (Present / Absent / Retard / Excuse)',
                                    style: TextStyle(
                                      color: AqaTheme.textLightMuted,
                                      fontSize: 11.0,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12.0,
                                vertical: 6.0,
                              ),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                                border: Border.all(color: statusColor),
                              ),
                              child: Text(
                                statusLabel,
                                style: TextStyle(
                                  color: statusColor,
                                  fontSize: 11.0,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildStep2Evolution() {
    final presentSwimmers = _records.where((r) => !r.isAbsent).toList();

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Container(
          padding: const EdgeInsets.all(12.0),
          decoration: BoxDecoration(
            color: AqaTheme.surfaceSecondary,
            borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
            border: Border.all(color: AqaTheme.borderSubtle),
          ),
          child: const Row(
            children: [
              Icon(Icons.workspace_premium, color: AqaTheme.accentTeal, size: 20.0),
              SizedBox(width: 10.0),
              Expanded(
                child: Text(
                  'Optionnel : attribuez une etoile de progression (1 a 4) ou un badge AQA aux nageurs qui se sont demarques durant cette seance.',
                  style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12.0),
        if (presentSwimmers.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24.0),
            child: Center(
              child: Text(
                'Aucun nageur present selectionne a l\'etape 1.',
                style: TextStyle(color: AqaTheme.textMuted),
              ),
            ),
          )
        else
          ...presentSwimmers.map((rec) {
            final evo = _evolutions.putIfAbsent(
              rec.memberId,
              () => _QuickSwimmerEvolution(),
            );

            return Container(
              margin: const EdgeInsets.only(bottom: 10.0),
              padding: const EdgeInsets.all(12.0),
              decoration: BoxDecoration(
                color: AqaTheme.surfaceDark,
                borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                border: Border.all(
                  color: evo.hasChanges
                      ? AqaTheme.accentTeal
                      : AqaTheme.borderSubtle,
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
                          rec.memberName,
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 14.0,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      // 1..4 Mastery Quick Stars
                      Row(
                        children: List.generate(4, (idx) {
                          final scoreVal = idx + 1;
                          final active = evo.starScore >= scoreVal;
                          return IconButton(
                            constraints: const BoxConstraints(
                              minWidth: 30.0,
                              minHeight: 30.0,
                            ),
                            padding: EdgeInsets.zero,
                            icon: Icon(
                              active ? Icons.star : Icons.star_border,
                              color: active
                                  ? AqaTheme.statusWarning
                                  : AqaTheme.textLightMuted,
                              size: 20.0,
                            ),
                            onPressed: () {
                              setState(() {
                                evo.starScore =
                                    evo.starScore == scoreVal ? 0 : scoreVal;
                              });
                            },
                          );
                        }),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8.0),
                  // Horizontal AQA Badge Picker
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _badgeOptions.map((b) {
                        final selected = evo.badgeKey == b['key'];
                        return Padding(
                          padding: const EdgeInsets.only(right: 6.0),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(8.0),
                            onTap: () {
                              setState(() {
                                if (selected) {
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
                                horizontal: 8.0,
                                vertical: 5.0,
                              ),
                              decoration: BoxDecoration(
                                color: selected
                                    ? AqaTheme.primarySky.withValues(alpha: 0.22)
                                    : AqaTheme.surfaceSecondary,
                                borderRadius: BorderRadius.circular(8.0),
                                border: Border.all(
                                  color: selected
                                      ? AqaTheme.accentTeal
                                      : AqaTheme.borderSubtle,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Image.asset(
                                    b['asset']!,
                                    width: 18.0,
                                    height: 18.0,
                                    errorBuilder: (_, __, ___) => const Icon(
                                      Icons.military_tech,
                                      size: 16.0,
                                      color: AqaTheme.accentTeal,
                                    ),
                                  ),
                                  const SizedBox(width: 5.0),
                                  Text(
                                    b['label']!,
                                    style: TextStyle(
                                      color: selected
                                          ? AqaTheme.accentTeal
                                          : AqaTheme.textMuted,
                                      fontSize: 11.0,
                                      fontWeight: selected
                                          ? FontWeight.w700
                                          : FontWeight.w500,
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

  Widget _buildStep3SessionRating() {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        // 1-5 Star Rating Card
        Container(
          padding: const EdgeInsets.all(18.0),
          decoration: BoxDecoration(
            color: AqaTheme.surfaceDark,
            borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
            border: Border.all(color: AqaTheme.borderTeal),
            boxShadow: AqaTheme.tealGlow,
          ),
          child: Column(
            children: [
              const Text(
                'EVALUATION GLOBALE DE LA SEANCE',
                style: TextStyle(
                  color: AqaTheme.accentTeal,
                  fontSize: 11.0,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 6.0),
              const Text(
                'Comment s\'est deroulee cette seance d\'entrainement ?',
                style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
              ),
              const SizedBox(height: 12.0),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (idx) {
                  final starVal = idx + 1;
                  final isSelected = _sessionRating >= starVal;
                  return IconButton(
                    iconSize: 36.0,
                    onPressed: () => setState(() => _sessionRating = starVal),
                    icon: Icon(
                      isSelected ? Icons.star_rounded : Icons.star_outline_rounded,
                      color: isSelected
                          ? AqaTheme.statusWarning
                          : AqaTheme.textLightMuted,
                    ),
                  );
                }),
              ),
              Text(
                'Note : $_sessionRating / 5',
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 14.0,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16.0),

        // Intensity & Focus
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: AqaTheme.surfaceDark,
            borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
            border: Border.all(color: AqaTheme.borderSubtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Intensite de la Seance',
                style: TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 13.0,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8.0),
              Wrap(
                spacing: 8.0,
                runSpacing: 8.0,
                children: _intensityOptions.map((item) {
                  final selected = _intensity == item;
                  return ChoiceChip(
                    label: Text(item, style: const TextStyle(fontSize: 12.0)),
                    selected: selected,
                    onSelected: (_) => setState(() => _intensity = item),
                    selectedColor: AqaTheme.primarySky,
                    backgroundColor: AqaTheme.surfaceSecondary,
                    labelStyle: TextStyle(
                      color: selected ? Colors.white : AqaTheme.textMuted,
                      fontWeight: FontWeight.w600,
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16.0),
              const Text(
                'Focus Technique Principal',
                style: TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 13.0,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8.0),
              Wrap(
                spacing: 8.0,
                runSpacing: 8.0,
                children: _focusOptions.map((item) {
                  final selected = _focus == item;
                  return ChoiceChip(
                    label: Text(item, style: const TextStyle(fontSize: 12.0)),
                    selected: selected,
                    onSelected: (_) => setState(() => _focus = item),
                    selectedColor: AqaTheme.accentTeal.withValues(alpha: 0.22),
                    backgroundColor: AqaTheme.surfaceSecondary,
                    labelStyle: TextStyle(
                      color: selected ? AqaTheme.accentTeal : AqaTheme.textMuted,
                      fontWeight: FontWeight.w600,
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16.0),
              const Text(
                'Observations & Bilan de Seance',
                style: TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 13.0,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8.0),
              TextField(
                controller: _summaryController,
                maxLines: 3,
                style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                decoration: const InputDecoration(
                  hintText:
                      'Ex: Excellente assiduite, travail de respiration bilaterale acquis pour le groupe...',
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
