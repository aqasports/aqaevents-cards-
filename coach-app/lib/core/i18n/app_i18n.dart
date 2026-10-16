import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// i18next-compatible localization service for AQA Coaches Pro.
/// Supports 'fr', 'en', and 'ar' (RTL) with '{{variable}}' interpolation
/// and strictly enforces Western Arabic numerals (0-9) in all locales.
class AppI18n {
  final String language;

  const AppI18n(this.language);

  String get locale => language;
  bool get isRtl => language == 'ar';
  TextDirection get textDirection => isRtl ? TextDirection.rtl : TextDirection.ltr;

  String t(String key, [Map<String, dynamic>? options]) {
    final langMap = _resources[language] ?? _resources['fr']!;
    String raw = langMap[key] ?? _resources['fr']?[key] ?? _resources['en']?[key] ?? key;

    if (options != null && options.isNotEmpty) {
      options.forEach((k, v) {
        raw = raw.replaceAll('{{$k}}', _normalizeWesternDigits(v.toString()));
      });
    }
    return _normalizeWesternDigits(raw);
  }

  static String _normalizeWesternDigits(String input) {
    const eastern = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    var out = input;
    for (var i = 0; i < 10; i++) {
      out = out.replaceAll(eastern[i], '$i').replaceAll(persian[i], '$i');
    }
    return out;
  }

