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

class _AqaBadgeDef {
  final String key;
  final String label;
  final String labelEn;
  final String labelAr;
  final String asset;
  final double minScore;
  final String stageKey;

  const _AqaBadgeDef({
    required this.key,
    required this.label,
    required this.labelEn,
    required this.labelAr,
    required this.asset,
    required this.minScore,
    required this.stageKey,
  });
}

class _AqaSkillDef {
  final String key;
  final String domainKey;
  final String labelFr;
  final String labelEn;
  final String labelAr;

  const _AqaSkillDef({
    required this.key,
    required this.domainKey,
    required this.labelFr,
    required this.labelEn,
    required this.labelAr,
  });
}

class _AqaDomainDef {
  final String key;
  final String labelFr;
  final String labelEn;
  final String labelAr;
  final List<_AqaSkillDef> skills;

  const _AqaDomainDef({
    required this.key,
    required this.labelFr,
    required this.labelEn,
    required this.labelAr,
    required this.skills,
  });
}

class _TechReviewFormScreenState extends ConsumerState<TechReviewFormScreen> {
  static const List<_AqaBadgeDef> _officialBadges = [
    _AqaBadgeDef(
      key: 'starter',
      label: 'Starter',
      labelEn: 'Starter',
      labelAr: 'المبتدئ الأول',
      asset: 'starter.png',
      minScore: 1.0,
      stageKey: 'elephant',
    ),
    _AqaBadgeDef(
      key: 'beginner',
      label: 'Beginner',
      labelEn: 'Beginner',
      labelAr: 'مبتدئ مائي',
      asset: 'beginner.png',
      minScore: 1.3,
      stageKey: 'elephant',
    ),
    _AqaBadgeDef(
      key: 'floater',
      label: 'Floater',
      labelEn: 'Floater',
      labelAr: 'الطفو المتوازن',
      asset: 'floater.png',
      minScore: 1.6,
      stageKey: 'elephant',
    ),
    _AqaBadgeDef(
      key: 'leaf',
      label: 'Leaf Glider',
      labelEn: 'Leaf Glider',
      labelAr: 'الانزلاق الانسيابي',
      asset: 'leaf.png',
      minScore: 1.9,
      stageKey: 'crocodile',
    ),
    _AqaBadgeDef(
      key: 'dolphin',
      label: 'Dolphin',
      labelEn: 'Dolphin',
      labelAr: 'الدلفين',
      asset: 'dolphin.png',
      minScore: 2.2,
      stageKey: 'crocodile',
    ),
    _AqaBadgeDef(
      key: 'crawler',
      label: 'Crawler',
      labelEn: 'Crawler',
      labelAr: 'سباح الكراول',
      asset: 'crawler.png',
      minScore: 2.5,
      stageKey: 'crocodile',
    ),
    _AqaBadgeDef(
      key: 'brasseur',
      label: 'Brasseur',
      labelEn: 'Breaststroker',
      labelAr: 'سباح الصدر',
      asset: 'brasseur.png',
      minScore: 2.8,
      stageKey: 'dauphin',
    ),
    _AqaBadgeDef(
      key: 'butterfly',
      label: 'Butterfly',
      labelEn: 'Butterfly',
      labelAr: 'سباح الفراشة',
      asset: 'butterfly.png',
      minScore: 3.1,
      stageKey: 'dauphin',
    ),
    _AqaBadgeDef(
      key: 'shark',
      label: 'Shark',
      labelEn: 'Shark',
      labelAr: 'القرش',
      asset: 'shark.png',
      minScore: 3.4,
      stageKey: 'dauphin',
    ),
    _AqaBadgeDef(
      key: 'orca',
      label: 'Orca',
      labelEn: 'Orca',
      labelAr: 'الأوركا',
      asset: 'orca.png',
      minScore: 3.7,
      stageKey: 'dauphin',
    ),
    _AqaBadgeDef(
      key: 'whale',
      label: 'Whale Endurance',
      labelEn: 'Whale Endurance',
      labelAr: 'تحمل الحوت',
      asset: 'whale.png',
      minScore: 4.0,
      stageKey: 'requin',
    ),
    _AqaBadgeDef(
      key: 'kraken',
      label: 'Kraken Power',
      labelEn: 'Kraken Power',
      labelAr: 'قوة الكراكن',
      asset: 'kraken.png',
      minScore: 4.2,
      stageKey: 'requin',
    ),
    _AqaBadgeDef(
      key: 'mosasaurus',
      label: 'Mosasaurus Elite',
      labelEn: 'Mosasaurus Elite',
      labelAr: 'نخبة الموزاصور',
      asset: 'mosasaurus.png',
      minScore: 4.4,
      stageKey: 'requin',
    ),
    _AqaBadgeDef(
      key: 'tsunami',
      label: 'Tsunami Master',
      labelEn: 'Tsunami Master',
      labelAr: 'سيد التسونامي',
      asset: 'tsunami.png',
      minScore: 4.6,
      stageKey: 'requin',
    ),
    _AqaBadgeDef(
      key: 'full_swimmer',
      label: 'Full Swimmer AQA Pro',
      labelEn: 'Full Swimmer AQA Pro',
      labelAr: 'السباح الكامل AQA Pro',
      asset: 'full_swimmer.png',
      minScore: 4.9,
      stageKey: 'requin',
    ),
  ];

