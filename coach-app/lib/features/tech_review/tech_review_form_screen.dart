import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/i18n/app_i18n.dart';
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

class _AqaStrokeBarDef {
  final String key;
  final int order;
  final String labelFr;
  final String labelEn;
  final String labelAr;
  final String asset;

  const _AqaStrokeBarDef({
    required this.key,
    required this.order,
    required this.labelFr,
    required this.labelEn,
    required this.labelAr,
    required this.asset,
  });

  String labelFor(String locale) {
    if (locale == 'ar') return labelAr;
    if (locale == 'en') return labelEn;
    return labelFr;
  }
}

class _AqaBadgeDef {
  final String key;
  final String label;
  final String labelEn;
  final String labelAr;
  final String asset;
  final String stageKey;

  const _AqaBadgeDef({
    required this.key,
    required this.label,
    required this.labelEn,
    required this.labelAr,
    required this.asset,
    required this.stageKey,
  });

  String labelFor(String locale) {
    if (locale == 'ar') return labelAr;
    if (locale == 'en') return labelEn;
    return label;
  }
}

class _TechReviewFormScreenState extends ConsumerState<TechReviewFormScreen> {
  static const List<_AqaStrokeBarDef> _strokeBars = [
    _AqaStrokeBarDef(
      key: 'basics',
      order: 1,
      labelFr: '1 - Basics',
      labelEn: '1 - Basics',
      labelAr: '1 - الأساسيات (Basics)',
      asset: 'elephant.png',
    ),
    _AqaStrokeBarDef(
      key: 'crawl',
      order: 2,
      labelFr: '2 - Crawl',
      labelEn: '2 - Crawl',
      labelAr: '2 - الكراول (Crawl)',
      asset: 'crawler.png',
    ),
    _AqaStrokeBarDef(
      key: 'backstroke',
      order: 3,
      labelFr: '3 - Backstroke',
      labelEn: '3 - Backstroke',
      labelAr: '3 - سباحة الظهر (Backstroke)',
      asset: 'leaf.png',
    ),
    _AqaStrokeBarDef(
      key: 'breaststroke',
      order: 4,
      labelFr: '4 - Breaststroke (Brasse)',
      labelEn: '4 - Breaststroke (Brasse)',
      labelAr: '4 - سباحة الصدر (Brasse)',
      asset: 'brasseur.png',
    ),
    _AqaStrokeBarDef(
      key: 'butterfly',
      order: 5,
      labelFr: '5 - Butterfly',
      labelEn: '5 - Butterfly',
      labelAr: '5 - الفراشة (Butterfly)',
      asset: 'butterfly.png',
    ),
  ];

  static const List<_AqaBadgeDef> _officialBadges = [
    _AqaBadgeDef(
      key: 'starter',
      label: 'Starter',
      labelEn: 'Starter',
      labelAr: 'Starter',
      asset: 'starter.png',
      stageKey: 'basics',
    ),
    _AqaBadgeDef(
      key: 'beginner',
      label: 'Beginner',
      labelEn: 'Beginner',
      labelAr: 'Beginner',
      asset: 'beginner.png',
      stageKey: 'basics',
    ),
    _AqaBadgeDef(
      key: 'floater',
      label: 'Floater',
      labelEn: 'Floater',
      labelAr: 'Floater',
      asset: 'floater.png',
      stageKey: 'basics',
    ),
    _AqaBadgeDef(
      key: 'crawler',
      label: 'Crawler',
      labelEn: 'Crawler',
      labelAr: 'Crawler',
      asset: 'crawler.png',
      stageKey: 'crawl',
    ),
    _AqaBadgeDef(
      key: 'leaf',
      label: 'Leaf',
      labelEn: 'Leaf',
      labelAr: 'Leaf',
      asset: 'leaf.png',
      stageKey: 'backstroke',
    ),
    _AqaBadgeDef(
      key: 'brasseur',
      label: 'Brasseur',
      labelEn: 'Brasseur',
      labelAr: 'Brasseur',
      asset: 'brasseur.png',
      stageKey: 'breaststroke',
    ),
    _AqaBadgeDef(
      key: 'butterfly',
      label: 'Butterfly',
      labelEn: 'Butterfly',
      labelAr: 'Butterfly',
      asset: 'butterfly.png',
      stageKey: 'butterfly',
    ),
    _AqaBadgeDef(
      key: 'full_swimmer',
      label: 'Full swimmer',
      labelEn: 'Full swimmer',
      labelAr: 'Full swimmer',
      asset: 'full_swimmer.png',
      stageKey: 'elite',
    ),
    _AqaBadgeDef(
      key: 'dolphin',
      label: 'Dolphin',
      labelEn: 'Dolphin',
      labelAr: 'Dolphin',
      asset: 'dolphin.png',
      stageKey: 'elite',
    ),
    _AqaBadgeDef(
      key: 'shark',
      label: 'Shark',
      labelEn: 'Shark',
      labelAr: 'Shark',
      asset: 'shark.png',
      stageKey: 'elite',
    ),
    _AqaBadgeDef(
      key: 'orca',
      label: 'Orca',
      labelEn: 'Orca',
      labelAr: 'Orca',
      asset: 'orca.png',
      stageKey: 'elite',
    ),
    _AqaBadgeDef(
      key: 'whale',
      label: 'Whale',
      labelEn: 'Whale',
      labelAr: 'Whale',
      asset: 'whale.png',
      stageKey: 'elite',
    ),
    _AqaBadgeDef(
      key: 'kraken',
      label: 'Kraken',
      labelEn: 'Kraken',
      labelAr: 'Kraken',
      asset: 'kraken.png',
      stageKey: 'elite',
    ),
    _AqaBadgeDef(
      key: 'mosasaurus',
      label: 'Mosasaurus',
      labelEn: 'Mosasaurus',
      labelAr: 'Mosasaurus',
      asset: 'mosasaurus.png',
      stageKey: 'elite',
    ),
    _AqaBadgeDef(
      key: 'tsunami',
      label: 'Tsunami',
      labelEn: 'Tsunami',
      labelAr: 'Tsunami',
      asset: 'tsunami.png',
      stageKey: 'elite',
    ),
  ];

