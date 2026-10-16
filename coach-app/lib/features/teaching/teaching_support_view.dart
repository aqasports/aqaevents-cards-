import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/theme/aqa_theme.dart';

class TeachingSupportView extends ConsumerWidget {
  const TeachingSupportView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final i18n = ref.watch(i18nProvider);

    final title = i18n.locale == 'ar'
        ? 'الدعم البيداغوجي AQA'
        : i18n.locale == 'en'
            ? 'AQA Teaching Support'
            : 'Support Pedagogique AQA';

    final subtitle = i18n.locale == 'ar'
        ? 'الأكاديمية والتأطير الفني'
        : i18n.locale == 'en'
            ? 'Academy & Technical Guidance'
            : 'Academie & Cadrage Technique';

    final noticeTitle = i18n.locale == 'ar'
        ? 'المحتوى قيد الإعداد'
        : i18n.locale == 'en'
            ? 'Content In Preparation'
            : 'Contenu en cours de preparation';

    final noticeBody = i18n.locale == 'ar'
        ? 'المقرر البيداغوجي، جذاذات الحصص ومكتبة التمارين الفنية قيد التطوير والمراجعة من قبل اللجنة التقنية لأكاديمية AQA Swim. ستتاح التمارين والبرامج فور اعتمادها رسمياً.'
        : i18n.locale == 'en'
            ? 'The pedagogical curriculum, drill sheets, and technical exercise library are currently being prepared by the AQA Swim technical committee. They will be published as soon as officially validated.'
            : 'Le cursus pedagogique officiel, les fiches de seance et la bibliotheque d\'exercices techniques sont en cours d\'elaboration par la direction technique AQA Swim. Ils seront disponibles des validation officielle.';

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      body: AqaAmbientBackground(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16.0, 20.0, 16.0, 110.0),
          children: [
            AqaSectionHeader(
              eyebrow: 'AQA PEDAGOGIE',
              title: title,
              subtitle: subtitle,
            ),
            const SizedBox(height: 32.0),
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520.0),
                child: AqaDoubleBezelCard(
                  glowing: true,
                  accentColor: AqaTheme.accentTeal,
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 36.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 72.0,
                        height: 72.0,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AqaTheme.accentTeal.withValues(alpha: 0.12),
                          border: Border.all(color: AqaTheme.borderTeal, width: 1.5),
                          boxShadow: AqaTheme.tealGlow,
                        ),
                        child: const Icon(
                          Icons.auto_stories_outlined,
                          color: AqaTheme.accentTeal,
                          size: 34.0,
                        ),
                      ),
                      const SizedBox(height: 20.0),
                      Text(
                        noticeTitle,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 18.0,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 10.0),
                      Text(
                        noticeBody,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AqaTheme.textMuted,
                          fontSize: 13.5,
                          height: 1.6,
                        ),
                      ),
                      const SizedBox(height: 24.0),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 8.0),
                        decoration: BoxDecoration(
                          color: AqaTheme.surfaceSecondary,
                          borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                          border: Border.all(color: AqaTheme.borderSubtle),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.access_time_rounded,
                              color: AqaTheme.accentTeal,
                              size: 15.0,
                            ),
                            const SizedBox(width: 8.0),
                            Text(
                              i18n.locale == 'ar'
                                  ? 'تحديث قادم قريباً'
                                  : i18n.locale == 'en'
                                      ? 'Release scheduled soon'
                                      : 'Deploiement prochainement',
                              style: const TextStyle(
                                color: AqaTheme.textLightMuted,
                                fontSize: 12.0,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
