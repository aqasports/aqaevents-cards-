import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/theme/aqa_theme.dart';

class TeachingSupportView extends ConsumerWidget {
  const TeachingSupportView({super.key});

  static const List<Map<String, String>> _mascots = [
    {
      'stage': 'Palier 1 - Elephant',
      'stageEn': 'Stage 1 - Elephant',
      'stageAr': 'المرحلة 1 - الفيل',
      'asset': 'elephant.png',
      'sub': 'Immersion & Respiration (Adaptation Aquatique)',
      'subEn': 'Immersion & Breathing (Aquatic Adaptation)',
      'subAr': 'التأقلم مع المحيط المائي وغمر الوجه والزفير',
    },
    {
      'stage': 'Palier 2 - Crocodile',
      'stageEn': 'Stage 2 - Crocodile',
      'stageAr': 'المرحلة 2 - التمساح',
      'asset': 'Crocodile.png',
      'sub': 'Flottaison & Glisse Ventrale/Dorsale',
      'subEn': 'Buoyancy & Streamline Glide',
      'subAr': 'الطفو البطني والظهري والانزلاق الانسيابي',
    },
    {
      'stage': 'Palier 3 - Dauphin',
      'stageEn': 'Stage 3 - Dolphin',
      'stageAr': 'المرحلة 3 - الدلفين',
      'asset': 'Dauphin.png',
      'sub': 'Coordination & Les 4 Nages',
      'subEn': 'Coordination & 4 Strokes',
      'subAr': 'التناسق الحركي والسباحات الأربع',
    },
    {
      'stage': 'Palier 4 - Requin',
      'stageEn': 'Stage 4 - Shark',
      'stageAr': 'المرحلة 4 - القرش',
      'asset': 'requin.png',
      'sub': 'Maitrise Technique, Vitesse & Endurance',
      'subEn': 'Mastery, Speed & Endurance',
      'subAr': 'الإتقان التقني والسرعة والتحمل العالي',
    },
  ];

