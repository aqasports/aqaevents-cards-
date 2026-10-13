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
          'API Server URL',
          style: TextStyle(color: AqaTheme.textPrimary, fontSize: 16.0, fontWeight: FontWeight.w600),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter the backend domain (e.g. https://events.aqasports.pro or local network IP):',
              style: TextStyle(color: AqaTheme.textMuted, fontSize: 13.0),
            ),
            const SizedBox(height: 12.0),
            TextField(
              controller: serverController,
              decoration: const InputDecoration(
                hintText: 'https://events.aqasports.pro',
              ),
              style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AqaTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              await ApiEndpoints.setBaseUrl(serverController.text);
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Save'),
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420.0),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Brand Header
                    Align(
                      alignment: Alignment.center,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                        decoration: BoxDecoration(
                          color: AqaTheme.surfaceDark,
                          borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                          border: Border.all(color: AqaTheme.borderTeal),
                          boxShadow: AqaTheme.tealGlow,
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.pool, color: AqaTheme.accentTeal, size: 24.0),
                            SizedBox(width: 8.0),
                            Text(
                              'AQA COACHES',
                              style: TextStyle(
                                color: AqaTheme.textPrimary,
                                fontSize: 16.0,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16.0),
                    const Text(
                      'Welcome to AQA Swim',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AqaTheme.textPrimary,
                        fontSize: 22.0,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 6.0),
                    const Text(
                      'Sign in with your coach credentials to view groups, record presences, and evaluate swimmers.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AqaTheme.textMuted,
                        fontSize: 13.0,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 28.0),

                    // Error Message
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
                            const Icon(Icons.error_outline, color: AqaTheme.statusDanger, size: 18.0),
                            const SizedBox(width: 8.0),
                            Expanded(
                              child: Text(
                                authState.errorMessage!,
                                style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16.0),
                    ],

                    // Email Field
                    const Text(
                      'Email Address',
                      style: TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6.0),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0),
                      decoration: const InputDecoration(
                        hintText: 'coach@aqasports.pro',
                        prefixIcon: Icon(Icons.email_outlined, color: AqaTheme.textLightMuted, size: 20.0),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter your email';
                        }
                        if (!value.contains('@')) {
                          return 'Enter a valid email address';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16.0),

                    // Password Field
                    const Text(
                      'Password',
                      style: TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6.0),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0),
                      decoration: InputDecoration(
                        hintText: 'Enter your password',
                        prefixIcon: const Icon(Icons.lock_outline, color: AqaTheme.textLightMuted, size: 20.0),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            color: AqaTheme.textLightMuted,
                            size: 20.0,
                          ),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your password';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 24.0),

                    // Sign In Button
                    ElevatedButton(
                      onPressed: authState.isLoading ? null : _submit,
                      child: authState.isLoading
                          ? const SizedBox(
                              height: 20.0,
                              width: 20.0,
                              child: CircularProgressIndicator(strokeWidth: 2.0, color: Colors.white),
                            )
                          : const Text('Sign In to Workspace'),
                    ),
                    const SizedBox(height: 24.0),

                    // Reviewer / Quick Test Accounts
                    Container(
                      padding: const EdgeInsets.all(12.0),
                      decoration: BoxDecoration(
                        color: AqaTheme.surfaceDark,
                        borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                        border: Border.all(color: AqaTheme.borderSubtle),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Store Review Accounts',
                            style: TextStyle(
                              color: AqaTheme.textMuted,
                              fontSize: 11.0,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 8.0),
                          Wrap(
                            spacing: 8.0,
                            runSpacing: 6.0,
                            children: [
                              ActionChip(
                                label: const Text('Head Coach', style: TextStyle(fontSize: 11.0)),
                                backgroundColor: AqaTheme.surfaceSecondary,
                                labelStyle: const TextStyle(color: AqaTheme.accentTeal),
                                side: const BorderSide(color: AqaTheme.borderSubtle),
                                onPressed: () => _fillDemo('headcoach@aqasports.pro'),
                              ),
                              ActionChip(
                                label: const Text('Coach', style: TextStyle(fontSize: 11.0)),
                                backgroundColor: AqaTheme.surfaceSecondary,
                                labelStyle: const TextStyle(color: AqaTheme.primarySky),
                                side: const BorderSide(color: AqaTheme.borderSubtle),
                                onPressed: () => _fillDemo('coach@aqasports.pro'),
                              ),
                              ActionChip(
                                label: const Text('Assistant', style: TextStyle(fontSize: 11.0)),
                                backgroundColor: AqaTheme.surfaceSecondary,
                                labelStyle: const TextStyle(color: AqaTheme.textMuted),
                                side: const BorderSide(color: AqaTheme.borderSubtle),
                                onPressed: () => _fillDemo('assistant@aqasports.pro'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20.0),

                    // Server Settings Link
                    Align(
                      alignment: Alignment.center,
                      child: TextButton.icon(
                        onPressed: _showServerSettings,
                        icon: const Icon(Icons.settings_outlined, color: AqaTheme.textLightMuted, size: 16.0),
                        label: Text(
                          'Server: ${ApiEndpoints.baseUrl}',
                          style: const TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.0),
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
    );
  }
}