  // Step 0 = Evaluation (Progress bars only, no badges/stars)
  // Step 1 = Bilan (Volume, Observation, Stored Records, Physical Data, Badge Choose, Honor Request, Word from Coach)
  int _currentStep = 0;

  final Map<String, double> _bars = {
    'basics': 0,
    'crawl': 0,
    'backstroke': 0,
    'breaststroke': 0,
    'butterfly': 0,
  };

  String _lastTouchedBar = 'basics';
  bool _showAllFiveBars = false;

  // Bilan controllers & state
  final TextEditingController _volumeController = TextEditingController();
  final TextEditingController _observationController = TextEditingController();
  final TextEditingController _record50mController = TextEditingController();
  final TextEditingController _recordApneaController = TextEditingController();
  final TextEditingController _weightKgController = TextEditingController();
  final TextEditingController _heightCmController = TextEditingController();
  final TextEditingController _wordFromCoachController = TextEditingController();

  bool _recordsUnlockedForEdit = false;
  int _storedTotalDistanceMeters = 0;

  String? _selectedBadgeKey;
  String? _selectedHonorRequestType; // 'swimmer_of_the_month' | 'swimmer_of_the_year' | null

  bool _monthHonorLocked = false;
  String? _monthHonorWinnerName;
  bool _yearHonorLocked = false;
  String? _yearHonorWinnerName;

