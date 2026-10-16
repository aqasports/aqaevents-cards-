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
  static const List<Map<String, String>> _aqaBadges = [
    {'key': 'starter', 'label': 'Starter', 'asset': 'starter.png'},
    {'key': 'beginner', 'label': 'Beginner', 'asset': 'beginner.png'},
    {'key': 'floater', 'label': 'Floater', 'asset': 'floater.png'},
    {'key': 'dauphin', 'label': 'Dauphin', 'asset': 'dauphin.png'},
    {'key': 'crawler', 'label': 'Crawler', 'asset': 'crawler.png'},
    {'key': 'brasseur', 'label': 'Brasseur', 'asset': 'brasseur.png'},
    {'key': 'butterfly', 'label': 'Butterfly', 'asset': 'butterfly.png'},
    {'key': 'requin', 'label': 'Requin', 'asset': 'requin.png'},
    {'key': 'orca', 'label': 'Orca', 'asset': 'orca.png'},
    {'key': 'full_swimmer', 'label': 'Full Swimmer', 'asset': 'full_swimmer.png'},
  ];

  String _selectedBadgeKey = 'beginner';
  String _selectedBadgeLabel = 'Beginner';

  final TextEditingController _strengthsController = TextEditingController();
  final TextEditingController _improvementsController = TextEditingController();
  final TextEditingController _goalsController = TextEditingController();
  final TextEditingController _time25mController = TextEditingController();
  final TextEditingController _time50mController = TextEditingController();
  final TextEditingController _maxDistanceController = TextEditingController();

  final Map<String, int> _skillScores = {
    'water_comfort': 2,
    'breathing': 2,
    'floating': 2,
    'kicking': 2,
    'freestyle': 2,
    'backstroke': 2,
  };

  final Map<String, String> _skillLabels = {
    'water_comfort': 'Aisance aquatique',
    'breathing': 'Respiration & Bulles',
    'floating': 'Flottaison (etoile)',
    'kicking': 'Battements de jambes',
    'freestyle': 'Crawl - Coordination',
    'backstroke': 'Dos crawle',
  };

  bool _catalogPopulated = false;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _strengthsController.dispose();
    _improvementsController.dispose();
    _goalsController.dispose();
    _time25mController.dispose();
    _time50mController.dispose();
    _maxDistanceController.dispose();
    super.dispose();
  }

  void _populateCatalogIfNeeded(Map<String, dynamic> profileData) {
    if (_catalogPopulated) return;
    final catalog = (profileData['skillsCatalog'] as List<dynamic>?) ?? [];
    if (catalog.isNotEmpty) {
      _skillScores.clear();
      _skillLabels.clear();
      for (final item in catalog) {
        if (item is Map<String, dynamic>) {
          final k = item['key'] as String? ?? '';
          final lbl = item['labelFr'] as String? ?? item['labelEn'] as String? ?? k;
          if (k.isNotEmpty) {
            _skillScores[k] = 2;
            _skillLabels[k] = lbl;
          }
        }
      }
    }
    final member = profileData['member'] as Map<String, dynamic>?;
    if (member != null) {
      final bKey = member['badgeKey'] as String?;
      final bLabel = member['badgeLabel'] as String?;
      if (bKey != null && bKey.isNotEmpty) {
        _selectedBadgeKey = bKey;
      }
      if (bLabel != null && bLabel.isNotEmpty) {
        _selectedBadgeLabel = bLabel;
      }
    }
    _catalogPopulated = true;
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);

    final clientMutationId = '${DateTime.now().millisecondsSinceEpoch}-${widget.memberId}';
    final metrics = <String, dynamic>{};
    final t25 = double.tryParse(_time25mController.text.trim());
    final t50 = double.tryParse(_time50mController.text.trim());
    final dist = int.tryParse(_maxDistanceController.text.trim());
    if (t25 != null) metrics['time25mSec'] = t25;
    if (t50 != null) metrics['time50mSec'] = t50;
    if (dist != null) metrics['maxDistanceM'] = dist;

    final payload = {
      'clientMutationId': clientMutationId,
      'overallLevel': _selectedBadgeLabel,
      'recommendedLevel': _selectedBadgeLabel,
      'badgeKey': _selectedBadgeKey,
      'evaluatorNotes': _strengthsController.text.trim(),
      'strengths': _strengthsController.text.trim(),
      'improvements': _improvementsController.text.trim(),
      'nextGoals': _goalsController.text.trim(),
      if (metrics.isNotEmpty) 'metrics': metrics,
      'skills': _skillScores.entries
          .map((e) => {
                'key': e.key,
                'skillKey': e.key,
                'label': _skillLabels[e.key] ?? e.key,
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
            content: Text('Evaluation technique et badge enregistres avec succes.'),
          ),
        );
        ref.invalidate(swimmerProfileProvider(widget.memberId));
        ref.invalidate(bootstrapProvider);
        context.pop();
      }
    } catch (e) {
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
            content: Text('Mode hors-ligne: Evaluation enregistree pour synchronisation.'),
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
    final profileAsync = ref.watch(swimmerProfileProvider(widget.memberId));
    profileAsync.whenData(_populateCatalogIfNeeded);

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Evaluation Technique & Badge'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Official AQA Progression Badge Selector
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
                    'Attribution du Badge de Progression AQA',
                    style: TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 14.0,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4.0),
                  const Text(
                    'Selectionnez le rang actuel valide par le nageur',
                    style: TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.5),
                  ),
                  const SizedBox(height: 12.0),
                  SizedBox(
                    height: 98.0,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _aqaBadges.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8.0),
                      itemBuilder: (ctx, idx) {
                        final badge = _aqaBadges[idx];
                        final isSelected = _selectedBadgeKey == badge['key'];
                        return InkWell(
                          onTap: () {
                            setState(() {
                              _selectedBadgeKey = badge['key']!;
                              _selectedBadgeLabel = badge['label']!;
                            });
                          },
                          borderRadius: BorderRadius.circular(12.0),
                          child: Container(
                            width: 86.0,
                            padding: const EdgeInsets.all(8.0),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AqaTheme.primarySky.withValues(alpha: 0.2)
                                  : AqaTheme.surfaceSecondary,
                              borderRadius: BorderRadius.circular(12.0),
                              border: Border.all(
                                color: isSelected ? AqaTheme.accentTeal : AqaTheme.borderSubtle,
                                width: isSelected ? 1.8 : 1.0,
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(
                                  width: 42.0,
                                  height: 42.0,
                                  child: Image.asset(
                                    'assets/images/badges/${badge['asset']}',
                                    fit: BoxFit.contain,
                                    errorBuilder: (_, __, ___) => const Icon(
                                      Icons.workspace_premium,
                                      color: AqaTheme.accentTeal,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 6.0),
                                Text(
                                  badge['label']!,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: isSelected ? AqaTheme.accentTeal : AqaTheme.textPrimary,
                                    fontSize: 10.5,
                                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
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
              ),
            ),
            const SizedBox(height: 16.0),

            // Skills Matrix Section
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
                    'Grille de Competences Techniques (1 a 4)',
                    style: TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 14.0,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4.0),
                  const Text(
                    '1: Debutant | 2: En cours | 3: Acquis | 4: Maitrise',
                    style: TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.0),
                  ),
                  const SizedBox(height: 16.0),
                  ..._skillScores.keys.map((key) {
                    final label = _skillLabels[key] ?? key;
                    final score = _skillScores[key] ?? 2;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  label,
                                  style: const TextStyle(
                                    color: AqaTheme.textPrimary,
                                    fontSize: 13.0,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              Text(
                                '$score / 4',
                                style: const TextStyle(
                                  color: AqaTheme.accentTeal,
                                  fontSize: 13.0,
                                  fontWeight: FontWeight.w800,
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
                                      backgroundColor: isSelected
                                          ? AqaTheme.primarySky.withValues(alpha: 0.22)
                                          : Colors.transparent,
                                      side: BorderSide(
                                        color:
                                            isSelected ? AqaTheme.primarySky : AqaTheme.borderSubtle,
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
                                        color: isSelected
                                            ? AqaTheme.primarySky
                                            : AqaTheme.textMuted,
                                        fontWeight:
                                            isSelected ? FontWeight.w800 : FontWeight.w500,
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

            // Timed & Distance Metrics
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
                    'Chronos & Metriques (Optionnel)',
                    style: TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 14.0,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 12.0),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _time25mController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                          decoration: const InputDecoration(
                            labelText: '25m (sec)',
                            hintText: 'ex: 22.4',
                          ),
                        ),
                      ),
                      const SizedBox(width: 8.0),
                      Expanded(
                        child: TextField(
                          controller: _time50mController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                          decoration: const InputDecoration(
                            labelText: '50m (sec)',
                            hintText: 'ex: 48.0',
                          ),
                        ),
                      ),
                      const SizedBox(width: 8.0),
                      Expanded(
                        child: TextField(
                          controller: _maxDistanceController,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                          decoration: const InputDecoration(
                            labelText: 'Distance (m)',
                            hintText: 'ex: 400',
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16.0),

            // Qualitative Feedback
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
                    'Bilan Pedagogique du Coach',
                    style: TextStyle(
                      color: AqaTheme.textPrimary,
                      fontSize: 14.0,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 12.0),
                  TextField(
                    controller: _strengthsController,
                    maxLines: 2,
                    style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                    decoration: const InputDecoration(
                      labelText: 'Points forts observes',
                      hintText: 'Ex: Excellente position hydrodynamique et battements reguliers...',
                    ),
                  ),
                  const SizedBox(height: 12.0),
                  TextField(
                    controller: _improvementsController,
                    maxLines: 2,
                    style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                    decoration: const InputDecoration(
                      labelText: 'Axes d\'amelioration',
                      hintText: 'Ex: Respiration bilaterale en crawl et reprise de nage...',
                    ),
                  ),
                  const SizedBox(height: 12.0),
                  TextField(
                    controller: _goalsController,
                    maxLines: 2,
                    style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                    decoration: const InputDecoration(
                      labelText: 'Objectifs pour le prochain palier',
                      hintText: 'Ex: Valider 50m crawl continu pour le badge suivant...',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24.0),

            // Submit Button
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 15.0),
              ),
              onPressed: _isSubmitting ? null : _submit,
              icon: _isSubmitting
                  ? const SizedBox(
                      height: 18.0,
                      width: 18.0,
                      child: CircularProgressIndicator(strokeWidth: 2.0, color: Colors.white),
                    )
                  : const Icon(Icons.workspace_premium_rounded, size: 20.0),
              label: const Text('Enregistrer l\'Evaluation & Valider le Badge'),
            ),
          ],
        ),
      ),
    );
  }
}