  static const List<_AqaDomainDef> _domains = [
    _AqaDomainDef(
      key: 'water_comfort',
      labelFr: 'Aisance & Equilibre',
      labelEn: 'Water Comfort & Buoyancy',
      labelAr: 'التأقلم والتوازن المائي',
      skills: [
        _AqaSkillDef(
          key: 'immersion_breathing',
          domainKey: 'water_comfort',
          labelFr: 'Immersion & expiration subaquatique',
          labelEn: 'Facial immersion & underwater exhale',
          labelAr: 'غمر الوجه والزفير تحت الماء',
        ),
        _AqaSkillDef(
          key: 'star_float',
          domainKey: 'water_comfort',
          labelFr: 'Flottaison ventrale & dorsale (etoile)',
          labelEn: 'Ventral & dorsal star buoyancy',
          labelAr: 'الطفو البطني والظهري المتوازن',
        ),
        _AqaSkillDef(
          key: 'streamline_glide',
          domainKey: 'water_comfort',
          labelFr: 'Coulee ventrale hydrodynamique',
          labelEn: 'Hydrodynamic streamline glide',
          labelAr: 'الانزلاق الانسيابي تحت الماء',
        ),
        _AqaSkillDef(
          key: 'deep_water_safety',
          domainKey: 'water_comfort',
          labelFr: 'Entree, maintien & retour securise',
          labelEn: 'Safe entry, treading & wall return',
          labelAr: 'الدخول الآمن والبقاء والعودة للحافة',
        ),
      ],
    ),
    _AqaDomainDef(
      key: 'freestyle',
      labelFr: 'Crawl (Nage Libre)',
      labelEn: 'Freestyle (Front Crawl)',
      labelAr: 'السباحة الحرة (كراول)',
      skills: [
        _AqaSkillDef(
          key: 'freestyle_body_position',
          domainKey: 'freestyle',
          labelFr: 'Alignement horizontal & gainage',
          labelEn: 'Horizontal body alignment & core',
          labelAr: 'الاستقامة الأفقية وثبات الجذع',
        ),
        _AqaSkillDef(
          key: 'freestyle_flutter_kick',
          domainKey: 'freestyle',
          labelFr: 'Battements de jambes continus',
          labelEn: 'Continuous rhythmic flutter kick',
          labelAr: 'ضربات الأرجل المستمرة والمنتظمة',
        ),
        _AqaSkillDef(
          key: 'freestyle_catch_pull',
          domainKey: 'freestyle',
          labelFr: 'Prise d\'appui & traction subaquatique',
          labelEn: 'High-elbow catch & underwater pull',
          labelAr: 'مسك الماء والدفع الفعال بالذراعين',
        ),
        _AqaSkillDef(
          key: 'freestyle_bilateral_breathing',
          domainKey: 'freestyle',
          labelFr: 'Respiration laterale bilaterale',
          labelEn: 'Bilateral side breathing rhythm',
          labelAr: 'التنفس الجانبي الثنائي المتناسق',
        ),
      ],
    ),
    _AqaDomainDef(
      key: 'backstroke',
      labelFr: 'Dos Crawle',
      labelEn: 'Backstroke',
      labelAr: 'سباحة الظهر',
      skills: [
        _AqaSkillDef(
          key: 'backstroke_horizontal_body',
          domainKey: 'backstroke',
          labelFr: 'Corps horizontal & nuque relachee',
          labelEn: 'Horizontal posture & relaxed neck',
          labelAr: 'الاستقامة الأفقية واسترخاء العنق',
        ),
        _AqaSkillDef(
          key: 'backstroke_kick_regularity',
          domainKey: 'backstroke',
          labelFr: 'Battements dorsaux sous surface',
          labelEn: 'Sub-surface dorsal flutter kick',
          labelAr: 'ضربات الأرجل الخلفية تحت السطح',
        ),
        _AqaSkillDef(
          key: 'backstroke_arm_cycle',
          domainKey: 'backstroke',
          labelFr: 'Cycle de bras continu & roulis d\'epaules',
          labelEn: 'Continuous arm cycle & shoulder roll',
          labelAr: 'دوران الذراعين المتواصل مع حركة الكتفين',
        ),
        _AqaSkillDef(
          key: 'backstroke_directional_vision',
          domainKey: 'backstroke',
          labelFr: 'Trajectoire rectiligne & reperes visuels',
          labelEn: 'Straight navigation & visual landmarks',
          labelAr: 'المسار المستقيم ونقاط الاستدلال البصرية',
        ),
      ],
    ),
    _AqaDomainDef(
      key: 'breaststroke',
      labelFr: 'Brasse',
      labelEn: 'Breaststroke',
      labelAr: 'سباحة الصدر',
      skills: [
        _AqaSkillDef(
          key: 'breaststroke_whip_kick',
          domainKey: 'breaststroke',
          labelFr: 'Ciseau symetrique avec pieds en flexion',
          labelEn: 'Symmetrical whip kick & flexed feet',
          labelAr: 'ضربة الصدر المتماثلة مع ثني القدمين',
        ),
        _AqaSkillDef(
          key: 'breaststroke_arm_sweep',
          domainKey: 'breaststroke',
          labelFr: 'Traction en coeur & retour sous menton',
          labelEn: 'Heart-shaped arm sweep & chin recovery',
          labelAr: 'سحب الذراعين الدائري والعودة تحت الذقن',
        ),
        _AqaSkillDef(
          key: 'breaststroke_glide_phase',
          domainKey: 'breaststroke',
          labelFr: 'Phase de glisse hydrodynamique (1-2s)',
          labelEn: 'Streamline glide phase (1-2s)',
          labelAr: 'مرحلة الانزلاق الانسيابي (1-2 ثانية)',
        ),
        _AqaSkillDef(
          key: 'breaststroke_timing',
          domainKey: 'breaststroke',
          labelFr: 'Synchronisation bras-respiration-jambes-glisse',
          labelEn: 'Pull-breathe-kick-glide coordination',
          labelAr: 'تناسق الذراعين-التنفس-الأرجل-الانزلاق',
        ),
      ],
    ),
    _AqaDomainDef(
      key: 'butterfly_starts',
      labelFr: 'Papillon, Virages & Departs',
      labelEn: 'Butterfly, Turns & Starts',
      labelAr: 'الفراشة، الدورانات والانطلاقات',
      skills: [
        _AqaSkillDef(
          key: 'butterfly_undulation',
          domainKey: 'butterfly_starts',
          labelFr: 'Ondulation fluide depuis le bassin',
          labelEn: 'Fluid hip-driven dolphin undulation',
          labelAr: 'التموج الانسيابي المنطلق من الحوض',
        ),
        _AqaSkillDef(
          key: 'butterfly_stroke_recovery',
          domainKey: 'butterfly_starts',
          labelFr: 'Retour aerien rasant des deux bras',
          labelEn: 'Low forward double arm recovery',
          labelAr: 'الرجوع الهوائي المنخفض للذراعين معاً',
        ),
        _AqaSkillDef(
          key: 'flip_turns_touch',
          domainKey: 'butterfly_starts',
          labelFr: 'Virages culbutes & virages de brasse',
          labelEn: 'Flip turns & legal breaststroke touches',
          labelAr: 'دوران الشقلبة ولمس حائط الصدر القانوني',
        ),
        _AqaSkillDef(
          key: 'dive_start_breakout',
          domainKey: 'butterfly_starts',
          labelFr: 'Depart plonge du plot & reprise de nage',
          labelEn: 'Block dive start & underwater breakout',
          labelAr: 'الانطلاق من منصة القفز والانتقال للسباحة',
        ),
      ],
    ),
  ];