  bool _populated = false;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _volumeController.dispose();
    _observationController.dispose();
    _record50mController.dispose();
    _recordApneaController.dispose();
    _weightKgController.dispose();
    _heightCmController.dispose();
    _wordFromCoachController.dispose();
    super.dispose();
  }

  /// Volume is only available in Crawl or other stroke bars after Basics has 1% or above.
  /// No volume for a Basic-level swimmer.
  bool get _isVolumeAllowed {
    final basicsPct = _bars['basics'] ?? 0;
    if (basicsPct < 1) return false;
    final hasOtherStrokeProgress = (_bars['crawl'] ?? 0) > 0 ||
        (_bars['backstroke'] ?? 0) > 0 ||
        (_bars['breaststroke'] ?? 0) > 0 ||
        (_bars['butterfly'] ?? 0) > 0;
    return _lastTouchedBar != 'basics' || hasOtherStrokeProgress;
  }

  void _populateIfNeeded(Map<String, dynamic> profileData) {
    if (_populated) return;

    final member = profileData['member'] as Map<String, dynamic>?;
    if (member != null) {
      final rawBars = member['bars'] as Map<String, dynamic>?;
      if (rawBars != null) {
        for (final def in _strokeBars) {
          final v = rawBars[def.key];
          if (v is num) {
            _bars[def.key] = v.toDouble().clamp(0.0, 200.0);
          }
        }
      }
      final lt = member['lastTouchedBar'] as String?;
      if (lt != null && _bars.containsKey(lt)) {
        _lastTouchedBar = lt;
      }

      _storedTotalDistanceMeters = (member['totalDistanceMeters'] as num?)?.toInt() ?? 0;

      final r50 = member['record50m'];
      if (r50 is num && r50 > 0) {
        _record50mController.text = r50.toString();
      }
      final rApnea = member['recordApnea'];
      if (rApnea is num && rApnea > 0) {
        _recordApneaController.text = rApnea.toString();
      }
      final wKg = member['weightKg'];
      if (wKg is num && wKg > 0) {
        _weightKgController.text = wKg.toString();
      }
      final hCm = member['heightCm'];
      if (hCm is num && hCm > 0) {
        _heightCmController.text = hCm.toString();
      }
      final wCoach = member['wordFromCoach'] as String?;
      if (wCoach != null && wCoach.isNotEmpty) {
        _wordFromCoachController.text = wCoach;
      }
      final bKey = member['badgeKey'] as String?;
      if (bKey != null && bKey.isNotEmpty) {
        _selectedBadgeKey = bKey;
      }
    }

    final lockStatus = profileData['honorLockStatus'] as Map<String, dynamic>?;
    if (lockStatus != null) {
      _monthHonorLocked = lockStatus['swimmerOfTheMonthLocked'] == true;
      final mWinner = lockStatus['swimmerOfTheMonthWinner'] as Map<String, dynamic>?;
      _monthHonorWinnerName = mWinner?['memberName'] as String?;

      _yearHonorLocked = lockStatus['swimmerOfTheYearLocked'] == true;
      final yWinner = lockStatus['swimmerOfTheYearWinner'] as Map<String, dynamic>?;
      _yearHonorWinnerName = yWinner?['memberName'] as String?;
    }

    _populated = true;
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;
    setState(() => _isSubmitting = true);

    final clientMutationId = '${DateTime.now().millisecondsSinceEpoch}-${widget.memberId}';
    final sessionVol = _isVolumeAllowed ? int.tryParse(_volumeController.text.trim()) : 0;
    final rec50 = double.tryParse(_record50mController.text.trim());
    final recApnea = double.tryParse(_recordApneaController.text.trim());
    final weight = double.tryParse(_weightKgController.text.trim());
    final height = double.tryParse(_heightCmController.text.trim());
    final obs = _observationController.text.trim();
    final wordCoach = _wordFromCoachController.text.trim();

    final barsRounded = <String, int>{
      for (final entry in _bars.entries) entry.key: entry.value.round().clamp(0, 200),
    };

    final selectedBadgeDef = _selectedBadgeKey != null
        ? _officialBadges.where((b) => b.key == _selectedBadgeKey).firstOrNull
        : null;

    final payload = <String, dynamic>{
      'clientMutationId': clientMutationId,
      'memberId': widget.memberId,
      'bars': barsRounded,
      'lastTouchedBar': _lastTouchedBar,
      if (selectedBadgeDef != null) 'awardedBadgeKey': selectedBadgeDef.key,
      if (selectedBadgeDef != null) 'recommendedLevel': selectedBadgeDef.label,
      if (sessionVol != null && sessionVol > 0) 'sessionVolumeMeters': sessionVol,
      if (obs.isNotEmpty) 'observation': obs,
      if (rec50 != null && rec50 > 0) 'record50m': rec50,
      if (recApnea != null && recApnea > 0) 'recordApnea': recApnea,
      if (weight != null && weight > 0) 'weightKg': weight,
      if (height != null && height > 0) 'heightCm': height,
      if (wordCoach.isNotEmpty) 'wordFromCoach': wordCoach,
      if (_selectedHonorRequestType != null) 'honorRequestType': _selectedHonorRequestType,
    };

    final client = ref.read(apiClientProvider);

    try {
      final response = await client.dio.post(
        ApiEndpoints.submitReview(widget.memberId),
        data: payload,
      );

      if (response.statusCode == 200 && mounted) {
        final i18n = ref.read(i18nProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AqaTheme.statusSuccess,
            content: Text(
              i18n.locale == 'ar'
                  ? 'تم حفظ التقييم والحصيلة بنجاح.'
                  : i18n.locale == 'en'
                      ? 'Evaluation and Bilan saved successfully.'
                      : 'Evaluation et Bilan enregistres avec succes.',
            ),
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
          payload: payload,
          timestamp: DateTime.now().toIso8601String(),
        ),
      );

      if (mounted) {
        final i18n = ref.read(i18nProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AqaTheme.statusWarning,
            content: Text(
              i18n.locale == 'ar'
                  ? 'وضع غير متصل: تم حفظ التقييم للمزامنة التلقائية.'
                  : i18n.locale == 'en'
                      ? 'Offline mode: evaluation queued for sync.'
                      : 'Mode hors-ligne: Evaluation enregistree pour synchronisation.',
            ),
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
    profileAsync.whenData(_populateIfNeeded);
    final i18n = ref.watch(i18nProvider);

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: Text(
          _currentStep == 0
              ? (i18n.locale == 'ar'
                  ? '1. التقييم الفني (0% - 200%)'
                  : i18n.locale == 'en'
                      ? '1. Swim Evaluation (0% - 200%)'
                      : '1. Evaluation Nage (0% - 200%)')
              : (i18n.locale == 'ar'
                  ? '2. حصيلة السباح والشارات (Bilan)'
                  : i18n.locale == 'en'
                      ? '2. Swimmer Bilan & Honors'
                      : '2. Bilan Nageur & Distinctions'),
        ),
        actions: const [
          Padding(
            padding: EdgeInsets.symmetric(vertical: 14.0),
            child: LanguageSwitcherPill(compact: true),
          ),
          SizedBox(width: 8.0),
        ],
      ),
      body: AqaAmbientBackground(
        child: Column(
          children: [
            // 2-Step Header Strip (1. Evaluation -> 2. Bilan)
            Container(
              padding: const EdgeInsets.fromLTRB(16.0, 12.0, 16.0, 12.0),
              decoration: const BoxDecoration(
                color: AqaTheme.surfaceDark,
                border: Border(bottom: BorderSide(color: AqaTheme.borderSubtle)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _buildStepSelectorPill(
                      index: 0,
                      label: i18n.locale == 'ar'
                          ? '1. التقييم (أشرطة التقدم)'
                          : i18n.locale == 'en'
                              ? '1. Evaluation (Progress Bars)'
                              : '1. Evaluation (Barres 0-200%)',
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  Expanded(
                    child: _buildStepSelectorPill(
                      index: 1,
                      label: i18n.locale == 'ar'
                          ? '2. الحصيلة والشارات (Bilan)'
                          : i18n.locale == 'en'
                              ? '2. Bilan & Badges'
                              : '2. Bilan & Badges',
                    ),
                  ),
                ],
              ),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
                child: _currentStep == 0
                    ? _buildStep1EvaluationBarsOnly(i18n)
                    : _buildStep2Bilan(i18n),
              ),
            ),

            // Bottom Action Bar
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
                    if (_currentStep == 1) ...[
                      OutlinedButton.icon(
                        onPressed: () => setState(() => _currentStep = 0),
                        icon: const Icon(Icons.arrow_back_rounded, size: 16.0),
                        label: Text(
                          i18n.locale == 'ar'
                              ? 'رجوع للتقييم'
                              : i18n.locale == 'en'
                                  ? 'Back'
                                  : 'Retour Evaluation',
                        ),
                      ),
                      const SizedBox(width: 10.0),
                    ],
                    Expanded(
                      child: _currentStep == 0
                          ? AqaIslandButton(
                              label: i18n.locale == 'ar'
                                  ? 'التالي: الحصيلة (Bilan)'
                                  : i18n.locale == 'en'
                                      ? 'Next: Swimmer Bilan'
                                      : 'Suivant : Etape Bilan',
                              icon: Icons.arrow_forward_rounded,
                              onPressed: () => setState(() => _currentStep = 1),
                            )
                          : AqaIslandButton(
                              label: _isSubmitting
                                  ? i18n.t('common.saving')
                                  : (i18n.locale == 'ar'
                                      ? 'تأكيد وحفظ التقييم والحصيلة'
                                      : i18n.locale == 'en'
                                          ? 'Validate Evaluation & Bilan'
                                          : 'Valider Evaluation & Bilan'),
                              icon: Icons.check_circle_outline_rounded,
                              loading: _isSubmitting,
                              color: AqaTheme.statusSuccess,
                              textColor: Colors.white,
                              onPressed: _submit,
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepSelectorPill({required int index, required String label}) {
    final active = _currentStep == index;
    return InkWell(
      onTap: () => setState(() => _currentStep = index),
      borderRadius: BorderRadius.circular(12.0),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10.0, horizontal: 10.0),
        decoration: BoxDecoration(
          color: active
              ? AqaTheme.accentTeal.withValues(alpha: 0.14)
              : const Color(0xFF080E1E),
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(
            color: active ? AqaTheme.accentTeal : AqaTheme.borderSubtle,
            width: active ? 1.5 : 1.0,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: active ? AqaTheme.accentTeal : AqaTheme.textMuted,
            fontSize: 12.0,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }

  /// STEP 1: Evaluation — ONLY progress bars (0% to 200%). NO badges, NO stars.
  /// Shows the last touched progress bar by default, with a button to show all 5 progress bars.
  Widget _buildStep1EvaluationBarsOnly(AppI18n i18n) {
    final visibleBars = _showAllFiveBars
        ? _strokeBars
        : _strokeBars.where((b) => b.key == _lastTouchedBar).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Scale Legend & Show All 5 Toggle Card
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(16.0),
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
                          i18n.locale == 'ar'
                              ? 'تقييم السباحة بالتمرير (0% إلى 200%)'
                              : i18n.locale == 'en'
                                  ? 'Slide Progress Bar (0% to 200%)'
                                  : 'Evaluation par glissement (0% a 200%)',
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 15.0,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4.0),
                        Text(
                          i18n.locale == 'ar'
                              ? '0% - 100%: تقييم تقني • 100% - 200%: تطوير النخبة (التحمل، السرعة، القوة)'
                              : i18n.locale == 'en'
                                  ? '0% - 100%: Technical Evaluation • 100% - 200%: Elite Development (Endurance, Speed, Strength)'
                                  : '0% - 100% : Evaluation Technique • 100% - 200% : Elite (Endurance, Vitesse, Force)',
                          style: const TextStyle(
                            color: AqaTheme.textMuted,
                            fontSize: 11.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14.0),

              // Toggle Button: Show Last Touched Bar vs Show All 5 Progress Bars
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    setState(() {
                      _showAllFiveBars = !_showAllFiveBars;
                    });
                  },
                  icon: Icon(
                    _showAllFiveBars ? Icons.unfold_less_rounded : Icons.tune_rounded,
                    size: 18.0,
                    color: AqaTheme.accentTeal,
                  ),
                  label: Text(
                    _showAllFiveBars
                        ? (i18n.locale == 'ar'
                            ? 'إظهار آخر شريط تم لمسه فقط'
                            : i18n.locale == 'en'
                                ? 'Show Last Touched Progress Bar Only'
                                : 'Afficher uniquement la derniere barre touchee')
                        : (i18n.locale == 'ar'
                            ? 'إظهار جميع أشرطة التقدم الخمسة (5 أشرطة)'
                            : i18n.locale == 'en'
                                ? 'Show All 5 Progress Bars'
                                : 'Afficher les 5 barres de progression'),
                    style: const TextStyle(
                      color: AqaTheme.accentTeal,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),

              if (!_showAllFiveBars) ...[
                const SizedBox(height: 12.0),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _strokeBars.map((def) {
                      final isCurrent = def.key == _lastTouchedBar;
                      final val = (_bars[def.key] ?? 0).round();
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(10.0),
                          onTap: () => setState(() => _lastTouchedBar = def.key),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10.0,
                              vertical: 7.0,
                            ),
                            decoration: BoxDecoration(
                              color: isCurrent
                                  ? AqaTheme.primarySky.withValues(alpha: 0.18)
                                  : const Color(0xFF080E1E),
                              borderRadius: BorderRadius.circular(10.0),
                              border: Border.all(
                                color: isCurrent
                                    ? AqaTheme.primarySky
                                    : AqaTheme.borderSubtle,
                              ),
                            ),
                            child: Text(
                              '${def.labelFor(i18n.locale)} ($val%)',
                              style: TextStyle(
                                color: isCurrent
                                    ? AqaTheme.textPrimary
                                    : AqaTheme.textMuted,
                                fontSize: 11.5,
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
            ],
          ),
        ),
        const SizedBox(height: 14.0),

        // Progress Bar Cards (Either Last-Touched or All 5)
        ...visibleBars.map((def) => _buildInteractiveStrokeBarCard(def, i18n)),
      ],
    );
  }

  Widget _buildInteractiveStrokeBarCard(_AqaStrokeBarDef def, AppI18n i18n) {
    final currentVal = (_bars[def.key] ?? 0.0).clamp(0.0, 200.0);
    final pctInt = currentVal.round();
    final isEliteZone = currentVal > 100.0;
    final isLastTouched = _lastTouchedBar == def.key;

    final activeColor = isEliteZone ? AqaTheme.statusWarning : AqaTheme.accentTeal;
    final zoneLabel = isEliteZone
        ? (i18n.locale == 'ar'
            ? 'تطوير النخبة (تحمل، سرعة، قوة)'
            : i18n.locale == 'en'
                ? 'Elite Development (Endurance, Speed, Strength)'
                : 'Developpement Elite (Endurance, Vitesse, Force)')
        : (i18n.locale == 'ar'
            ? 'تقييم تقني (0% - 100%)'
            : i18n.locale == 'en'
                ? 'Technical Evaluation (0% - 100%)'
                : 'Evaluation Technique (0% - 100%)');

    return AqaDoubleBezelCard(
      margin: const EdgeInsets.only(bottom: 12.0),
      glowEffect: isLastTouched,
      padding: const EdgeInsets.all(16.0),
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
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            def.labelFor(i18n.locale),
                            style: const TextStyle(
                              color: AqaTheme.textPrimary,
                              fontSize: 15.5,
                              fontWeight: FontWeight.w800,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isLastTouched) ...[
                          const SizedBox(width: 8.0),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7.0,
                              vertical: 2.0,
                            ),
                            decoration: BoxDecoration(
                              color: AqaTheme.accentTeal.withValues(alpha: 0.14),
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(color: AqaTheme.borderTeal),
                            ),
                            child: Text(
                              i18n.locale == 'ar'
                                  ? 'نشط'
                                  : i18n.locale == 'en'
                                      ? 'LAST TOUCHED'
                                      : 'DERNIERE TOUCHEE',
                              style: const TextStyle(
                                color: AqaTheme.accentTeal,
                                fontSize: 9.0,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3.0),
                    Text(
                      zoneLabel,
                      style: TextStyle(
                        color: activeColor,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
                decoration: BoxDecoration(
                  color: activeColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10.0),
                  border: Border.all(color: activeColor),
                ),
                child: Text(
                  '$pctInt%',
                  style: TextStyle(
                    color: activeColor,
                    fontSize: 16.0,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14.0),

          // Visual 2-Zone Progress Bar (0-100% Technical | 100-200% Elite)
          LayoutBuilder(
            builder: (context, constraints) {
              final fullWidth = constraints.maxWidth;
              final techFillRatio = (currentVal.clamp(0.0, 100.0)) / 200.0;
              final eliteFillRatio = ((currentVal - 100.0).clamp(0.0, 100.0)) / 200.0;

              return Column(
                children: [
                  Stack(
                    alignment: Alignment.centerLeft,
                    children: [
                      Container(
                        height: 14.0,
                        width: fullWidth,
                        decoration: BoxDecoration(
                          color: const Color(0xFF070C18),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: AqaTheme.borderSubtle),
                        ),
                      ),
                      Row(
                        children: [
                          if (techFillRatio > 0)
                            Container(
                              height: 14.0,
                              width: fullWidth * techFillRatio,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [AqaTheme.primarySky, AqaTheme.accentTeal],
                                ),
                                borderRadius: BorderRadius.horizontal(
                                  left: const Radius.circular(999),
                                  right: eliteFillRatio > 0
                                      ? Radius.zero
                                      : const Radius.circular(999),
                                ),
                              ),
                            ),
                          if (eliteFillRatio > 0)
                            Container(
                              height: 14.0,
                              width: fullWidth * eliteFillRatio,
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [AqaTheme.accentTeal, AqaTheme.statusWarning],
                                ),
                                borderRadius: BorderRadius.horizontal(
                                  right: Radius.circular(999),
                                ),
                              ),
                            ),
                        ],
                      ),
                      // 100% Midpoint Divider Marker
                      Positioned(
                        left: fullWidth * 0.5 - 1.0,
                        child: Container(
                          width: 2.0,
                          height: 18.0,
                          color: Colors.white.withValues(alpha: 0.65),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4.0),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        '0%',
                        style: TextStyle(
                          color: AqaTheme.textLightMuted,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        i18n.locale == 'ar'
                            ? '100% (تقني مكتمل)'
                            : i18n.locale == 'en'
                                ? '100% (Technical Complete)'
                                : '100% (Technique acquise)',
                        style: const TextStyle(
                          color: AqaTheme.accentTeal,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Text(
                        '200% (Elite)',
                        style: TextStyle(
                          color: AqaTheme.statusWarning,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),

          // Interactive Finger Slider (0% to 200%)
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: activeColor,
              inactiveTrackColor: AqaTheme.surfaceTertiary,
              thumbColor: activeColor,
              overlayColor: activeColor.withValues(alpha: 0.18),
              trackHeight: 6.0,
            ),
            child: Slider(
              value: currentVal,
              min: 0.0,
              max: 200.0,
              divisions: 200,
              label: '$pctInt%',
              onChanged: (val) {
                setState(() {
                  _bars[def.key] = val.roundToDouble();
                  _lastTouchedBar = def.key;
                });
              },
            ),
          ),
        ],
      ),
    );
  }

  /// STEP 2: Bilan (Volume, Observation, Stored Records, Physical Data, Badge Choose, Honor Request, Word from Coach)
  Widget _buildStep2Bilan(AppI18n i18n) {
    final sessionVol = int.tryParse(_volumeController.text.trim()) ?? 0;
    final projectedTotalMeters =
        _storedTotalDistanceMeters + (_isVolumeAllowed && sessionVol > 0 ? sessionVol : 0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Session Volume (Only visible in Crawl or other bars after Basics >= 1%)
        if (_isVolumeAllowed) ...[
          AqaDoubleBezelCard(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: AqaSectionHeader(
                        title: i18n.locale == 'ar'
                            ? 'حجم الحصة (المسافة بالمتر)'
                            : i18n.locale == 'en'
                                ? 'Session Volume (Distance in Meters)'
                                : 'Volume de la Seance (Distance en metres)',
                        subtitle: i18n.locale == 'ar'
                            ? 'يتم حساب المسافة الإجمالية لتطبيق أعضاء AQA'
                            : i18n.locale == 'en'
                                ? 'Cumulative distance tracked for future AQA Member App'
                                : 'Distance cumulee calculee pour l\'application AQA Member',
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 6.0),
                      decoration: BoxDecoration(
                        color: AqaTheme.accentTeal.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(10.0),
                        border: Border.all(color: AqaTheme.borderTeal),
                      ),
                      child: Text(
                        'Total: $projectedTotalMeters m',
                        style: const TextStyle(
                          color: AqaTheme.accentTeal,
                          fontSize: 12.0,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12.0),
                TextField(
                  controller: _volumeController,
                  keyboardType: TextInputType.number,
                  onChanged: (_) => setState(() {}),
                  style: const TextStyle(color: AqaTheme.textPrimary),
                  decoration: InputDecoration(
                    labelText: i18n.locale == 'ar'
                        ? 'المسافة المقطوعة في هذه الحصة (متر)'
                        : i18n.locale == 'en'
                            ? 'Single session distance (meters)'
                            : 'Distance nagee durant la seance (m)',
                    hintText: 'Ex: 800',
                    prefixIcon: const Icon(
                      Icons.straighten_rounded,
                      color: AqaTheme.accentTeal,
                      size: 18.0,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14.0),
        ],

        // 2. Observation (Optional)
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AqaSectionHeader(
                title: i18n.locale == 'ar'
                    ? 'ملاحظة الحصة (اختياري)'
                    : i18n.locale == 'en'
                        ? 'Session Observation (Optional)'
                        : 'Observation (Optionnel)',
                subtitle: i18n.locale == 'ar'
                    ? 'ملاحظة تقنية حول أداء السباح اليوم'
                    : i18n.locale == 'en'
                        ? 'Optional observation on today\'s session'
                        : 'Remarque technique facultative sur la seance',
              ),
              const SizedBox(height: 10.0),
              TextField(
                controller: _observationController,
                maxLines: 2,
                style: const TextStyle(color: AqaTheme.textPrimary),
                decoration: InputDecoration(
                  hintText: i18n.locale == 'ar'
                      ? 'أضف ملاحظة اختيارية...'
                      : i18n.locale == 'en'
                          ? 'Optional session observation...'
                          : 'Observation facultative...',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14.0),

        // 3. Stored Records (50m Record, Apnea Record) — Locked by default so not edited in each session
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: AqaSectionHeader(
                      title: i18n.locale == 'ar'
                          ? 'الأرقام القياسية المسجلة (50م وانقطاع النفس)'
                          : i18n.locale == 'en'
                              ? 'Stored Records (50m & Apnea)'
                              : 'Records Enregistres (50m & Apnee)',
                      subtitle: i18n.locale == 'ar'
                          ? 'محفوظة في ملف السباح (لا تُعدّل في كل حصة إلا عند تحطيم رقم قياسي)'
                          : i18n.locale == 'en'
                              ? 'Stored on profile — not edited in each session unless broken'
                              : 'Stockes dans le profil — ne pas modifier a chaque seance',
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () {
                      setState(() {
                        _recordsUnlockedForEdit = !_recordsUnlockedForEdit;
                      });
                    },
                    icon: Icon(
                      _recordsUnlockedForEdit
                          ? Icons.lock_open_rounded
                          : Icons.lock_outline_rounded,
                      size: 16.0,
                      color: _recordsUnlockedForEdit
                          ? AqaTheme.statusWarning
                          : AqaTheme.accentTeal,
                    ),
                    label: Text(
                      _recordsUnlockedForEdit
                          ? (i18n.locale == 'ar'
                              ? 'قفل'
                              : i18n.locale == 'en'
                                  ? 'Lock'
                                  : 'Verrouiller')
                          : (i18n.locale == 'ar'
                              ? 'تحديث رقم قياسي'
                              : i18n.locale == 'en'
                                  ? 'New Record'
                                  : 'Nouveau Record'),
                      style: TextStyle(
                        color: _recordsUnlockedForEdit
                            ? AqaTheme.statusWarning
                            : AqaTheme.accentTeal,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10.0),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _record50mController,
                      readOnly: !_recordsUnlockedForEdit,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: TextStyle(
                        color: _recordsUnlockedForEdit
                            ? AqaTheme.textPrimary
                            : AqaTheme.textMuted,
                      ),
                      decoration: InputDecoration(
                        labelText: i18n.locale == 'ar'
                            ? 'رقم 50 متر (ثانية)'
                            : i18n.locale == 'en'
                                ? '50m Record (s)'
                                : 'Record 50m (s)',
                        hintText: 'Ex: 34.5',
                        prefixIcon: const Icon(
                          Icons.timer_outlined,
                          color: AqaTheme.primarySky,
                          size: 18.0,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  Expanded(
                    child: TextField(
                      controller: _recordApneaController,
                      readOnly: !_recordsUnlockedForEdit,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: TextStyle(
                        color: _recordsUnlockedForEdit
                            ? AqaTheme.textPrimary
                            : AqaTheme.textMuted,
                      ),
                      decoration: InputDecoration(
                        labelText: i18n.locale == 'ar'
                            ? 'رقم انقطاع النفس (ثانية/متر)'
                            : i18n.locale == 'en'
                                ? 'Apnea Record (s / m)'
                                : 'Record Apnee (s / m)',
                        hintText: 'Ex: 45',
                        prefixIcon: const Icon(
                          Icons.air_rounded,
                          color: AqaTheme.accentTeal,
                          size: 18.0,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14.0),

        // 4. Physical Data (Stored: Weight & Tall)
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AqaSectionHeader(
                title: i18n.locale == 'ar'
                    ? 'البيانات الجسدية المسجلة (الوزن والطول)'
                    : i18n.locale == 'en'
                        ? 'Stored Physical Data (Weight & Tall)'
                        : 'Donnees Physiques Enregistrees (Poids & Taille)',
                subtitle: i18n.locale == 'ar'
                    ? 'محفوظة في ملف السباح لمتابعة النمو'
                    : i18n.locale == 'en'
                        ? 'Persisted on the swimmer profile'
                        : 'Conservees dans le dossier du nageur',
              ),
              const SizedBox(height: 10.0),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _weightKgController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(color: AqaTheme.textPrimary),
                      decoration: InputDecoration(
                        labelText: i18n.locale == 'ar'
                            ? 'الوزن (كغ)'
                            : i18n.locale == 'en'
                                ? 'Weight (kg)'
                                : 'Poids (kg)',
                        hintText: 'Ex: 62',
                        prefixIcon: const Icon(
                          Icons.monitor_weight_outlined,
                          color: AqaTheme.primarySky,
                          size: 18.0,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  Expanded(
                    child: TextField(
                      controller: _heightCmController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(color: AqaTheme.textPrimary),
                      decoration: InputDecoration(
                        labelText: i18n.locale == 'ar'
                            ? 'الطول (سم)'
                            : i18n.locale == 'en'
                                ? 'Tall / Height (cm)'
                                : 'Taille (cm)',
                        hintText: 'Ex: 172',
                        prefixIcon: const Icon(
                          Icons.height_rounded,
                          color: AqaTheme.accentTeal,
                          size: 18.0,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14.0),

        // 5. Badge Choose (Horizontal Sliding Toggle Bar of Badges + Swimmer of the Month / Year)
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AqaSectionHeader(
                title: i18n.locale == 'ar'
                    ? 'اختيار شارة التكريم (شريط التمرير)'
                    : i18n.locale == 'en'
                        ? 'Badge Choose (Slide Toggle Bar)'
                        : 'Choix du Badge (Barre glissante de distinction)',
                subtitle: i18n.locale == 'ar'
                    ? 'مرر واختر شارة لتكريم السباح'
                    : i18n.locale == 'en'
                        ? 'Slide across the toggle bar to honor the swimmer'
                        : 'Glissez sur la barre pour honorer le nageur avec un badge officiel',
              ),
              const SizedBox(height: 12.0),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _officialBadges.map((badge) {
                    final isSelected = _selectedBadgeKey == badge.key;
                    return Padding(
                      padding: const EdgeInsets.only(right: 10.0),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14.0),
                        onTap: () {
                          setState(() {
                            if (isSelected) {
                              _selectedBadgeKey = null;
                            } else {
                              _selectedBadgeKey = badge.key;
                            }
                          });
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 160),
                          width: 96.0,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8.0,
                            vertical: 10.0,
                          ),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AqaTheme.primarySky.withValues(alpha: 0.20)
                                : const Color(0xFF080E1E),
                            borderRadius: BorderRadius.circular(14.0),
                            border: Border.all(
                              color: isSelected
                                  ? AqaTheme.accentTeal
                                  : AqaTheme.borderSubtle,
                              width: isSelected ? 1.8 : 1.0,
                            ),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 42.0,
                                height: 42.0,
                                child: Image.asset(
                                  'assets/images/badges/${badge.asset}',
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, __, ___) => const Icon(
                                    Icons.workspace_premium_rounded,
                                    color: AqaTheme.accentTeal,
                                    size: 28.0,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6.0),
                              Text(
                                badge.labelFor(i18n.locale),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: isSelected
                                      ? AqaTheme.textPrimary
                                      : AqaTheme.textMuted,
                                  fontSize: 11.0,
                                  fontWeight: isSelected
                                      ? FontWeight.w800
                                      : FontWeight.w600,
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
              const SizedBox(height: 16.0),

              // Special Honor Badges: Swimmer of the Month & Swimmer of the Year (ERP Approval Flow)
              Text(
                i18n.locale == 'ar'
                    ? 'ترشيحات خاصة لإدارة AQA ERP (سباح الشهر / سباح السنة)'
                    : i18n.locale == 'en'
                        ? 'Special AQA ERP Nominations (Swimmer of the Month / Year)'
                        : 'Distinctions Speciales AQA ERP (Nageur du Mois / Nageur de l\'Annee)',
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4.0),
              Text(
                i18n.locale == 'ar'
                    ? 'يرسل طلباً لإدارة AQA ERP للمقارنة والاختيار. عند القبول يُقفل حتى الشهر القادم.'
                    : i18n.locale == 'en'
                        ? 'Sends a request to AQA ERP to compare candidates. Once accepted by Admin, locked until next month/year.'
                        : 'Envoie une demande a l\'ERP AQA pour comparer les candidats. Des validation par l\'admin, verrouille jusqu\'au mois suivant.',
                style: const TextStyle(
                  color: AqaTheme.textLightMuted,
                  fontSize: 11.0,
                ),
              ),
              const SizedBox(height: 10.0),
              Row(
                children: [
                  Expanded(
                    child: _buildSpecialHonorToggle(
                      typeKey: 'swimmer_of_the_month',
                      title: i18n.locale == 'ar'
                          ? 'سباح الشهر'
                          : i18n.locale == 'en'
                              ? 'Swimmer of the Month'
                              : 'Nageur du Mois',
                      locked: _monthHonorLocked,
                      winnerName: _monthHonorWinnerName,
                      i18n: i18n,
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  Expanded(
                    child: _buildSpecialHonorToggle(
                      typeKey: 'swimmer_of_the_year',
                      title: i18n.locale == 'ar'
                          ? 'سباح السنة'
                          : i18n.locale == 'en'
                              ? 'Swimmer of the Year'
                              : 'Nageur de l\'Annee',
                      locked: _yearHonorLocked,
                      winnerName: _yearHonorWinnerName,
                      i18n: i18n,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14.0),

        // 6. Word from your Coach (Editable in Bilan step)
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AqaSectionHeader(
                title: i18n.locale == 'ar'
                    ? 'كلمة من مدربك (Word from your Coach)'
                    : i18n.locale == 'en'
                        ? 'Word from your Coach'
                        : 'Mot de votre Coach (Word from your Coach)',
                subtitle: i18n.locale == 'ar'
                    ? 'رسالة تشجيعية وتوجيهية تظهر في ملف السباح'
                    : i18n.locale == 'en'
                        ? 'Personalized message saved on the swimmer profile'
                        : 'Message personnalise enregistre sur le profil du nageur',
              ),
              const SizedBox(height: 10.0),
              TextField(
                controller: _wordFromCoachController,
                maxLines: 3,
                style: const TextStyle(color: AqaTheme.textPrimary),
                decoration: InputDecoration(
                  hintText: i18n.locale == 'ar'
                      ? 'اكتب كلمة المدرب للسباح...'
                      : i18n.locale == 'en'
                          ? 'Write a word from the coach...'
                          : 'Redigez le mot du coach pour ce nageur...',
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSpecialHonorToggle({
    required String typeKey,
    required String title,
    required bool locked,
    required String? winnerName,
    required AppI18n i18n,
  }) {
    final isSelected = _selectedHonorRequestType == typeKey;

    return InkWell(
      borderRadius: BorderRadius.circular(12.0),
      onTap: locked
          ? null
          : () {
              setState(() {
                if (isSelected) {
                  _selectedHonorRequestType = null;
                } else {
                  _selectedHonorRequestType = typeKey;
                }
              });
            },
      child: Container(
        padding: const EdgeInsets.all(12.0),
        decoration: BoxDecoration(
          color: locked
              ? AqaTheme.surfaceSecondary.withValues(alpha: 0.45)
              : isSelected
                  ? AqaTheme.statusWarning.withValues(alpha: 0.16)
                  : const Color(0xFF080E1E),
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(
            color: locked
                ? AqaTheme.borderSubtle
                : isSelected
                    ? AqaTheme.statusWarning
                    : AqaTheme.borderSubtle,
            width: isSelected ? 1.6 : 1.0,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  locked
                      ? Icons.lock_rounded
                      : Icons.workspace_premium_rounded,
                  size: 16.0,
                  color: locked
                      ? AqaTheme.textLightMuted
                      : isSelected
                          ? AqaTheme.statusWarning
                          : AqaTheme.accentTeal,
                ),
                const SizedBox(width: 6.0),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      color: locked ? AqaTheme.textMuted : AqaTheme.textPrimary,
                      fontSize: 12.0,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4.0),
            Text(
              locked
                  ? (winnerName != null
                      ? 'Elu: $winnerName'
                      : (i18n.locale == 'ar'
                          ? 'مقفل لهذه الفترة'
                          : i18n.locale == 'en'
                              ? 'Locked for period'
                              : 'Verrouille (deja elu)'))
                  : isSelected
                      ? (i18n.locale == 'ar'
                          ? 'سيتم إرسال الطلب لـ ERP'
                          : i18n.locale == 'en'
                              ? 'Request ready for AQA ERP'
                              : 'Demande prete pour AQA ERP')
                      : (i18n.locale == 'ar'
                          ? 'اضغط للترشيح'
                          : i18n.locale == 'en'
                              ? 'Tap to nominate'
                              : 'Toucher pour proposer'),
              style: TextStyle(
                color: locked
                    ? AqaTheme.textLightMuted
                    : isSelected
                        ? AqaTheme.statusWarning
                        : AqaTheme.textMuted,
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
