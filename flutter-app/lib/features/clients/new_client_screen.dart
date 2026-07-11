import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/theme/app_theme.dart';

class NewClientScreen extends ConsumerStatefulWidget {
  const NewClientScreen({super.key});
  @override
  ConsumerState<NewClientScreen> createState() => _NewClientScreenState();
}

class _NewClientScreenState extends ConsumerState<NewClientScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String _segment = 'Standard';
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.post(ApiConfig.clients, data: {
        'fullName': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim().isNotEmpty ? _phoneCtrl.text.trim() : null,
        'email': _emailCtrl.text.trim().isNotEmpty ? _emailCtrl.text.trim() : null,
        'notes': _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null,
        'customerSegment': _segment,
      });
      if (mounted) {
        final newId = (res.data as Map<String, dynamic>)['id'] as String?;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Client created successfully'), backgroundColor: AppTheme.success),
        );
        if (newId != null) context.go('/clients/$newId');
        else context.go('/clients');
      }
    } catch (e) {
      setState(() { _error = 'Failed to create client. Please try again.'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('New Client')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _nameCtrl,
                style: const TextStyle(color: AppTheme.foreground),
                decoration: const InputDecoration(labelText: 'Full Name *', prefixIcon: Icon(Icons.person_outline_rounded, size: 18)),
                textCapitalization: TextCapitalization.words,
                validator: (v) => v?.trim().isEmpty == true ? 'Full name is required' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _phoneCtrl,
                style: const TextStyle(color: AppTheme.foreground),
                decoration: const InputDecoration(labelText: 'Phone', prefixIcon: Icon(Icons.phone_outlined, size: 18)),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _emailCtrl,
                style: const TextStyle(color: AppTheme.foreground),
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined, size: 18)),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 14),
              // Segment
              DropdownButtonFormField<String>(
                value: _segment,
                dropdownColor: AppTheme.surface2,
                style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w600),
                decoration: const InputDecoration(labelText: 'Segment', prefixIcon: Icon(Icons.category_outlined, size: 18)),
                items: const [
                  DropdownMenuItem(value: 'Standard', child: Text('Standard')),
                  DropdownMenuItem(value: 'Premium', child: Text('Premium')),
                  DropdownMenuItem(value: 'VIP', child: Text('VIP')),
                ],
                onChanged: (v) => setState(() => _segment = v ?? 'Standard'),
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _notesCtrl,
                style: const TextStyle(color: AppTheme.foreground),
                decoration: const InputDecoration(labelText: 'Notes', prefixIcon: Icon(Icons.notes_rounded, size: 18)),
                maxLines: 3,
              ),
              const SizedBox(height: 28),
              if (_error != null) ...[
                Text(_error!, style: const TextStyle(color: AppTheme.danger), textAlign: TextAlign.center),
                const SizedBox(height: 12),
              ],
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : const Text('Create Client'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