  String _selectedBadgeKey = 'starter';
  bool _manualBadgeOverride = false;

  final TextEditingController _strengthsController = TextEditingController();
  final TextEditingController _improvementsController = TextEditingController();
  final TextEditingController _goalsController = TextEditingController();
  final TextEditingController _time25mController = TextEditingController();
  final TextEditingController _time50mController = TextEditingController();
  final TextEditingController _maxDistanceController = TextEditingController();
  final TextEditingController _recommendedLevelController = TextEditingController();

  final Map<String, int> _skillScores = {};

  bool _catalogPopulated = false;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    for (final domain in _domains) {
      for (final skill in domain.skills) {
        _skillScores[skill.key] = 2;
      }
    }
  }

  @override
  void dispose() {
    _strengthsController.dispose();
    _improvementsController.dispose();
    _goalsController.dispose();
    _time25mController.dispose();
    _time50mController.dispose();
    _maxDistanceController.dispose();
    _recommendedLevelController.dispose();
    super.dispose();
  }

  double get _currentOverallAverage {
    if (_skillScores.isEmpty) return 1.0;
    final sum = _skillScores.values.fold(0, (acc, v) => acc + v);
    return sum / _skillScores.length;
  }

  _AqaBadgeDef get _computedBadge {
    final avg = _currentOverallAverage;
    _AqaBadgeDef matched = _officialBadges.first;
    for (final b in _officialBadges) {
      if (avg >= b.minScore) {
        matched = b;
      }
    }
    return matched;
  }

  _AqaBadgeDef get _activeBadge {
    if (_manualBadgeOverride) {
      return _officialBadges.firstWhere(
        (b) => b.key == _selectedBadgeKey,
        orElse: () => _computedBadge,
      );
    }
    return _computedBadge;
  }

  void _populateCatalogIfNeeded(Map<String, dynamic> profileData) {
    if (_catalogPopulated) return;

    final member = profileData['member'] as Map<String, dynamic>?;
    if (member != null) {
      final bKey = member['badgeKey'] as String?;
      if (bKey != null && bKey.isNotEmpty) {
        _selectedBadgeKey = bKey;
        _manualBadgeOverride = true;
      }
      final lvl = member['level'] as String?;
      if (lvl != null && lvl.isNotEmpty) {
        _recommendedLevelController.text = lvl;
      }
    }

    final reviews = (profileData['reviews'] as List<dynamic>?) ?? [];
    if (reviews.isNotEmpty && reviews.first is Map<String, dynamic>) {
      final latest = reviews.first as Map<String, dynamic>;
      final skillsJson = latest['skillsJson'] as Map<String, dynamic>?;
      if (skillsJson != null) {
        for (final entry in skillsJson.entries) {
          if (entry.key != '_meta' && entry.value is num) {
            _skillScores[entry.key] = (entry.value as num).toInt();
          }
        }
        final meta = skillsJson['_meta'] as Map<String, dynamic>?;
        if (meta != null) {
          final c25 = meta['chrono25mFreestyle'];
          final c50 = meta['chrono50mFreestyle'];
          final dist = meta['maxDistanceMeters'];
          final recLvl = meta['recommendedLevel'];
          if (c25 != null && _time25mController.text.isEmpty) {
            _time25mController.text = c25.toString();
          }
          if (c50 != null && _time50mController.text.isEmpty) {
            _time50mController.text = c50.toString();
          }
          if (dist != null && _maxDistanceController.text.isEmpty) {
            _maxDistanceController.text = dist.toString();
          }
          if (recLvl != null && recLvl.toString().isNotEmpty && _recommendedLevelController.text.isEmpty) {
            _recommendedLevelController.text = recLvl.toString();
          }
        }
      }
    }

    _catalogPopulated = true;
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);

    final activeBadge = _activeBadge;
    final clientMutationId = '${DateTime.now().millisecondsSinceEpoch}-${widget.memberId}';

    final t25 = double.tryParse(_time25mController.text.trim());
    final t50 = double.tryParse(_time50mController.text.trim());
    final dist = int.tryParse(_maxDistanceController.text.trim());
    final recLvl = _recommendedLevelController.text.trim();

    final skillsMap = <String, dynamic>{..._skillScores};

    final payload = {
      'clientMutationId': clientMutationId,
      'memberId': widget.memberId,
      'skillsJson': skillsMap,
      'awardedBadgeKey': activeBadge.key,
      'recommendedLevel': recLvl.isNotEmpty ? recLvl : activeBadge.label,
      'chrono25mFreestyle': t25,
      'chrono50mFreestyle': t50,
      'maxDistanceMeters': dist,
      'generalNotes': _strengthsController.text.trim().isNotEmpty
          ? _strengthsController.text.trim()
          : null,
      'strengths': _strengthsController.text.trim(),
      'improvements': _improvementsController.text.trim(),
      'nextGoals': _goalsController.text.trim(),
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
                  ? 'تم حفظ التقييم الفني وشارة التقدم بنجاح.'
                  : i18n.locale == 'en'
                      ? 'Technical review and badge saved successfully.'
                      : 'Evaluation technique et badge enregistres avec succes.',
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
                      ? 'Offline mode: review queued for background sync.'
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
    profileAsync.whenData(_populateCatalogIfNeeded);
    final i18n = ref.watch(i18nProvider);
    final activeBadge = _activeBadge;
    final overallAvg = _currentOverallAverage;

    String stageAssetForBadge(String stageKey) {
      switch (stageKey) {
        case 'crocodile':
          return 'Crocodile.png';
        case 'dauphin':
          return 'Dauphin.png';
        case 'requin':
          return 'requin.png';
        default:
          return 'elephant.png';
      }
    }

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: Text(
          i18n.locale == 'ar'
              ? 'تقييم فني وشارات AQA'
              : i18n.locale == 'en'
                  ? 'AQA Technical Review & Badges'
                  : 'Evaluation Technique & Badges AQA',
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
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Live Live Progression Header (Double Bezel)
              AqaDoubleBezelCard(
                glowEffect: true,
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      children: [
                        // Mascot stage icon
                        Container(
                          width: 54.0,
                          height: 54.0,
                          padding: const EdgeInsets.all(6.0),
                          decoration: BoxDecoration(
                            color: AqaTheme.surfaceSecondary,
                            shape: BoxShape.circle,
                            border: Border.all(color: AqaTheme.accentTeal.withValues(alpha: 0.6)),
                          ),
                          child: Image.asset(
                            'assets/images/badges/${stageAssetForBadge(activeBadge.stageKey)}',
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.pool_rounded,
                              color: AqaTheme.accentTeal,
                              size: 26.0,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14.0),
                        // Badge Artwork
                        Container(
                          width: 58.0,
                          height: 58.0,
                          padding: const EdgeInsets.all(6.0),
                          decoration: BoxDecoration(
                            color: AqaTheme.surfaceSecondary,
                            borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                            border: Border.all(color: AqaTheme.primarySky, width: 1.5),
                          ),
                          child: Image.asset(
                            'assets/images/badges/${activeBadge.asset}',
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.workspace_premium_rounded,
                              color: AqaTheme.accentTeal,
                              size: 30.0,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14.0),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                i18n.locale == 'ar'
                                    ? activeBadge.labelAr
                                    : i18n.locale == 'en'
                                        ? activeBadge.labelEn
                                        : activeBadge.label,
                                style: const TextStyle(
                                  color: AqaTheme.textPrimary,
                                  fontSize: 16.0,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 4.0),
                              Text(
                                '${i18n.locale == 'ar' ? 'المعدل العام المباشر' : i18n.locale == 'en' ? 'Live Overall Score' : 'Moyenne Technique'}: ${overallAvg.toStringAsFixed(2)} / 5.00',
                                style: const TextStyle(
                                  color: AqaTheme.accentTeal,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 2.0),
                              Text(
                                _manualBadgeOverride
                                    ? (i18n.locale == 'ar'
                                        ? 'تم التعيين يدوياً بواسطة المدرب'
                                        : i18n.locale == 'en'
                                            ? 'Manually selected by coach'
                                            : 'Attribue manuellement par le coach')
                                    : (i18n.locale == 'ar'
                                        ? 'تحديد تلقائي حسب الكفاءات'
                                        : i18n.locale == 'en'
                                            ? 'Auto-calculated from skills'
                                            : 'Calcule automatiquement'),
                                style: TextStyle(
                                  color: _manualBadgeOverride
                                      ? AqaTheme.statusWarning
                                      : AqaTheme.textLightMuted,
                                  fontSize: 11.0,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (_manualBadgeOverride) ...[
                      const SizedBox(height: 12.0),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          onPressed: () {
                            setState(() {
                              _manualBadgeOverride = false;
                              _selectedBadgeKey = _computedBadge.key;
                            });
                          },
                          icon: const Icon(Icons.auto_mode_rounded, size: 16.0, color: AqaTheme.accentTeal),
                          label: Text(
                            i18n.locale == 'ar'
                                ? 'العودة للترقية التلقائية'
                                : i18n.locale == 'en'
                                    ? 'Reset to auto-calculated badge'
                                    : 'Revenir au calcul automatique',
                            style: const TextStyle(color: AqaTheme.accentTeal, fontSize: 12.0),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16.0),

              // 15 Official Badges Selector Grid
              AqaDoubleBezelCard(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AqaSectionHeader(
                      title: i18n.locale == 'ar'
                          ? 'شارات التقدم الرسمية (15 شارة)'
                          : i18n.locale == 'en'
                              ? 'Official Progression Badges (15 Badges)'
                              : 'Badges Officiels AQA (15 Badges)',
                      subtitle: i18n.locale == 'ar'
                          ? 'المس للتعيين اليدوي لشارة السباح'
                          : i18n.locale == 'en'
                              ? 'Tap to manually assign swimmer rank'
                              : 'Touchez pour attribuer manuellement un rang',
                    ),
                    const SizedBox(height: 12.0),
                    SizedBox(
                      height: 104.0,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _officialBadges.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8.0),
                        itemBuilder: (ctx, idx) {
                          final badge = _officialBadges[idx];
                          final isSelected = activeBadge.key == badge.key;
                          final badgeName = i18n.locale == 'ar'
                              ? badge.labelAr
                              : i18n.locale == 'en'
                                  ? badge.labelEn
                                  : badge.label;

                          return InkWell(
                            onTap: () {
                              setState(() {
                                _manualBadgeOverride = true;
                                _selectedBadgeKey = badge.key;
                              });
                            },
                            borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                            child: Container(
                              width: 86.0,
                              padding: const EdgeInsets.all(8.0),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AqaTheme.primarySky.withValues(alpha: 0.22)
                                    : AqaTheme.surfaceSecondary,
                                borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                                border: Border.all(
                                  color: isSelected ? AqaTheme.accentTeal : AqaTheme.borderSubtle,
                                  width: isSelected ? 2.0 : 1.0,
                                ),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  SizedBox(
                                    width: 42.0,
                                    height: 42.0,
                                    child: Image.asset(
                                      'assets/images/badges/${badge.asset}',
                                      fit: BoxFit.contain,
                                      errorBuilder: (_, __, ___) => const Icon(
                                        Icons.workspace_premium,
                                        color: AqaTheme.accentTeal,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 6.0),
                                  Text(
                                    badgeName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: isSelected ? AqaTheme.accentTeal : AqaTheme.textPrimary,
                                      fontSize: 10.5,
                                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 2.0),
                                  Text(
                                    '>= ${badge.minScore.toStringAsFixed(1)}',
                                    style: const TextStyle(
                                      color: AqaTheme.textLightMuted,
                                      fontSize: 9.5,
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

              // 5 Biomechanical Domains x 4 Skills (20 Skills)
              ..._domains.map((domain) {
                final domainTitle = i18n.locale == 'ar'
                    ? domain.labelAr
                    : i18n.locale == 'en'
                        ? domain.labelEn
                        : domain.labelFr;

                // Calculate domain average
                final domainSkills = domain.skills.map((s) => _skillScores[s.key] ?? 2).toList();
                final domainAvg = domainSkills.fold(0, (acc, s) => acc + s) / domainSkills.length;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 16.0),
                  child: AqaDoubleBezelCard(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                domainTitle,
                                style: const TextStyle(
                                  color: AqaTheme.textPrimary,
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
                              decoration: BoxDecoration(
                                color: AqaTheme.primarySky.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                                border: Border.all(color: AqaTheme.primarySky.withValues(alpha: 0.4)),
                              ),
                              child: Text(
                                '${domainAvg.toStringAsFixed(1)} / 5.0',
                                style: const TextStyle(
                                  color: AqaTheme.accentTeal,
                                  fontSize: 12.0,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14.0),
                        ...domain.skills.map((skill) {
                          final skillLabel = i18n.locale == 'ar'
                              ? skill.labelAr
                              : i18n.locale == 'en'
                                  ? skill.labelEn
                                  : skill.labelFr;
                          final currentVal = _skillScores[skill.key] ?? 2;

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
                                        skillLabel,
                                        style: const TextStyle(
                                          color: AqaTheme.textPrimary,
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      '$currentVal / 5',
                                      style: const TextStyle(
                                        color: AqaTheme.accentTeal,
                                        fontSize: 12.0,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6.0),
                                Row(
                                  children: List.generate(5, (i) {
                                    final val = i + 1;
                                    final isSelected = currentVal == val;
                                    return Expanded(
                                      child: Padding(
                                        padding: EdgeInsets.only(right: i < 4 ? 6.0 : 0.0),
                                        child: InkWell(
                                          onTap: () {
                                            setState(() {
                                              _skillScores[skill.key] = val;
                                            });
                                          },
                                          borderRadius: BorderRadius.circular(8.0),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(vertical: 8.0),
                                            decoration: BoxDecoration(
                                              color: isSelected
                                                  ? AqaTheme.primarySky.withValues(alpha: 0.25)
                                                  : AqaTheme.surfaceSecondary,
                                              borderRadius: BorderRadius.circular(8.0),
                                              border: Border.all(
                                                color: isSelected
                                                    ? AqaTheme.accentTeal
                                                    : AqaTheme.borderSubtle,
                                                width: isSelected ? 1.6 : 1.0,
                                              ),
                                            ),
                                            child: Center(
                                              child: Text(
                                                '$val',
                                                style: TextStyle(
                                                  color: isSelected
                                                      ? AqaTheme.accentTeal
                                                      : AqaTheme.textMuted,
                                                  fontSize: 13.0,
                                                  fontWeight: isSelected
                                                      ? FontWeight.w800
                                                      : FontWeight.w500,
                                                ),
                                              ),
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
                );
              }),

              // Chrono & Distance Metrics Card
              AqaDoubleBezelCard(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AqaSectionHeader(
                      title: i18n.locale == 'ar'
                          ? 'الأزمنة والمسافات (اختياري)'
                          : i18n.locale == 'en'
                              ? 'Sprint Chronos & Distance (Optional)'
                              : 'Chronometrage & Distance (Optionnel)',
                      subtitle: i18n.locale == 'ar'
                          ? 'تسجيل الأداء التنافسي والتحمل'
                          : i18n.locale == 'en'
                              ? 'Record timed splits and max swim distance'
                              : 'Enregistrez les performances chronometriques',
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
                              hintText: 'ex: 21.5',
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
                              hintText: 'ex: 46.2',
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
                              hintText: 'ex: 300',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12.0),
                    TextField(
                      controller: _recommendedLevelController,
                      style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                      decoration: InputDecoration(
                        labelText: i18n.locale == 'ar'
                            ? 'المستوى أو الفوج المقترح'
                            : i18n.locale == 'en'
                                ? 'Recommended Level / Group'
                                : 'Niveau ou Groupe Recommande',
                        hintText: 'ex: AQA Dauphins Perfectionnement',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16.0),

              // Qualitative Feedback
              AqaDoubleBezelCard(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AqaSectionHeader(
                      title: i18n.locale == 'ar'
                          ? 'ملاحظات وتوجيهات المدرب'
                          : i18n.locale == 'en'
                              ? 'Coach Pedagogical Assessment'
                              : 'Bilan Pedagogique du Coach',
                    ),
                    const SizedBox(height: 12.0),
                    TextField(
                      controller: _strengthsController,
                      maxLines: 2,
                      style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                      decoration: InputDecoration(
                        labelText: i18n.locale == 'ar'
                            ? 'نقاط القوة الملاحظة'
                            : i18n.locale == 'en'
                                ? 'Observed Strengths'
                                : 'Points forts observes',
                        hintText: i18n.locale == 'ar'
                            ? 'مثال: وضعية هيدروديناميكية ممتازة وثبات في ضربات الأرجل...'
                            : 'Ex: Excellente position hydrodynamique et battements reguliers...',
                      ),
                    ),
                    const SizedBox(height: 12.0),
                    TextField(
                      controller: _improvementsController,
                      maxLines: 2,
                      style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                      decoration: InputDecoration(
                        labelText: i18n.locale == 'ar'
                            ? 'محاور التحسين والتطوير'
                            : i18n.locale == 'en'
                                ? 'Areas for Improvement'
                                : 'Axes d\'amelioration',
                        hintText: i18n.locale == 'ar'
                            ? 'مثال: التنفس الثنائي في السباحة الحرة وضبط مسار الذراعين...'
                            : 'Ex: Respiration bilaterale en crawl et reprise de nage...',
                      ),
                    ),
                    const SizedBox(height: 12.0),
                    TextField(
                      controller: _goalsController,
                      maxLines: 2,
                      style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                      decoration: InputDecoration(
                        labelText: i18n.locale == 'ar'
                            ? 'أهداف المرحلة القادمة'
                            : i18n.locale == 'en'
                                ? 'Next Stage Goals'
                                : 'Objectifs pour le prochain palier',
                        hintText: i18n.locale == 'ar'
                            ? 'مثال: إتقان 50م حرة مستمرة بدون توقف للشارة القادمة...'
                            : 'Ex: Valider 50m crawl continu pour le badge suivant...',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24.0),

              // Island CTA Save Button
              AqaIslandButton(
                label: i18n.locale == 'ar'
                    ? 'حفظ التقييم وتثبيت الشارة'
                    : i18n.locale == 'en'
                        ? 'Save Review & Award Badge'
                        : 'Enregistrer l\'Evaluation & Valider le Badge',
                icon: Icons.workspace_premium_rounded,
                isLoading: _isSubmitting,
                onPressed: _isSubmitting ? null : _submit,
              ),
              const SizedBox(height: 32.0),
            ],
          ),
        ),
      ),
    );
  }
}
