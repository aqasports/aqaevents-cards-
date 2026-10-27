import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_state.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/services/notification_service.dart';
import '../../core/theme/aqa_theme.dart';
import '../teaching/teaching_support_view.dart';

class ProfileView extends ConsumerWidget {
  const ProfileView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final i18n = ref.watch(i18nProvider);
    final notifSettings = ref.watch(notificationSettingsProvider);
    final notifNotifier = ref.read(notificationSettingsProvider.notifier);

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
                      i18n.t('profile.lang_sub'),
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

        // Notification Settings Card (New Client NEW Label, Group Movement, Replacements, Reminders)
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AqaSectionHeader(
                eyebrow: 'ALERTES & NOTIFICATIONS',
                title: i18n.t('notif.settings_title'),
              ),
              const SizedBox(height: 12.0),
              _buildNotificationToggleRow(
                icon: Icons.notifications_active_outlined,
                accentColor: AqaTheme.accentTeal,
                title: i18n.t('notif.allow_title'),
                subtitle: i18n.t('notif.allow_sub'),
                value: notifSettings.isAuthorized,
                onChanged: (val) => notifNotifier.toggleAuthorized(val),
              ),
              const Divider(height: 18.0),
              _buildNotificationToggleRow(
                icon: Icons.fiber_new_rounded,
                accentColor: AqaTheme.statusSuccess,
                badgeTag: 'NEW',
                title: i18n.t('notif.new_client_toggle_title'),
                subtitle: i18n.t('notif.new_client_toggle_sub'),
                value: notifSettings.notifyNewClient,
                enabled: notifSettings.isAuthorized,
                onChanged: (val) => notifNotifier.toggleNewClient(val),
              ),
              const Divider(height: 18.0),
              _buildNotificationToggleRow(
                icon: Icons.compare_arrows_rounded,
                accentColor: AqaTheme.primarySkyHover,
                title: i18n.t('notif.movement_toggle_title'),
                subtitle: i18n.t('notif.movement_toggle_sub'),
                value: notifSettings.notifyGroupMovement,
                enabled: notifSettings.isAuthorized,
                onChanged: (val) => notifNotifier.toggleGroupMovement(val),
              ),
              const Divider(height: 18.0),
              _buildNotificationToggleRow(
                icon: Icons.swap_horiz_rounded,
                accentColor: AqaTheme.statusWarning,
                title: i18n.t('notif.replacement_toggle_title'),
                subtitle: i18n.t('notif.replacement_toggle_sub'),
                value: notifSettings.notifyReplacements,
                enabled: notifSettings.isAuthorized,
                onChanged: (val) => notifNotifier.toggleReplacements(val),
              ),
              const Divider(height: 18.0),
              _buildNotificationToggleRow(
                icon: Icons.timer_outlined,
                accentColor: AqaTheme.accentTeal,
                title: i18n.t('notif.reminder_toggle_title'),
                subtitle: i18n.t('notif.reminder_toggle_sub'),
                value: notifSettings.notifySessionReminder,
                enabled: notifSettings.isAuthorized,
                onChanged: (val) => notifNotifier.toggleSessionReminder(val),
              ),
              const Divider(height: 18.0),
              const SizedBox(height: 4.0),
              Row(
                children: [
                  Expanded(
                    child: AqaIslandButton(
                      label: i18n.t('notif.test_button'),
                      icon: Icons.notification_important_rounded,
                      compact: true,
                      secondary: true,
                      onPressed: () async {
                        final ok = await ref
                            .read(notificationServiceProvider)
                            .showNotification(
                              title: 'AQA Coaches',
                              body: i18n.t('notif.test_body'),
                              tag: 'test-${DateTime.now().millisecondsSinceEpoch}',
                            );
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              backgroundColor: ok
                                  ? AqaTheme.statusSuccess
                                  : AqaTheme.statusWarning,
                              content: Text(
                                ok
                                    ? i18n.t('notif.test_sent')
                                    : i18n.t('notif.test_failed'),
                              ),
                            ),
                          );
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 8.0),
                  Expanded(
                    child: AqaIslandButton(
                      label: i18n.t('notif.os_settings'),
                      icon: Icons.settings_suggest_rounded,
                      compact: true,
                      secondary: true,
                      onPressed: () {
                        ref
                            .read(notificationServiceProvider)
                            .openNotificationSettings();
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14.0),

        // Support Pedagogique AQA Card
        AqaDoubleBezelCard(
          padding: const EdgeInsets.all(16.0),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const TeachingSupportView(),
              ),
            );
          },
          child: Row(
            children: [
              Container(
                width: 40.0,
                height: 40.0,
                decoration: BoxDecoration(
                  color: AqaTheme.accentTeal.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10.0),
                  border: Border.all(
                    color: AqaTheme.accentTeal.withValues(alpha: 0.35),
                  ),
                ),
                child: const Icon(
                  Icons.menu_book_rounded,
                  color: AqaTheme.accentTeal,
                  size: 20.0,
                ),
              ),
              const SizedBox(width: 14.0),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      i18n.t('profile.support_title'),
                      style: const TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2.0),
                    Text(
                      i18n.t('profile.support_sub'),
                      style: const TextStyle(
                        color: AqaTheme.textMuted,
                        fontSize: 11.0,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                color: AqaTheme.textLightMuted,
                size: 20.0,
              ),
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
                title: i18n.t('profile.permissions_title'),
              ),
              const SizedBox(height: 8.0),
              Text(
                isHead
                    ? i18n.t('profile.role_head_desc')
                    : isAssistant
                        ? i18n.t('profile.role_assistant_desc')
                        : i18n.t('profile.role_coach_desc'),
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
                i18n.t('profile.coach_id'),
                user?.coachId ?? 'N/A',
                Icons.badge_outlined,
              ),
              const Divider(),
              _buildInfoTile(
                i18n.t('profile.phone'),
                user?.phone ?? i18n.t('profile.phone_none'),
                Icons.phone_outlined,
              ),
              const Divider(),
              _buildInfoTile(
                i18n.t('profile.primary_pool'),
                user?.primaryPool ?? i18n.t('profile.all_pools'),
                Icons.water_outlined,
              ),
              const Divider(),
              _buildInfoTile(
                i18n.t('profile.specialties'),
                user?.specialties.isNotEmpty == true
                    ? user!.specialties.join(', ')
                    : 'Enseignement & Entrainement AQA Swim',
                Icons.sports_outlined,
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
                  i18n.t('profile.logout_confirm'),
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

  Widget _buildNotificationToggleRow({
    required IconData icon,
    required Color accentColor,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    bool enabled = true,
    String? badgeTag,
  }) {
    return Opacity(
      opacity: enabled ? 1.0 : 0.55,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 34.0,
            height: 34.0,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(9.0),
              border: Border.all(
                color: accentColor.withValues(alpha: 0.35),
              ),
            ),
            child: Icon(icon, color: accentColor, size: 17.5),
          ),
          const SizedBox(width: 12.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        title,
                        style: const TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 13.0,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (badgeTag != null) ...[
                      const SizedBox(width: 6.0),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6.0,
                          vertical: 1.5,
                        ),
                        decoration: BoxDecoration(
                          color: AqaTheme.statusSuccess.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(5.0),
                          border: Border.all(
                            color: AqaTheme.statusSuccess.withValues(alpha: 0.55),
                          ),
                        ),
                        child: Text(
                          badgeTag,
                          style: const TextStyle(
                            color: AqaTheme.statusSuccess,
                            fontSize: 9.0,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2.5),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 11.0,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8.0),
          Switch.adaptive(
            value: enabled ? value : false,
            activeTrackColor: accentColor.withValues(alpha: 0.45),
            activeThumbColor: accentColor,
            onChanged: enabled ? onChanged : null,
          ),
        ],
      ),
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
