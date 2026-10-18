import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_state.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/services/notification_service.dart';
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
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(notificationServiceProvider)
          .ensureInitializedAndPromptIfFirstRun();
    });
  }

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

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final i18n = ref.watch(i18nProvider);

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      body: AqaAmbientBackground(
        constrainWidth: false,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Opacity(
              opacity: 0.12,
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
                    Color(0xB3030712),
                    Color(0xEB030712),
                    Color(0xFF030712),
                  ],
                ),
              ),
            ),
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20.0,
                    vertical: 24.0,
                  ),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420.0),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Top Utility Bar
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10.0,
                                  vertical: 5.0,
                                ),
                                decoration: BoxDecoration(
                                  color: AqaTheme.surfaceRecessed,
                                  borderRadius: BorderRadius.circular(8.0),
                                  border: Border.all(
                                    color: AqaTheme.borderSubtle,
                                  ),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    AqaPulseIndicator(
                                      color: AqaTheme.accentTeal,
                                      size: 6.0,
                                    ),
                                    SizedBox(width: 7.0),
                                    Text(
                                      'AQA SWIM CLOUD',
                                      style: TextStyle(
                                        color: AqaTheme.textSecondary,
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.8,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const LanguageSwitcherPill(compact: true),
                            ],
                          ),
                          const SizedBox(height: 24.0),

                          // Precision Auth Portal Card
                          AqaDoubleBezelCard(
                            glowing: true,
                            outerRadius: 20.0,
                            padding: const EdgeInsets.all(24.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                // Brand Lockup inside header
                                Row(
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(14.0),
                                      child: Container(
                                        width: 56.0,
                                        height: 56.0,
                                        decoration: BoxDecoration(
                                          color: Colors.black,
                                          borderRadius:
                                              BorderRadius.circular(14.0),
                                          border: Border.all(
                                            color: AqaTheme.accentTeal
                                                .withValues(alpha: 0.35),
                                          ),
                                        ),
                                        child: Image.asset(
                                          'assets/images/coach_logo.png',
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) =>
                                              const Icon(
                                            Icons.pool_rounded,
                                            color: AqaTheme.accentTeal,
                                            size: 26.0,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 14.0),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Text(
                                                i18n.t('app.brand_title'),
                                                style: const TextStyle(
                                                  color: AqaTheme.textPrimary,
                                                  fontSize: 13.0,
                                                  fontWeight: FontWeight.w800,
                                                  letterSpacing: 1.0,
                                                ),
                                              ),
                                              const SizedBox(width: 6.0),
                                              Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                  horizontal: 6.0,
                                                  vertical: 1.5,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: AqaTheme.primarySky
                                                      .withValues(alpha: 0.16),
                                                  borderRadius:
                                                      BorderRadius.circular(4.0),
                                                ),
                                                child: Text(
                                                  i18n.t('app.brand_subtitle'),
                                                  style: const TextStyle(
                                                    color: AqaTheme.accentTeal,
                                                    fontSize: 9.0,
                                                    fontWeight: FontWeight.w800,
                                                    letterSpacing: 0.6,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 2.0),
                                          Text(
                                            i18n.t('auth.title'),
                                            style: const TextStyle(
                                              color: AqaTheme.textPrimary,
                                              fontSize: 18.0,
                                              fontWeight: FontWeight.w700,
                                              letterSpacing: -0.4,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10.0),
                                Text(
                                  i18n.t('auth.subtitle'),
                                  style: const TextStyle(
                                    color: AqaTheme.textMuted,
                                    fontSize: 12.5,
                                    height: 1.4,
                                  ),
                                ),
                                const SizedBox(height: 20.0),
                                const Divider(),
                                const SizedBox(height: 20.0),

                                if (authState.errorMessage != null) ...[
                                  Container(
                                    padding: const EdgeInsets.all(12.0),
                                    decoration: BoxDecoration(
                                      color: AqaTheme.statusDangerBg,
                                      borderRadius: BorderRadius.circular(10.0),
                                      border: Border.all(
                                        color: AqaTheme.statusDanger
                                            .withValues(alpha: 0.45),
                                      ),
                                    ),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Icon(
                                          Icons.error_outline_rounded,
                                          color: AqaTheme.statusDanger,
                                          size: 17.0,
                                        ),
                                        const SizedBox(width: 8.0),
                                        Expanded(
                                          child: Text(
                                            authState.errorMessage!,
                                            style: const TextStyle(
                                              color: AqaTheme.textPrimary,
                                              fontSize: 12.0,
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
                                    color: AqaTheme.textSecondary,
                                    fontSize: 12.0,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 6.0),
                                TextFormField(
                                  controller: _emailController,
                                  keyboardType: TextInputType.emailAddress,
                                  autocorrect: false,
                                  style: const TextStyle(
                                    color: AqaTheme.textPrimary,
                                    fontSize: 13.5,
                                  ),
                                  decoration: InputDecoration(
                                    hintText: i18n.t('auth.email_hint'),
                                    prefixIcon: const Icon(
                                      Icons.alternate_email_rounded,
                                      color: AqaTheme.textLightMuted,
                                      size: 18.0,
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
                                    color: AqaTheme.textSecondary,
                                    fontSize: 12.0,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 6.0),
                                TextFormField(
                                  controller: _passwordController,
                                  obscureText: _obscurePassword,
                                  onFieldSubmitted: (_) => _submit(),
                                  style: const TextStyle(
                                    color: AqaTheme.textPrimary,
                                    fontSize: 13.5,
                                  ),
                                  decoration: InputDecoration(
                                    hintText: i18n.t('auth.password_hint'),
                                    prefixIcon: const Icon(
                                      Icons.lock_outline_rounded,
                                      color: AqaTheme.textLightMuted,
                                      size: 18.0,
                                    ),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _obscurePassword
                                            ? Icons.visibility_outlined
                                            : Icons.visibility_off_outlined,
                                        color: AqaTheme.textLightMuted,
                                        size: 18.0,
                                      ),
                                      onPressed: () => setState(
                                        () => _obscurePassword =
                                            !_obscurePassword,
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
}
