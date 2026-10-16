import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/auth/auth_state.dart';
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

  void _showServerSettings() {
    final serverController = TextEditingController(text: ApiEndpoints.baseUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AqaTheme.surfaceDark,
        title: const Text(
          'Serveur API AQA Sports',
          style: TextStyle(
            color: AqaTheme.textPrimary,
            fontSize: 16.0,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'URL du serveur de production ou reseau local :',
              style: TextStyle(color: AqaTheme.textMuted, fontSize: 13.0),
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
            child: const Text('Annuler', style: TextStyle(color: AqaTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              await ApiEndpoints.setBaseUrl(serverController.text);
              if (ctx.mounted) Navigator.pop(ctx);
              if (mounted) setState(() {});
            },
            child: const Text('Enregistrer'),
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

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Deep Ocean Visual Background
          Opacity(
            opacity: 0.25,
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
                  Color(0xF2030712),
                  Color(0xFF030712),
                ],
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440.0),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Official AQA Brand Header
                        Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 22.0,
                              vertical: 14.0,
                            ),
                            decoration: BoxDecoration(
                              color: AqaTheme.surfaceDark.withValues(alpha: 0.92),
                              borderRadius: BorderRadius.circular(AqaTheme.radiusXl),
                              border: Border.all(color: AqaTheme.borderTeal),
                              boxShadow: AqaTheme.tealGlow,
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
                                const SizedBox(width: 12.0),
                                Container(
                                  width: 1.0,
                                  height: 24.0,
                                  color: AqaTheme.borderMedium,
                                ),
                                const SizedBox(width: 12.0),
                                const Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'COACHES PRO',
                                      style: TextStyle(
                                        color: AqaTheme.accentTeal,
                                        fontSize: 12.0,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 1.6,
                                      ),
                                    ),
                                    Text(
                                      'AQA SWIM SYSTEM',
                                      style: TextStyle(
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
                        const Text(
                          'Espace Coach & Suivi Technique',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 22.0,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.4,
                          ),
                        ),
                        const SizedBox(height: 6.0),
                        const Text(
                          'Assiduite en temps reel, suivi d\'evolution par badges AQA, notation des seances et gestion des remplacements.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AqaTheme.textMuted,
                            fontSize: 13.0,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 24.0),

                        // Main Login Card
                        Container(
                          padding: const EdgeInsets.all(20.0),
                          decoration: BoxDecoration(
                            color: AqaTheme.surfaceDark.withValues(alpha: 0.94),
                            borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                            border: Border.all(color: AqaTheme.borderMedium),
                            boxShadow: AqaTheme.cardShadow,
                          ),
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

                              const Text(
                                'Email Professionnel',
                                style: TextStyle(
                                  color: AqaTheme.textPrimary,
                                  fontSize: 12.5,
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
                                  fontSize: 14.0,
                                ),
                                decoration: const InputDecoration(
                                  hintText: 'coach@aqasports.pro',
                                  prefixIcon: Icon(
                                    Icons.email_outlined,
                                    color: AqaTheme.textLightMuted,
                                    size: 20.0,
                                  ),
                                ),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Veuillez saisir votre email';
                                  }
                                  if (!value.contains('@')) {
                                    return 'Format email invalide';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16.0),

                              const Text(
                                'Mot de Passe',
                                style: TextStyle(
                                  color: AqaTheme.textPrimary,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
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
                                  hintText: 'Votre mot de passe',
                                  prefixIcon: const Icon(
                                    Icons.lock_outline,
                                    color: AqaTheme.textLightMuted,
                                    size: 20.0,
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
                                    return 'Veuillez saisir votre mot de passe';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 22.0),

                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 15.0),
                                ),
                                onPressed: authState.isLoading ? null : _submit,
                                icon: authState.isLoading
                                    ? const SizedBox(
                                        height: 18.0,
                                        width: 18.0,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.0,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Icon(Icons.login, size: 18.0),
                                label: Text(
                                  authState.isLoading
                                      ? 'Connexion en cours...'
                                      : 'Acceder au Portail Coach',
                                  style: const TextStyle(
                                    fontSize: 14.0,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18.0),

                        // Quick Role Profiles
                        Container(
                          padding: const EdgeInsets.all(14.0),
                          decoration: BoxDecoration(
                            color: AqaTheme.surfaceDark.withValues(alpha: 0.9),
                            borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                            border: Border.all(color: AqaTheme.borderSubtle),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(
                                    Icons.verified_user_outlined,
                                    color: AqaTheme.accentTeal,
                                    size: 15.0,
                                  ),
                                  SizedBox(width: 6.0),
                                  Expanded(
                                    child: Text(
                                      'CONNEXION RAPIDE PAR ROLE (ACCES DEMO & PRODUCTION)',
                                      style: TextStyle(
                                        color: AqaTheme.textMuted,
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.6,
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
                                      title: 'Head Coach',
                                      subtitle: 'Tous Groupes',
                                      color: AqaTheme.statusWarning,
                                      email: 'headcoach@aqasports.pro',
                                    ),
                                  ),
                                  const SizedBox(width: 8.0),
                                  Expanded(
                                    child: _buildRoleQuickButton(
                                      title: 'Coach',
                                      subtitle: 'Ses Groupes',
                                      color: AqaTheme.primarySky,
                                      email: 'coach@aqasports.pro',
                                    ),
                                  ),
                                  const SizedBox(width: 8.0),
                                  Expanded(
                                    child: _buildRoleQuickButton(
                                      title: 'Assistant',
                                      subtitle: 'Lecture Seule',
                                      color: AqaTheme.accentTeal,
                                      email: 'assistant@aqasports.pro',
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14.0),

                        Align(
                          alignment: Alignment.center,
                          child: TextButton.icon(
                            onPressed: _showServerSettings,
                            icon: const Icon(
                              Icons.dns_outlined,
                              color: AqaTheme.textLightMuted,
                              size: 15.0,
                            ),
                            label: Text(
                              'Serveur : ${ApiEndpoints.baseUrl}',
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
      borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
      onTap: () => _fillDemo(email),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 6.0),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.18) : AqaTheme.surfaceSecondary,
          borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
          border: Border.all(
            color: isSelected ? color : AqaTheme.borderSubtle,
          ),
        ),
        child: Column(
          children: [
            Text(
              title,
              style: TextStyle(
                color: color,
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2.0),
            Text(
              subtitle,
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
