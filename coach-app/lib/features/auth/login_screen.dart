import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/auth/auth_state.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/theme/aqa_theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      ref.read(authStateProvider.notifier).login(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );
    }
  }

  void _showServerSettings(AppI18n i18n) {
    final serverController = TextEditingController(text: ApiEndpoints.baseUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AqaTheme.surfaceDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
          side: const BorderSide(color: AqaTheme.borderTeal),
        ),
        title: Text(
          i18n.t('auth.server_title'),
          style: const TextStyle(
            color: AqaTheme.textPrimary,
            fontSize: 16.0,
            fontWeight: FontWeight.w800,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              i18n.t('auth.server_label'),
              style: const TextStyle(color: AqaTheme.textMuted, fontSize: 13.0),
            ),
            const SizedBox(height: 12.0),
            TextField(
              controller: serverController,
              decoration: const InputDecoration(
                hintText: 'https://delightful-torte-bcca6a.netlify.app',
              ),
              style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0),
            ),
          ],
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
            onPressed: () async {
              await ApiEndpoints.setBaseUrl(serverController.text);
              if (ctx.mounted) Navigator.pop(ctx);
              if (mounted) setState(() {});
            },
            child: Text(i18n.t('common.save')),
          ),
        ],
      ),
    );
  }

  void _fillDemo(String email) {
    setState(() {
      _emailController.text = email;
      _passwordController.text = 'AqaDemo2026!';
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final i18n = ref.watch(i18nProvider);

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      body: AqaAmbientBackground(
        child: Stack(
          fit: StackFit.expand,
          children: [
            Opacity(
              opacity: 0.18,
              child: Image.asset(
                'assets/images/ocean_bg.jpg',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0x99030712),
                    Color(0xE6030712),
                    Color(0xFF030712),
                  ],
                ),
              ),
            ),
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 22.0, vertical: 20.0),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 440.0),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Language Switcher Bar at Top
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10.0,
                                  vertical: 5.0,
                                ),
                                decoration: BoxDecoration(
                                  color: AqaTheme.accentTeal.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: AqaTheme.accentTeal.withValues(alpha: 0.35),
                                  ),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.verified_outlined,
                                      size: 13.0,
                                      color: AqaTheme.accentTeal,
                                    ),
                                    SizedBox(width: 5.0),
                                    Text(
                                      'AQA SWIM COMMANDED',
                                      style: TextStyle(
                                        color: AqaTheme.accentTeal,
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.9,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const LanguageSwitcherPill(compact: true),
                            ],
                          ),
                          const SizedBox(height: 22.0),

                          // Double-Bezel Brand Identity Card
                          Center(
                            child: AqaDoubleBezelCard(
                              glowing: true,
                              outerRadius: 24.0,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 22.0,
                                vertical: 14.0,
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Image.asset(
                                    'assets/images/aqa_logo_white.png',
                                    height: 36.0,
                                    errorBuilder: (_, __, ___) => const Icon(
                                      Icons.pool,
                                      color: AqaTheme.accentTeal,
                                      size: 28.0,
                                    ),
                                  ),
                                  const SizedBox(width: 14.0),
                                  Container(
                                    width: 1.0,
                                    height: 26.0,
                                    color: AqaTheme.borderMedium,
                                  ),
                                  const SizedBox(width: 14.0),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        i18n.t('app.brand_title'),
                                        style: const TextStyle(
                                          color: AqaTheme.accentTeal,
                                          fontSize: 12.0,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 1.6,
                                        ),
                                      ),
                                      Text(
                                        i18n.t('app.brand_subtitle'),
                                        style: const TextStyle(
                                          color: AqaTheme.textMuted,
                                          fontSize: 9.5,
                                          fontWeight: FontWeight.w600,
                                          letterSpacing: 1.0,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 20.0),
                          Text(
                            i18n.t('auth.title'),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: AqaTheme.textPrimary,
                              fontSize: 23.0,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 6.0),
                          Text(
                            i18n.t('auth.subtitle'),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: AqaTheme.textMuted,
                              fontSize: 13.0,
                              height: 1.45,
                            ),
                          ),
                          const SizedBox(height: 22.0),

                          // Double-Bezel Main Login Form
                          AqaDoubleBezelCard(
                            outerRadius: 22.0,
                            padding: const EdgeInsets.all(20.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                if (authState.errorMessage != null) ...[
                                  Container(
                                    padding: const EdgeInsets.all(12.0),
                                    decoration: BoxDecoration(
                                      color: AqaTheme.statusDangerBg,
                                      borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                                      border: Border.all(color: AqaTheme.statusDanger),
                                    ),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Icon(
                                          Icons.error_outline,
                                          color: AqaTheme.statusDanger,
                                          size: 18.0,
                                        ),
                                        const SizedBox(width: 8.0),
                                        Expanded(
                                          child: Text(
                                            authState.errorMessage!,
                                            style: const TextStyle(
                                              color: AqaTheme.textPrimary,
                                              fontSize: 12.5,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 16.0),
                                ],

                                Text(
                                  i18n.t('auth.email_label'),
                                  style: const TextStyle(
                                    color: AqaTheme.textPrimary,
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 6.0),
                                TextFormField(
                                  controller: _emailController,
                                  keyboardType: TextInputType.emailAddress,
                                  autocorrect: false,
                                  style: const TextStyle(
                                    color: AqaTheme.textPrimary,
                                    fontSize: 14.0,
                                  ),
                                  decoration: InputDecoration(
                                    hintText: i18n.t('auth.email_hint'),
                                    prefixIcon: const Icon(
                                      Icons.alternate_email_rounded,
                                      color: AqaTheme.accentTeal,
                                      size: 19.0,
                                    ),
                                  ),
                                  validator: (value) {
                                    if (value == null || value.trim().isEmpty) {
                                      return i18n.t('auth.email_required');
                                    }
                                    if (!value.contains('@')) {
                                      return i18n.t('auth.email_invalid');
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 16.0),

                                Text(
                                  i18n.t('auth.password_label'),
                                  style: const TextStyle(
                                    color: AqaTheme.textPrimary,
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 6.0),
                                TextFormField(
                                  controller: _passwordController,
                                  obscureText: _obscurePassword,
                                  style: const TextStyle(
                                    color: AqaTheme.textPrimary,
                                    fontSize: 14.0,
                                  ),
                                  decoration: InputDecoration(
                                    hintText: i18n.t('auth.password_hint'),
                                    prefixIcon: const Icon(
                                      Icons.lock_outline_rounded,
                                      color: AqaTheme.primarySky,
                                      size: 19.0,
                                    ),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _obscurePassword
                                            ? Icons.visibility_outlined
                                            : Icons.visibility_off_outlined,
                                        color: AqaTheme.textLightMuted,
                                        size: 20.0,
                                      ),
                                      onPressed: () => setState(
                                        () => _obscurePassword = !_obscurePassword,
                                      ),
                                    ),
                                  ),
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return i18n.t('auth.password_required');
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 22.0),

                                AqaIslandButton(
                                  label: authState.isLoading
                                      ? i18n.t('auth.logging_in')
                                      : i18n.t('auth.login_cta'),
                                  icon: Icons.arrow_forward_rounded,
                                  loading: authState.isLoading,
                                  onPressed: _submit,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16.0),

                          // Quick Role Profiles
                          AqaDoubleBezelCard(
                            outerRadius: 18.0,
                            padding: const EdgeInsets.all(14.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.shield_outlined,
                                      color: AqaTheme.accentTeal,
                                      size: 15.0,
                                    ),
                                    const SizedBox(width: 6.0),
                                    Expanded(
                                      child: Text(
                                        i18n.t('auth.quick_roles'),
                                        style: const TextStyle(
                                          color: AqaTheme.textMuted,
                                          fontSize: 10.0,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 0.7,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10.0),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildRoleQuickButton(
                                        title: i18n.t('auth.head_coach'),
                                        subtitle: i18n.t('auth.head_coach_desc'),
                                        color: AqaTheme.statusWarning,
                                        email: 'headcoach@aqasports.pro',
                                      ),
                                    ),
                                    const SizedBox(width: 8.0),
                                    Expanded(
                                      child: _buildRoleQuickButton(
                                        title: i18n.t('auth.coach'),
                                        subtitle: i18n.t('auth.coach_desc'),
                                        color: AqaTheme.primarySky,
                                        email: 'coach@aqasports.pro',
                                      ),
                                    ),
                                    const SizedBox(width: 8.0),
                                    Expanded(
                                      child: _buildRoleQuickButton(
                                        title: i18n.t('auth.assistant'),
                                        subtitle: i18n.t('auth.assistant_desc'),
                                        color: AqaTheme.accentTeal,
                                        email: 'assistant@aqasports.pro',
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12.0),

                          Align(
                            alignment: Alignment.center,
                            child: TextButton.icon(
                              onPressed: () => _showServerSettings(i18n),
                              icon: const Icon(
                                Icons.dns_outlined,
                                color: AqaTheme.textLightMuted,
                                size: 14.0,
                              ),
                              label: Text(
                                '${i18n.t('common.server')} : ${ApiEndpoints.baseUrl}',
                                style: const TextStyle(
                                  color: AqaTheme.textLightMuted,
                                  fontSize: 11.0,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleQuickButton({
    required String title,
    required String subtitle,
    required Color color,
    required String email,
  }) {
    final isSelected = _emailController.text.trim() == email;
    return InkWell(
      borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
      onTap: () => _fillDemo(email),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 10.0, horizontal: 6.0),
        decoration: BoxDecoration(
          color: isSelected
              ? color.withValues(alpha: 0.18)
              : const Color(0xFF0A1224),
          borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
          border: Border.all(
            color: isSelected ? color : AqaTheme.borderSubtle,
            width: isSelected ? 1.4 : 1.0,
          ),
        ),
        child: Column(
          children: [
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: color,
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2.0),
            Text(
              subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AqaTheme.textMuted,
                fontSize: 9.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