  static const List<Map<String, String>> _badges = [
    {
      'title': 'Starter',
      'titleAr': 'المبتدئ الأول',
      'asset': 'starter.png',
      'desc': 'Premiere immersion et adaptation confiante au milieu aquatique.',
      'descAr': 'الدخول الأول والتأقلم الأولي بثقة داخل المسبح.',
    },
    {
      'title': 'Beginner',
      'titleAr': 'مبتدئ مائي',
      'asset': 'beginner.png',
      'desc': 'Immersion complete du visage et expiration subaquatique active.',
      'descAr': 'غمر الوجه بالكامل والزفير النشط تحت الماء.',
    },
    {
      'title': 'Floater',
      'titleAr': 'الطفو المتوازن',
      'asset': 'floater.png',
      'desc': 'Autonomie en flottaison ventrale et dorsale (etoile 10s).',
      'descAr': 'الطفو البطني والظهري المستقل لمدة 10 ثوان.',
    },
    {
      'title': 'Leaf Glider',
      'titleAr': 'الانزلاق الانسيابي',
      'asset': 'leaf.png',
      'desc': 'Coulee ventrale et dorsale profilee avec poussee murale.',
      'descAr': 'الانزلاق البطني والظهري الانسيابي مع الدفع من الحائط.',
    },
    {
      'title': 'Dolphin',
      'titleAr': 'الدلفين',
      'asset': 'dolphin.png',
      'desc': 'Glisse hydrodynamique, battements continus et ondulations.',
      'descAr': 'انزلاق هيدروديناميكي، ضربات أرجل مستمرة وتموجات.',
    },
    {
      'title': 'Crawler',
      'titleAr': 'سباح الكراول',
      'asset': 'crawler.png',
      'desc': 'Coordination complete du crawl sur 25m avec respiration laterale.',
      'descAr': 'تناسق كامل للسباحة الحرة لمسافة 25م مع تنفس جانبي.',
    },
    {
      'title': 'Brasseur',
      'titleAr': 'سباح الصدر',
      'asset': 'brasseur.png',
      'desc': 'Maitrise du ciseau symetrique et synchronisation de brasse.',
      'descAr': 'إتقان ضربة الصدر المتماثلة والتوقيت الحركي.',
    },
    {
      'title': 'Butterfly',
      'titleAr': 'سباح الفراشة',
      'asset': 'butterfly.png',
      'desc': 'Propulsion papillon fluide (2 ondulations par cycle de bras).',
      'descAr': 'سباحة الفراشة المتناسقة (ضربتان لكل دورة ذراعين).',
    },
    {
      'title': 'Shark',
      'titleAr': 'القرش',
      'asset': 'shark.png',
      'desc': 'Maitrise de 3 nages codifiees sur 50m avec depart plonge.',
      'descAr': 'إتقان 3 سباحات قانونية لمسافة 50م مع انطلاقة الغطس.',
    },
    {
      'title': 'Orca',
      'titleAr': 'الأوركا',
      'asset': 'orca.png',
      'desc': 'Enchainement 100m 4 nages avec virages reglementaires.',
      'descAr': 'إتمام 100م متنوعة فردي متواصلة مع التحولات القانونية.',
    },
    {
      'title': 'Whale Endurance',
      'titleAr': 'تحمل الحوت',
      'asset': 'whale.png',
      'desc': 'Endurance aerobie continue de 200m a 400m avec amplitude stable.',
      'descAr': 'تحمل هوائي متواصل لمسافة 200م إلى 400م.',
    },
    {
      'title': 'Kraken Power',
      'titleAr': 'قوة الكراكن',
      'asset': 'kraken.png',
      'desc': 'Puissance explosive, coulee 12m+ et sprint 25m haute vitesse.',
      'descAr': 'قوة دفع عالية، انزلاق 12م+ وسرعة قصوى في 25م.',
    },
    {
      'title': 'Mosasaurus Elite',
      'titleAr': 'نخبة الموزاصور',
      'asset': 'mosasaurus.png',
      'desc': 'Perfectionnement elite 4 nages et virages culbutes rapides.',
      'descAr': 'إتقان النخبة للسباحات الأربع والدوران السريع.',
    },
    {
      'title': 'Tsunami Master',
      'titleAr': 'سيد التسونامي',
      'asset': 'tsunami.png',
      'desc': 'Excellence tactique en course et vitesse sous-marine superieure.',
      'descAr': 'التميز التكتيكي في السباقات والسرعة تحت الماء.',
    },
    {
      'title': 'Full Swimmer',
      'titleAr': 'السباح الكامل AQA Pro',
      'asset': 'full_swimmer.png',
      'desc': 'Maitrise integrale des 4 nages et excellence technique AQA Sports.',
      'descAr': 'الإتقان الشامل للسباحات الأربع والتميز العالي AQA.',
    },
  ];

