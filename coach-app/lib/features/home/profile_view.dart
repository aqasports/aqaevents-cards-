import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/auth/auth_state.dart';
import '../../core/theme/aqa_theme.dart';

class ProfileView extends ConsumerWidget {
  const ProfileView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Profile Hero Card
          Container(
            padding: const EdgeInsets.all(22.0),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF0A243E)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
              border: Border.all(color: AqaTheme.accentTeal.withValues(alpha: 0.3)),
              boxShadow: AqaTheme.cardShadow,
            ),
            child: Column(
              children: [
                SizedBox(
                  height: 36.0,
                  child: Image.asset(
                    'assets/images/aqa_logo_white.png',
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                  ),
                ),
                const SizedBox(height: 16.0),
                CircleAvatar(
                  radius: 36.0,
                  backgroundColor: AqaTheme.surfaceSecondary,
                  child: Text(
                    (user?.name.isNotEmpty ?? false)
                        ? user!.name.substring(0, 1).toUpperCase()
                        : 'C',
                    style: const TextStyle(
                      color: AqaTheme.accentTeal,
                      fontSize: 28.0,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(height: 12.0),
                Text(
                  user?.name ?? 'Coach AQA',
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 18.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4.0),
                Text(
                  user?.email ?? '',
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 13.0,
                  ),
                ),
                const SizedBox(height: 12.0),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 4.0),
                  decoration: BoxDecoration(
                    color: user?.isHeadCoach == true
                        ? AqaTheme.statusWarningBg
                        : user?.isAssistant == true
                            ? AqaTheme.surfaceSecondary
                            : AqaTheme.statusInfoBg,
                    borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                    border: Border.all(
                      color: user?.isHeadCoach == true
                          ? AqaTheme.statusWarning
                          : user?.isAssistant == true
                              ? AqaTheme.borderSubtle
                              : AqaTheme.primarySky,
                    ),
                  ),
                  child: Text(
                    user?.roleDisplay.toUpperCase() ?? 'COACH',
                    style: TextStyle(
                      color: user?.isHeadCoach == true
                          ? AqaTheme.statusWarning
                          : user?.isAssistant == true
                              ? AqaTheme.textMuted
                              : AqaTheme.primarySky,
                      fontSize: 11.0,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16.0),

          // Permissions Card
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
                  'Droits & Perimetre d\'Acces',
                  style: TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 14.0,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8.0),
                Text(
                  user?.isHeadCoach == true
                      ? 'Head Coach: Supervision de tous les secteurs (Enfants, Adultes Homme/Femme, Apnee), gestion des remplacements, feuilles de presence, evaluations techniques et attribution des badges.'
                      : user?.isAssistant == true
                          ? 'Assistant Coach: Acces en lecture seule aux groupes assignes, consultation des effectifs et fiches techniques nageurs.'
                          : 'Coach Titulaire: Acces complet a vos groupes et seances en remplacement (appel, logger 3 etapes, notation seance et suivi d\'evolution).',
                  style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.5, height: 1.45),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16.0),

          // Details List
          Container(
            decoration: BoxDecoration(
              color: AqaTheme.surfaceDark,
              borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
              border: Border.all(color: AqaTheme.borderSubtle),
            ),
            child: Column(
              children: [
                _buildInfoTile('Identifiant Coach', user?.coachId ?? 'N/A', Icons.badge_outlined),
                const Divider(),
                _buildInfoTile(
                  'Telephone',
                  user?.phone ?? 'Non renseigne',
                  Icons.phone_outlined,
                ),
                const Divider(),
                _buildInfoTile(
                  'Bassin Principal',
                  user?.primaryPool ?? 'Tous les bassins AQA',
                  Icons.water_outlined,
                ),
                const Divider(),
                _buildInfoTile(
                  'Specialites',
                  user?.specialties.isNotEmpty == true
                      ? user!.specialties.join(', ')
                      : 'Enseignement & Entrainement AQA Swim',
                  Icons.sports_outlined,
                ),
                const Divider(),
                _buildInfoTile('Serveur Cloud AQA', ApiEndpoints.baseUrl, Icons.cloud_outlined),
              ],
            ),
          ),
          const SizedBox(height: 24.0),

          // Logout Button
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AqaTheme.statusDanger),
              foregroundColor: AqaTheme.statusDanger,
              padding: const EdgeInsets.symmetric(vertical: 14.0),
            ),
            onPressed: () {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AqaTheme.surfaceDark,
                  title: const Text(
                    'Deconnexion',
                    style: TextStyle(color: AqaTheme.textPrimary),
                  ),
                  content: const Text(
                    'Voulez-vous vraiment vous deconnecter de l\'application AQA Coaches?',
                    style: TextStyle(color: AqaTheme.textMuted),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Annuler', style: TextStyle(color: AqaTheme.textMuted)),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AqaTheme.statusDanger),
                      onPressed: () {
                        Navigator.pop(ctx);
                        ref.read(authStateProvider.notifier).logout();
                      },
                      child: const Text('Se Deconnecter'),
                    ),
                  ],
                ),
              );
            },
            icon: const Icon(Icons.logout, size: 18.0),
            label: const Text('Se Deconnecter du Compte'),
          ),
          const SizedBox(height: 24.0),

          const Center(
            child: Text(
              'AQA Swim Coaches Pro • v2.0.0 Production',
              style: TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.0),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTile(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Row(
        children: [
          Icon(icon, color: AqaTheme.textLightMuted, size: 20.0),
          const SizedBox(width: 12.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.0),
                ),
                const SizedBox(height: 2.0),
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
