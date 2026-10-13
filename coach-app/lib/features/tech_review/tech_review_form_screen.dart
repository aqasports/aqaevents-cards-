import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/sync/offline_sync_manager.dart';
import '../../core/theme/aqa_theme.dart';
import 'swimmer_profile_screen.dart';

class TechReviewFormScreen extends ConsumerStatefulWidget {
  final String memberId;

  const TechReviewFormScreen({super.key, required this.memberId});

  @override
  ConsumerState<TechReviewFormScreen> createState() => _TechReviewFormScreenState();
}

class _TechReviewFormScreenState extends ConsumerState<TechReviewFormScreen> {
  String _overallLevel = 'BEGINNER';
  final TextEditingController _notesController = TextEditingController();

  final Map<String, int> _skillScores = {
    'flottabilite': 2,
    'respiration': 2,
    'propulsion': 2,
    'battements': 2,
    'immersion': 2,
    'endurance': 2,
  };

  final Map<String, String> _skillLabels = {
    'flottabilite': 'Buoyancy & Balance',
    'respiration': 'Rhythmic Breathing',
    'propulsion': 'Arm Stroke Propulsion',
    'battements': 'Leg Kick Technique',
    'immersion': 'Submersion & Glide',
    'endurance': 'Lap Endurance',
  };

  bool _isSubmitting = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);

    final clientMutationId = '${DateTime.now().millisecondsSinceEpoch}-${widget.memberId}';
    final payload = {
      'clientMutationId': clientMutationId,
      'overallLevel': _overallLevel,
      'evaluatorNotes': _notesController.text.trim(),
      'skills': _skillScores.entries
          .map((e) => {
                'skillKey': e.key,
                'score': e.value,
              })
          .toList(),
    };

    final client = ref.read(apiClientProvider);

    try {
      final response = await client.dio.post(
        ApiEndpoints.submitReview(widget.memberId),
        data: payload,
      );

      if (response.statusCode == 200 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AqaTheme.statusSuccess,
            content: Text('Technical evaluation saved successfully'),
          ),
        );
        ref.invalidate(swimmerProfileProvider(widget.memberId));
        context.pop();
      }
    } catch (e) {
      // Offline queueing
      final syncManager = ref.read(syncManagerProvider);
      await syncManager.enqueue(
        SyncMutation(
          id: clientMutationId,
          type: 'tech_review',
          payload: {
            'memberId': widget.memberId,
            ...payload,
          },
          timestamp: DateTime.now().toIso8601String(),
        ),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AqaTheme.statusWarning,
            content: Text('Offline mode: Evaluation queued for synchronization.'),
          ),
        );
        context.pop();
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Technical Evaluation'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Overall Level Section
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
                    'Overall Proficiency Level',
                    style: TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 14.0,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12.0),
                  Wrap(
                    spacing: 8.0,
                    runSpacing: 8.0,
                    children: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE'].map((lvl) {
                      final isSelected = _overallLevel == lvl;
                      return ChoiceChip(
                        label: Text(lvl),
                        selected: isSelected,
                        onSelected: (val) {
                          if (val) setState(() => _overallLevel = lvl);
                        },
                        selectedColor: AqaTheme.primarySky,
                        backgroundColor: AqaTheme.surfaceSecondary,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : AqaTheme.textMuted,
                          fontWeight: FontWeight.w600,
                          fontSize: 12.0,
                        ),
                        side: BorderSide(
                          color: isSelected ? AqaTheme.primarySky : AqaTheme.borderSubtle,
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16.0),

            // Skills Section
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
                    'Core Skills Matrix (Scale 1 to 4)',
                    style: TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 14.0,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6.0),
                  const Text(
                    '1: Novice | 2: In Progress | 3: Autonomous | 4: Mastered',
                    style: TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.0),
                  ),
                  const SizedBox(height: 16.0),
                  ..._skillScores.keys.map((key) {
                    final label = _skillLabels[key] ?? key;
                    final score = _skillScores[key] ?? 1;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                label,
                                style: const TextStyle(
                                  color: AqaTheme.textPrimary,
                                  fontSize: 13.0,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                '$score / 4',
                                style: const TextStyle(
                                  color: AqaTheme.accentTeal,
                                  fontSize: 13.0,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8.0),
                          Row(
                            children: List.generate(4, (i) {
                              final val = i + 1;
                              final isSelected = score == val;
                              return Expanded(
                                child: Padding(
                                  padding: EdgeInsets.only(right: i < 3 ? 6.0 : 0.0),
                                  child: OutlinedButton(
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                                      backgroundColor: isSelected ? AqaTheme.primarySky.withValues(alpha: 0.2) : Colors.transparent,
                                      side: BorderSide(
                                        color: isSelected ? AqaTheme.primarySky : AqaTheme.borderSubtle,
                                        width: isSelected ? 1.5 : 1.0,
                                      ),
                                    ),
                                    onPressed: () {
                                      setState(() {
                                        _skillScores[key] = val;
                                      });
                                    },
                                    child: Text(
                                      '$val',
                                      style: TextStyle(
                                        color: isSelected ? AqaTheme.primarySky : AqaTheme.textMuted,
                                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 16.0),

            // Evaluator Notes
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
                    'Coach Observations & Notes',
                    style: TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 14.0,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10.0),
                  TextField(
                    controller: _notesController,
                    maxLines: 3,
                    style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                    decoration: const InputDecoration(
                      hintText: 'Enter specific technical observations or goals for next period...',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24.0),

            // Submit Button
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14.0),
              ),
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20.0,
                      width: 20.0,
                      child: CircularProgressIndicator(strokeWidth: 2.0, color: Colors.white),
                    )
                  : const Text('Save Technical Evaluation'),
            ),
          ],
        ),
      ),
    );
  }
}
