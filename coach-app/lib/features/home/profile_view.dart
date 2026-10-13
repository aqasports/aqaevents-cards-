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
          // Profile Card
          Container(
            padding: const EdgeInsets.all(20.0),
            decoration: BoxDecoration(
              color: AqaTheme.surfaceDark,
              borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
              border: Border.all(color: AqaTheme.borderSubtle),
              boxShadow: AqaTheme.cardShadow,
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 36.0,
                  backgroundColor: AqaTheme.surfaceSecondary,
                  child: Text(
                    (user?.name.isNotEmpty ?? false) ? user!.name.substring(0, 1).toUpperCase() : 'C',
                    style: const TextStyle(
                      color: AqaTheme.accentTeal,
                      fontSize: 28.0,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 12.0),
                Text(
                  user?.name ?? 'Coach Name',
                  style: const TextStyle(
                    color: AqaTheme.textPrimary,
                    fontSize: 18.0,
                    fontWeight: FontWeight.w700,
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
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                    ),
                  ),
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
                _buildInfoTile('Coach ID', user?.coachId ?? 'N/A', Icons.badge_outlined),
                const Divider(),
                _buildInfoTile('Phone', user?.phone ?? 'Not set', Icons.phone_outlined),
                const Divider(),
                _buildInfoTile('Primary Pool', user?.primaryPool ?? 'All pools', Icons.water_outlined),
                const Divider(),
                _buildInfoTile(
                  'Specialties',
                  user?.specialties.isNotEmpty == true ? user!.specialties.join(', ') : 'General Coaching',
                  Icons.sports_outlined,
                ),
                const Divider(),
                _buildInfoTile('Server URL', ApiEndpoints.baseUrl, Icons.cloud_outlined),
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
                  title: const Text('Sign Out', style: TextStyle(color: AqaTheme.textPrimary)),
                  content: const Text(
                    'Are you sure you want to sign out of AQA Coaches Workspace?',
                    style: TextStyle(color: AqaTheme.textMuted),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Cancel', style: TextStyle(color: AqaTheme.textMuted)),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AqaTheme.statusDanger),
                      onPressed: () {
                        Navigator.pop(ctx);
                        ref.read(authStateProvider.notifier).logout();
                      },
                      child: const Text('Sign Out'),
                    ),
                  ],
                ),
              );
            },
            icon: const Icon(Icons.logout, size: 18.0),
            label: const Text('Sign Out of Account'),
          ),
          const SizedBox(height: 24.0),

          const Center(
            child: Text(
              'AQA Coaches Workspace • v1.0.0 (Build 1)',
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
                Text(label, style: const TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.0)),
                const SizedBox(height: 2.0),
                Text(
                  value,
                  style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