  static const Map<String, Map<String, String>> _resources = {
    'fr': {
      // Common
      'common.retry': 'Reessayer',
      'common.cancel': 'Annuler',
      'common.save': 'Enregistrer',
      'common.confirm': 'Confirmer',
      'common.close': 'Fermer',
      'common.search': 'Rechercher...',
      'common.loading': 'Chargement...',
      'common.sync_now': 'Synchroniser les donnees',
      'common.synced': 'Synchronise avec AQA Swim Cloud',
      'common.offline_queued': 'Sauvegarde hors-ligne (synchronisation auto)',
      'common.view_only': 'Mode Assistant : Lecture seule',
      'common.all_sectors': 'TOUS LES SECTEURS',

      // Navigation
      'nav.planning': 'Planning',
      'nav.groups': 'Groupes',
      'nav.suivi': 'Suivi Tech',
      'nav.replacements': 'Remplacements',
      'nav.support': 'Support AQA',
      'nav.profile': 'Profil',

      // Auth / Login
      'auth.brand_badge': 'COACHES PRO • AQA SWIM',
      'auth.hero_title': 'Commandement Bord de Bassin & Suivi Technique',
      'auth.hero_subtitle':
          'Appel binaire instantane (Present / Absent), suivi d\'evolution 15 badges AQA, notation des seances et gestion des remplacements.',
      'auth.email_label': 'Email Professionnel',
      'auth.password_label': 'Mot de Passe',
      'auth.sign_in_btn': 'Acceder au Portail Coach',
      'auth.signing_in': 'Connexion en cours...',
      'auth.quick_roles_title': 'ACCES RAPIDE PAR ROLE (PRODUCTION & DEMO)',
      'auth.role_head_coach': 'Head Coach',
      'auth.role_head_sub': 'Supervision Globale',
      'auth.role_coach': 'Coach',
      'auth.role_coach_sub': 'Ses Groupes',
      'auth.role_assistant': 'Assistant',
      'auth.role_assistant_sub': 'Lecture Seule',
      'auth.server_label': 'Serveur Cloud : {{url}}',

      // Sessions & Planning
      'sessions.kpi_sessions': 'Seances du Jour',
      'sessions.kpi_swimmers': 'Nageurs Attendus',
      'sessions.kpi_completed': 'Cloturees',
      'sessions.reminder_10m': 'Fin de seance dans {{min}} min — Loggez les infos',
      'sessions.reminder_ended': 'Seance terminee il y a {{min}} min — Cloture rapide',
      'sessions.reminder_ongoing': 'Seance en cours (fin dans {{min}} min)',
      'sessions.reminder_default': 'Logger Rapide 3 Etapes (Rappel 10 min avant fin)',
      'sessions.log_3_steps': 'Logger 3 Etapes',
      'sessions.sheet_btn': 'Presence',
      'sessions.view_btn': 'Consulter',
      'sessions.status_completed': 'CLOTUREE',
      'sessions.status_scheduled': 'PLANIFIEE',
      'sessions.status_cancelled': 'ANNULEE',
      'sessions.empty_day': 'Aucune seance programmee pour cette date',
      'sessions.empty_day_sub': 'Selectionnez un autre jour du calendrier ou tirez pour actualiser.',

      // Attendance (Strictly PRESENT and ABSENT only)
      'attendance.title': 'Appel & Bilan de Seance',
      'attendance.present': 'Present',
      'attendance.absent': 'Absent',
      'attendance.mark_all_present': 'Tout Present',
      'attendance.mark_all_absent': 'Tout Absent',
      'attendance.add_guest': 'Ajouter Invite',
      'attendance.guest_badge': 'INVITE',
      'attendance.save_btn': 'Valider Presences & Note de Seance',
      'attendance.saved_toast': 'Presences (Present/Absent) et note de seance enregistrees.',
      'attendance.rating_title': 'Notation & Bilan de la Seance (1 a 5 Etoiles)',
      'attendance.intensity_label': 'Intensite de la seance',
      'attendance.focus_label': 'Dominante technique',
      'attendance.water_temp': 'Temperature Eau (C)',
      'attendance.summary_label': 'Observations & Bilan du Coach',
      'attendance.step1_title': '1. Presences (Present / Absent)',
      'attendance.step2_title': '2. Evolution & Badges',
      'attendance.step3_title': '3. Note de Seance',

      // Groups
      'groups.search_hint': 'Rechercher un groupe par nom, categorie ou bassin...',
      'groups.count_summary': '{{count}} Groupes • {{swimmers}} Nageurs',
      'groups.detail_title': 'Fiche du Groupe',
      'groups.tab_swimmers': 'Nageurs ({{count}})',
      'groups.tab_sessions': 'Seances ({{count}})',
      'groups.attendance_rate': 'Assiduite : {{rate}}%',

      // Suivi Technique
      'suivi.title': 'Suivi Technique & Evolution AQA',
      'suivi.hub_title': 'Centre de Suivi Technique Nageurs',
      'suivi.hub_subtitle':
          'Analysez la progression technique, les paliers d\'apprentissage, les chronos et attribuez les 15 badges officiels AQA Suivi.',
      'suivi.new_eval_btn': 'Nouvelle Evaluation Technique & Badge',
      'suivi.current_rank': 'RANG ACTUEL',
      'suivi.stage_progress': 'Progression du Palier',
      'suivi.radar_title': 'Profil Biomecanique & Competences (1 a 4)',
      'suivi.badges_title': '15 Badges Officiels AQA Suivi',
      'suivi.mascots_title': 'Filiere Pedagogique (Paliers AQA)',
      'suivi.history_title': 'Historique des Evaluations ({{count}})',
      'suivi.metrics_title': 'Chronos & Performances Aquatiques',

      // Replacements
      'replacements.title': 'Remplacements & Absences',
      'replacements.subtitle': 'Continuite pedagogique des groupes AQA Swim',
      'replacements.declare_btn': 'Declarer Absence',
      'replacements.tab_requests': 'Demandes ({{count}})',
      'replacements.tab_active': 'Couvertures ({{count}})',
      'replacements.tab_absences': 'Absences ({{count}})',
      'replacements.accept': 'Accepter',
      'replacements.decline': 'Refuser',

      // Profile
      'profile.permissions_title': 'Perimetre de Commandement AQA Swim',
      'profile.sign_out': 'Se Deconnecter du Compte',
      'profile.language_label': 'Langue de l\'Interface (i18next)',
    },
    'en': {
      // Common
      'common.retry': 'Retry',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.confirm': 'Confirm',
      'common.close': 'Close',
      'common.search': 'Search...',
      'common.loading': 'Loading...',
      'common.sync_now': 'Sync workspace data',
      'common.synced': 'Synced with AQA Swim Cloud',
      'common.offline_queued': 'Saved offline (auto-sync queued)',
      'common.view_only': 'Assistant Mode: View-only access',
      'common.all_sectors': 'ALL SECTORS',

      // Navigation
      'nav.planning': 'Schedule',
      'nav.groups': 'Groups',
      'nav.suivi': 'Tech Track',
      'nav.replacements': 'Coverage',
      'nav.support': 'AQA Support',
      'nav.profile': 'Profile',

      // Auth / Login
      'auth.brand_badge': 'COACHES PRO • AQA SWIM',
      'auth.hero_title': 'Poolside Command & Technical Tracking',
      'auth.hero_subtitle':
          'Instant binary attendance (Present / Absent), 15-badge AQA swimmer evolution tracking, session ratings, and replacement management.',
      'auth.email_label': 'Professional Email',
      'auth.password_label': 'Password',
      'auth.sign_in_btn': 'Sign In to Coach Portal',
      'auth.signing_in': 'Signing in...',
      'auth.quick_roles_title': 'QUICK ROLE ACCESS (PRODUCTION & DEMO)',
      'auth.role_head_coach': 'Head Coach',
      'auth.role_head_sub': 'All Sectors',
      'auth.role_coach': 'Coach',
      'auth.role_coach_sub': 'Assigned Groups',
      'auth.role_assistant': 'Assistant',
      'auth.role_assistant_sub': 'View Only',
      'auth.server_label': 'Cloud Server: {{url}}',

      // Sessions & Planning
      'sessions.kpi_sessions': 'Sessions Today',
      'sessions.kpi_swimmers': 'Expected Swimmers',
      'sessions.kpi_completed': 'Completed',
      'sessions.reminder_10m': 'Session ends in {{min}} min — Log session data',
      'sessions.reminder_ended': 'Session ended {{min}} min ago — Quick closeout',
      'sessions.reminder_ongoing': 'Session in progress ({{min}} min left)',
      'sessions.reminder_default': '3-Step Quick Logger (10-min pre-end reminder)',
      'sessions.log_3_steps': '3-Step Log',
      'sessions.sheet_btn': 'Attendance',
      'sessions.view_btn': 'Inspect',
      'sessions.status_completed': 'COMPLETED',
      'sessions.status_scheduled': 'SCHEDULED',
      'sessions.status_cancelled': 'CANCELLED',
      'sessions.empty_day': 'No sessions scheduled for this date',
      'sessions.empty_day_sub': 'Select another date from the strip or pull to refresh.',

      // Attendance (Strictly PRESENT and ABSENT only)
      'attendance.title': 'Attendance & Session Review',
      'attendance.present': 'Present',
      'attendance.absent': 'Absent',
      'attendance.mark_all_present': 'All Present',
      'attendance.mark_all_absent': 'All Absent',
      'attendance.add_guest': 'Add Guest',
      'attendance.guest_badge': 'GUEST',
      'attendance.save_btn': 'Save Attendance & Session Rating',
      'attendance.saved_toast': 'Binary attendance (Present/Absent) and session rating saved.',
      'attendance.rating_title': 'Session Rating & Summary (1 to 5 Stars)',
      'attendance.intensity_label': 'Session Intensity',
      'attendance.focus_label': 'Technical Focus',
      'attendance.water_temp': 'Water Temperature (C)',
      'attendance.summary_label': 'Coach Summary & Observations',
      'attendance.step1_title': '1. Attendance (Present / Absent)',
      'attendance.step2_title': '2. Evolution & Badges',
      'attendance.step3_title': '3. Session Rating',

      // Groups
      'groups.search_hint': 'Search groups by name, category, or pool...',
      'groups.count_summary': '{{count}} Groups • {{swimmers}} Swimmers',
      'groups.detail_title': 'Group Roster & Schedule',
      'groups.tab_swimmers': 'Swimmers ({{count}})',
      'groups.tab_sessions': 'Sessions ({{count}})',
      'groups.attendance_rate': 'Attendance: {{rate}}%',

      // Suivi Technique
      'suivi.title': 'Technical Follow-up & AQA Evolution',
      'suivi.hub_title': 'Swimmer Technical Progression Hub',
      'suivi.hub_subtitle':
          'Track stroke biomechanics, curriculum milestones, timed sprints, and award the 15 official AQA Suivi badges.',
      'suivi.new_eval_btn': 'New Technical Evaluation & Badge',
      'suivi.current_rank': 'CURRENT RANK',
      'suivi.stage_progress': 'Stage Mastery',
      'suivi.radar_title': 'Biomechanical & Skill Profile (1 to 4)',
      'suivi.badges_title': '15 Official AQA Suivi Badges',
      'suivi.mascots_title': 'Pedagogical Pathway (AQA Stages)',
      'suivi.history_title': 'Evaluation History ({{count}})',
      'suivi.metrics_title': 'Timed Sprints & Aquatic Metrics',

      // Replacements
      'replacements.title': 'Replacements & Absences',
      'replacements.subtitle': 'Coaching continuity across AQA Swim groups',
      'replacements.declare_btn': 'Declare Absence',
      'replacements.tab_requests': 'Requests ({{count}})',
      'replacements.tab_active': 'Active ({{count}})',
      'replacements.tab_absences': 'Absences ({{count}})',
      'replacements.accept': 'Accept',
      'replacements.decline': 'Decline',

      // Profile
      'profile.permissions_title': 'AQA Swim Command Scope',
      'profile.sign_out': 'Sign Out of Account',
      'profile.language_label': 'Interface Language (i18next)',
    },
    'ar': {
      // Common (Western Arabic numerals 0-9 enforced)
      'common.retry': 'إعادة المحاولة',
      'common.cancel': 'إلغاء',
      'common.save': 'حفظ',
      'common.confirm': 'تأكيد',
      'common.close': 'إغلاق',
      'common.search': 'بحث...',
      'common.loading': 'جاري التحميل...',
      'common.sync_now': 'مزامنة البيانات',
      'common.synced': 'تمت المزامنة مع سحابة AQA Swim',
      'common.offline_queued': 'تم الحفظ دون اتصال (مزامنة تلقائية)',
      'common.view_only': 'وضع المدرب المساعد: قراءة فقط',
      'common.all_sectors': 'جميع الفئات',

      // Navigation
      'nav.planning': 'البرنامج',
      'nav.groups': 'الأفواج',
      'nav.suivi': 'المتابعة التقنية',
      'nav.replacements': 'التعويضات',
      'nav.support': 'دعم AQA',
      'nav.profile': 'حسابي',

      // Auth / Login
      'auth.brand_badge': 'COACHES PRO • AQA SWIM',
      'auth.hero_title': 'منصة المدربين والمتابعة التقنية',
      'auth.hero_subtitle':
          'تسجيل الحضور الفوري (حاضر / غائب)، تتبع التطور عبر 15 شارة رسمية، تقييم الحصص وإدارة التعويضات.',
      'auth.email_label': 'البريد الإلكتروني المهني',
      'auth.password_label': 'كلمة المرور',
      'auth.sign_in_btn': 'الدخول إلى فضاء المدرب',
      'auth.signing_in': 'جاري الاتصال...',
      'auth.quick_roles_title': 'دخول سريع حسب الصلاحية (تجريبي ورسمي)',
      'auth.role_head_coach': 'المدرب الرئيسي',
      'auth.role_head_sub': 'كل الأفواج',
      'auth.role_coach': 'مدرب',
      'auth.role_coach_sub': 'أفواجه فقط',
      'auth.role_assistant': 'مساعد مدرب',
      'auth.role_assistant_sub': 'قراءة فقط',
      'auth.server_label': 'الخادم السحابي : {{url}}',

      // Sessions & Planning
      'sessions.kpi_sessions': 'حصص اليوم',
      'sessions.kpi_swimmers': 'السباحون المسجلون',
      'sessions.kpi_completed': 'مكتملة',
      'sessions.reminder_10m': 'تنتهي الحصة خلال {{min}} د — سجل الحضور والتقييم',
      'sessions.reminder_ended': 'انتهت الحصة منذ {{min}} د — إغلاق سريع',
      'sessions.reminder_ongoing': 'حصة جارية (تنتهي خلال {{min}} د)',
      'sessions.reminder_default': 'التسجيل السريع في 3 خطوات (تنبيه قبل 10 دقائق)',
      'sessions.log_3_steps': 'تسجيل 3 خطوات',
      'sessions.sheet_btn': 'الحضور',
      'sessions.view_btn': 'عرض',
      'sessions.status_completed': 'مكتملة',
      'sessions.status_scheduled': 'مبرمجة',
      'sessions.status_cancelled': 'ملغاة',
      'sessions.empty_day': 'لا توجد حصص مبرمجة في هذا التاريخ',
      'sessions.empty_day_sub': 'اختر يوما آخر من الشريط الزمني أو اسحب للتحديث.',

      // Attendance (Strictly PRESENT and ABSENT only)
      'attendance.title': 'ورقة الحضور وتقييم الحصة',
      'attendance.present': 'حاضر',
      'attendance.absent': 'غائب',
      'attendance.mark_all_present': 'الكل حاضر',
      'attendance.mark_all_absent': 'الكل غائب',
      'attendance.add_guest': 'إضافة ضيف',
      'attendance.guest_badge': 'ضيف',
      'attendance.save_btn': 'حفظ الحضور وتقييم الحصة',
      'attendance.saved_toast': 'تم حفظ الحضور (حاضر/غائب) وتقييم الحصة بنجاح.',
      'attendance.rating_title': 'تقييم الحصة التدريبية (1 إلى 5 نجوم)',
      'attendance.intensity_label': 'شدة الحصة',
      'attendance.focus_label': 'التركيز التقني',
      'attendance.water_temp': 'حرارة الماء (C)',
      'attendance.summary_label': 'ملاحظات وملخص المدرب',
      'attendance.step1_title': '1. الحضور (حاضر / غائب)',
      'attendance.step2_title': '2. التطور والشارات',
      'attendance.step3_title': '3. تقييم الحصة',

      // Groups
      'groups.search_hint': 'ابحث عن فوج بالاسم أو الفئة أو المسبح...',
      'groups.count_summary': '{{count}} أفواج • {{swimmers}} سباح',
      'groups.detail_title': 'بطاقة الفوج والسباحين',
      'groups.tab_swimmers': 'السباحون ({{count}})',
      'groups.tab_sessions': 'الحصص ({{count}})',
      'groups.attendance_rate': 'المواظبة : {{rate}}%',

      // Suivi Technique
      'suivi.title': 'المتابعة التقنية وتطور السباح',
      'suivi.hub_title': 'مركز المتابعة التقنية للسباحين',
      'suivi.hub_subtitle':
          'تتبع المهارات المائية، مراحل التعلم، التوقيت الزمني ومنح شارات AQA Suivi الـ 15 الرسمية.',
      'suivi.new_eval_btn': 'تقييم تقني جديد ومنح شارة',
      'suivi.current_rank': 'المستوى الحالي',
      'suivi.stage_progress': 'تقدم المرحلة',
      'suivi.radar_title': 'مصفوفة المهارات التقنية (1 إلى 4)',
      'suivi.badges_title': 'شارات التدرج الرسمية (15 شارة)',
      'suivi.mascots_title': 'المسار البيداغوجي (مراحل AQA)',
      'suivi.history_title': 'سجل التقييمات ({{count}})',
      'suivi.metrics_title': 'الأزمنة والمسافات المقطوعة',

      // Replacements
      'replacements.title': 'التعويضات والغيابات',
      'replacements.subtitle': 'ضمان استمرارية التأطير البيداغوجي لأفواج AQA',
      'replacements.declare_btn': 'التصريح بغياب',
      'replacements.tab_requests': 'الطلبات ({{count}})',
      'replacements.tab_active': 'التغطيات ({{count}})',
      'replacements.tab_absences': 'غياباتي ({{count}})',
      'replacements.accept': 'قبول',
      'replacements.decline': 'رفض',

      // Profile
      'profile.permissions_title': 'صلاحيات التحكم في نظام AQA Swim',
      'profile.sign_out': 'تسجيل الخروج من الحساب',
      'profile.language_label': 'لغة التطبيق (i18next)',
    },
  };
}