  static const List<Map<String, dynamic>> _curriculumModules = [
    {
      'title': 'Pedagogie Enfants (Elephant • Crocodile • Dauphin • Requin)',
      'titleAr': 'بيداغوجيا الأطفال (الفيل • التمساح • الدلفين • القرش)',
      'subtitle': 'Progression ludique et securite aquatique (4 a 14 ans)',
      'subtitleAr': 'تطور ترفيهي وأمان مائي من 4 إلى 14 سنة',
      'items': [
        'Protocole d\'adaptation sans brassards des la 1ere seance',
        'Jeux d\'immersion, anneaux subaquatiques et parcours flottants',
        'Apprentissage progressif du retournement de securite dorsal',
      ],
      'itemsAr': [
        'بروتوكول التأقلم بدون طوافات منذ الحصة الأولى',
        'ألعاب الغطس والحلقات المائية والمسارات العائمة',
        'التعلم التدريجي لتقنية الانقلاب الأمني على الظهر',
      ],
    },
    {
      'title': 'Programme Adultes (Formules G10 & MAX5)',
      'titleAr': 'برنامج الكبار (فئات G10 و MAX5)',
      'subtitle': 'Apprentissage, aquaphobie et perfectionnement 4 nages',
      'subtitleAr': 'تعلم، علاج الخوف من الماء وتطوير السباحات الأربع',
      'items': [
        'Gestion de la respiration aquatique et relachement cervical',
        'Educatifs de prise d\'appui (catch) et horizontalite du corps',
        'Series fractionnees d\'endurance adaptees aux groupes Hommes & Femmes',
      ],
      'itemsAr': [
        'التحكم في التنفس المائي واسترخاء عضلات الرقبة',
        'تمارين مسك الماء واستقامة وضعية الجسم الأفقية',
        'سلاسل تدريبية لتحمل السباحة مخصصة لمجموعات الرجال والسيدات',
      ],
    },
    {
      'title': 'Protocole Apnee & Securite Binome',
      'titleAr': 'بروتوكول كتم النفس والسلامة الثنائية',
      'subtitle': 'Ventilation, apnee statique/dynamique et sauvetage',
      'subtitleAr': 'التنفس، حبس النفس الساكن/الديناميكي والإنقاذ',
      'items': [
        'Relaxation pre-apnee et interdiction stricte d\'hyperventilation',
        'Surveillance binome permanente en surface et signes de validation',
        'Technique de canard vertical et compensation Frenzel',
      ],
      'itemsAr': [
        'الاسترخاء قبل كتم النفس والمنع الصارم لفرط التنفس',
        'المراقبة الثنائية المستمرة على السطح وإشارات الأمان',
        'تقنية الغطس العمودي ومعادلة الضغط',
      ],
    },
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final i18n = ref.watch(i18nProvider);

    return AqaAmbientBackground(
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        children: [
          // Hero Banner
          AqaDoubleBezelCard(
            glowEffect: true,
            padding: const EdgeInsets.all(18.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                      decoration: BoxDecoration(
                        color: AqaTheme.accentTeal.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                        border: Border.all(color: AqaTheme.accentTeal),
                      ),
                      child: const Text(
                        'AQA TEACHING SUPPORT',
                        style: TextStyle(
                          color: AqaTheme.accentTeal,
                          fontSize: 10.0,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.0,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                      decoration: BoxDecoration(
                        color: AqaTheme.statusWarningBg,
                        borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                        border: Border.all(color: AqaTheme.statusWarning.withValues(alpha: 0.5)),
                      ),
                      child: Text(
                        i18n.locale == 'ar' ? 'المرحلة 2 • قيد التطوير' : 'PHASE 2 • DEV LATER',
                        style: const TextStyle(
                          color: AqaTheme.statusWarning,
                          fontSize: 10.0,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14.0),
                Text(
                  i18n.locale == 'ar'
                      ? 'الدليل البيداغوجي ونظام شارات AQA Swim'
                      : i18n.locale == 'en'
                          ? 'AQA Swim Pedagogical Framework & Badges'
                          : 'Referentiel Pedagogique & Badges AQA Swim',
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 17.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6.0),
                Text(
                  i18n.locale == 'ar'
                      ? 'الدعم الفني الموحد لمدربي AQA: المراحل الأربعة، 15 شارة تقييم رسمية، ومعايير التقييم على حافة الحوض.'
                      : i18n.locale == 'en'
                          ? 'Unified technical guidelines for AQA coaches: 4 Mascot Stages, 15 progression badges, and poolside criteria.'
                          : 'Support technique unifie pour les coachs AQA : 4 Paliers Mascottes, 15 badges de progression et criteres bord de bassin.',
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 12.5,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18.0),

          // 4 Pedagogical Mascots Showcase
          AqaSectionHeader(
            title: i18n.locale == 'ar'
                ? 'المراحل البيداغوجية الأربع (المascots)'
                : i18n.locale == 'en'
                    ? 'The 4 Pedagogical Mascot Stages'
                    : 'Les 4 Paliers Pedagogiques (Mascottes)',
            subtitle: i18n.locale == 'ar'
                ? 'المسار التدريجي للسباح في أكاديمية AQA'
                : i18n.locale == 'en'
                    ? 'Sequential swimmer advancement roadmap'
                    : 'Feuille de route de progression du nageur',
          ),
          const SizedBox(height: 10.0),
          Row(
            children: _mascots.map((m) {
              final stageName = i18n.locale == 'ar'
                  ? m['stageAr']!
                  : i18n.locale == 'en'
                      ? m['stageEn']!
                      : m['stage']!;

              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4.0),
                  child: AqaDoubleBezelCard(
                    padding: const EdgeInsets.all(10.0),
                    child: Column(
                      children: [
                        SizedBox(
                          width: 44.0,
                          height: 44.0,
                          child: Image.asset(
                            'assets/images/badges/${m['asset']}',
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.pool_rounded,
                              color: AqaTheme.accentTeal,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8.0),
                        Text(
                          stageName,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
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
          const SizedBox(height: 20.0),

          // 15 Official AQA Progression Badges Showcase
          AqaSectionHeader(
            title: i18n.locale == 'ar'
                ? 'شارات التقدم الرسمية الـ 15 (مقياس 1.0 إلى 5.0)'
                : i18n.locale == 'en'
                    ? '15 Official AQA Progression Badges (1.0 to 5.0 Scale)'
                    : '15 Badges Officiels de Progression AQA (Echelle 1.0 a 5.0)',
            subtitle: i18n.locale == 'ar'
                ? 'معايير الانتقال من مبتدئ إلى سباح متكامل'
                : i18n.locale == 'en'
                    ? 'Mastery progression criteria from Starter to Full Swimmer'
                    : 'Criteres d\'evaluation du Starter au Full Swimmer',
          ),
          const SizedBox(height: 12.0),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _badges.length,
            itemBuilder: (context, index) {
              final b = _badges[index];
              final title = i18n.locale == 'ar' ? b['titleAr']! : b['title']!;
              final desc = i18n.locale == 'ar' ? b['descAr']! : b['desc']!;

              return Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: AqaDoubleBezelCard(
                  padding: const EdgeInsets.all(12.0),
                  child: Row(
                    children: [
                      Container(
                        width: 44.0,
                        height: 44.0,
                        padding: const EdgeInsets.all(4.0),
                        decoration: BoxDecoration(
                          color: AqaTheme.surfaceSecondary,
                          borderRadius: BorderRadius.circular(10.0),
                          border: Border.all(color: AqaTheme.accentTeal.withValues(alpha: 0.3)),
                        ),
                        child: Image.asset(
                          'assets/images/badges/${b['asset']}',
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.workspace_premium_rounded,
                            color: AqaTheme.accentTeal,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: const TextStyle(
                                color: AqaTheme.textPrimary,
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 2.0),
                            Text(
                              desc,
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
                ),
              );
            },
          ),
          const SizedBox(height: 20.0),

          // Curriculum Modules
          AqaSectionHeader(
            title: i18n.locale == 'ar'
                ? 'المناهج التدريبية وبروتوكولات السلامة'
                : i18n.locale == 'en'
                    ? 'Training Curricula & Safety Protocols'
                    : 'Programmes Pedagogiques & Securite Bassin',
          ),
          const SizedBox(height: 12.0),
          ..._curriculumModules.map((mod) {
            final title = i18n.locale == 'ar' ? mod['titleAr'] as String : mod['title'] as String;
            final subtitle = i18n.locale == 'ar' ? mod['subtitleAr'] as String : mod['subtitle'] as String;
            final items = (i18n.locale == 'ar' ? mod['itemsAr'] : mod['items']) as List<dynamic>;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: AqaDoubleBezelCard(
                padding: const EdgeInsets.all(14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 14.0,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2.0),
                    Text(
                      subtitle,
                      style: const TextStyle(color: AqaTheme.accentTeal, fontSize: 11.5),
                    ),
                    const SizedBox(height: 10.0),
                    ...items.map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 4.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('• ', style: TextStyle(color: AqaTheme.accentTeal)),
                            Expanded(
                              child: Text(
                                item as String,
                                style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
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
          }),
          const SizedBox(height: 24.0),
        ],
      ),
    );
  }
}
