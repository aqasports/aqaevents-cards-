import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/auth/auth_state.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/theme/aqa_theme.dart';

class ProfileView extends ConsumerWidget {
  const ProfileView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final i18n = ref.watch(i18nProvider);

    final isHead = user?.isHeadCoach == true;
    final isAssistant = user?.isAssistant == true;
    final roleColor = isHead
        ? AqaTheme.statusWarning
        : isAssistant
            ? AqaTheme.textMuted
            : AqaTheme.primarySkyHover;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 108.0),
      children: [
        // Executive Coach Dossier Card
        AqaDoubleBezelCard(
          glowing: true,
          padding: const EdgeInsets.all(20.0),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16.0),
                child: Container(
                  width: 64.0,
                  height: 64.0,
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(16.0),
                    border: Border.all(
                      color: roleColor.withValues(alpha: 0.45),
                      width: 1.2,
                    ),
                  ),
                  child: Image.asset(
                    'assets/images/coach_logo.png',
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Center(
                      child: Text(
                        (user?.name.isNotEmpty ?? false)
                            ? user!.name.substring(0, 1).toUpperCase()
                            : 'C',
                        style: TextStyle(
                          color: roleColor,
                          fontSize: 24.0,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16.0),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            user?.name ?? 'Coach AQA',
                            style: const TextStyle(
                              color: AqaTheme.textPrimary,
                              fontSize: 17.0,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.3,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8.0),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8.0,
                            vertical: 2.5,
                          ),
                          decoration: BoxDecoration(
                            color: roleColor.withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(6.0),
                            border: Border.all(
                              color: roleColor.withValues(alpha: 0.40),
                            ),
                          ),
                          child: Text(
                            user?.roleDisplay.toUpperCase() ?? 'COACH',
                            style: TextStyle(
                              color: roleColor,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4.0),
                    Text(
                      user?.email ?? '',
                      style: const TextStyle(
                        color: AqaTheme.textMuted,
                        fontSize: 12.5,
                      ),
                    ),
                    const SizedBox(height: 6.0),
                    Row(
                      children: [
                        const AqaPulseIndicator(
                          color: AqaTheme.statusSuccess,
                          size: 6.0,
                        ),
                        const SizedBox(width: 6.0),
                        Text(
                          i18n.t('profile.connected'),
                          style: const TextStyle(
                            color: AqaTheme.textSecondary,
                            fontSize: 11.0,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14.0),

        // Language Selection Pill Card
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      i18n.t('common.language'),
                      style: const TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 14.0,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2.0),
                    Text(
                      i18n.locale == 'ar'
                          ? 'تغيير لغة التطبيق'
                          : i18n.locale == 'en'
                              ? 'Change application language'
                              : 'Changer la langue de l\'application',
                      style: const TextStyle(
                        color: AqaTheme.textMuted,
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
              const LanguageSwitcherPill(compact: false),
            ],
          ),
        ),
        const SizedBox(height: 14.0),

        // Permissions Card
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AqaSectionHeader(
                title: i18n.locale == 'ar'
                    ? 'صلاحيات ونطاق الحساب'
                    : i18n.locale == 'en'
                        ? 'Permissions & Scope'
                        : 'Droits & Perimetre d\'Acces',
              ),
              const SizedBox(height: 8.0),
              Text(
                isHead
                    ? (i18n.locale == 'ar'
                        ? 'Head Coach: إشراف عام على كافة القطاعات (أطفال، كبار، سيدات، كتم النفس)، إدارة الاستخلافات، سجلات الحضور، التقييم الفني وتثبيت الشارات.'
                        : 'Head Coach: Supervision de tous les secteurs (Enfants, Adultes Homme/Femme, Apnee), gestion des remplacements, feuilles de presence, evaluations techniques et attribution des badges.')
                    : isAssistant
                        ? (i18n.locale == 'ar'
                            ? 'Assistant Coach: اطلاع في وضع القراءة فقط على الأفواج المعينة ومتابعة بطاقات السباحين.'
                            : 'Assistant Coach: Acces en lecture seule aux groupes assignes, consultation des effectifs et fiches techniques nageurs.')
                        : (i18n.locale == 'ar'
                            ? 'Coach Titulaire: وصول كامل إلى أفواجك وحصص الاستخلاف (تسجيل الحضور، تقييم الحصص، والمتابعة الفنية).'
                            : 'Coach Titulaire: Acces complet a vos groupes et seances en remplacement (appel, logger 3 etapes, notation seance et suivi d\'evolution).'),
                style: const TextStyle(
                  color: AqaTheme.textMuted,
                  fontSize: 12.0,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14.0),

        // Details List
        AqaDoubleBezelCard(
          padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 8.0),
          child: Column(
            children: [
              _buildInfoTile(
                i18n.locale == 'ar' ? 'معرف المدرب' : 'Identifiant Coach',
                user?.coachId ?? 'N/A',
                Icons.badge_outlined,
              ),
              const Divider(),
              _buildInfoTile(
                i18n.locale == 'ar' ? 'الهاتف' : 'Telephone',
                user?.phone ??
                    (i18n.locale == 'ar' ? 'غير مسجل' : 'Non renseigne'),
                Icons.phone_outlined,
              ),
              const Divider(),
              _buildInfoTile(
                i18n.locale == 'ar' ? 'المسبح الرئيسي' : 'Bassin Principal',
                user?.primaryPool ??
                    (i18n.locale == 'ar'
                        ? 'كافة مسابح AQA'
                        : 'Tous les bassins AQA'),
                Icons.water_outlined,
              ),
              const Divider(),
              _buildInfoTile(
                i18n.locale == 'ar' ? 'التخصصات' : 'Specialites',
                user?.specialties.isNotEmpty == true
                    ? user!.specialties.join(', ')
                    : 'Enseignement & Entrainement AQA Swim',
                Icons.sports_outlined,
              ),
              const Divider(),
              _buildInfoTile(
                i18n.locale == 'ar' ? 'خادم AQA السحابي' : 'Serveur Cloud AQA',
                ApiEndpoints.baseUrl,
                Icons.cloud_outlined,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20.0),

        // Logout Button
        AqaIslandButton(
          label: i18n.t('auth.logout'),
          icon: Icons.logout_rounded,
          danger: true,
          onPressed: () {
            showDialog(
              context: context,
              builder: (ctx) => AlertDialog(
                backgroundColor: AqaTheme.surfaceDark,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16.0),
                  side: const BorderSide(color: AqaTheme.borderMedium),
                ),
                title: Text(
                  i18n.t('auth.logout'),
                  style: const TextStyle(color: AqaTheme.textPrimary),
                ),
                content: Text(
                  i18n.locale == 'ar'
                      ? 'هل أنت متأكد من تسجيل الخروج من تطبيق AQA Coaches؟'
                      : i18n.locale == 'en'
                          ? 'Are you sure you want to log out of AQA Coaches?'
                          : 'Voulez-vous vraiment vous deconnecter de l\'application AQA Coaches?',
                  style: const TextStyle(color: AqaTheme.textMuted),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: Text(
                      i18n.t('common.cancel'),
                      style: const TextStyle(color: AqaTheme.textMuted),
                    ),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AqaTheme.statusDanger,
                    ),
                    onPressed: () {
                      Navigator.pop(ctx);
                      ref.read(authStateProvider.notifier).logout();
                    },
                    child: Text(i18n.t('auth.logout')),
                  ),
                ],
              ),
            );
          },
        ),
        const SizedBox(height: 20.0),

        const Center(
          child: Text(
            'AQA Swim Coaches Pro • v2.4.0 Production',
            style: TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.0),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoTile(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
      child: Row(
        children: [
          Container(
            width: 30.0,
            height: 30.0,
            decoration: BoxDecoration(
              color: AqaTheme.surfaceRecessed,
              borderRadius: BorderRadius.circular(8.0),
            ),
            child: Icon(icon, color: AqaTheme.textMuted, size: 16.0),
          ),
          const SizedBox(width: 12.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: AqaTheme.textLightMuted,
                    fontSize: 10.5,
                  ),
                ),
                const SizedBox(height: 1.5),
                Text(
                  value,
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 13.0,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