class I18nNotifier extends StateNotifier<AppI18n> {
  static const String _prefKey = 'aqa_coach_i18next_lng';

  I18nNotifier() : super(const AppI18n('fr')) {
    _loadSavedLanguage();
  }

  Future<void> _loadSavedLanguage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved != null && ['fr', 'en', 'ar'].contains(saved)) {
        state = AppI18n(saved);
      }
    } catch (_) {}
  }

  Future<void> changeLanguage(String lng) async {
    if (!['fr', 'en', 'ar'].contains(lng)) return;
    state = AppI18n(lng);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, lng);
    } catch (_) {}
  }
}

final i18nProvider = StateNotifierProvider<I18nNotifier, AppI18n>((ref) {
  return I18nNotifier();
});

/// Sleek Double-Bezel Language Switcher Pill (FR | EN | AR)
class LanguageSwitcherPill extends ConsumerWidget {
  final bool compact;

  const LanguageSwitcherPill({super.key, this.compact = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentLng = ref.watch(i18nProvider).language;
    const langs = [
      {'code': 'fr', 'label': 'FR'},
      {'code': 'en', 'label': 'EN'},
      {'code': 'ar', 'label': 'AR'},
    ];

    return Container(
      padding: const EdgeInsets.all(3.0),
      decoration: BoxDecoration(
        color: const Color(0xFF090F1E),
        borderRadius: BorderRadius.circular(999.0),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: langs.map((item) {
          final code = item['code']!;
          final isSelected = currentLng == code;
          return GestureDetector(
            onTap: () => ref.read(i18nProvider.notifier).changeLanguage(code),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOutCubic,
              padding: EdgeInsets.symmetric(
                horizontal: compact ? 8.0 : 12.0,
                vertical: compact ? 4.0 : 6.0,
              ),
              decoration: BoxDecoration(
                gradient: isSelected
                    ? const LinearGradient(
                        colors: [Color(0xFF0EA5E9), Color(0xFF00F2FF)],
                      )
                    : null,
                borderRadius: BorderRadius.circular(999.0),
              ),
              child: Text(
                item['label']!,
                style: TextStyle(
                  color: isSelected ? const Color(0xFF030712) : const Color(0xFF94A3B8),
                  fontSize: compact ? 10.0 : 11.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
