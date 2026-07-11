import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/package.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_shimmer.dart';

final pkgsProvider = FutureProvider<List<Package>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.packages);
  final list = res.data as List<dynamic>;
  return list.map((e) => Package.fromJson(e as Map<String, dynamic>)).toList();
});

class PackagesScreen extends ConsumerWidget {
  const PackagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final packages = ref.watch(pkgsProvider);
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Packages'),
        actions: [
          IconButton(icon: const Icon(Icons.add_rounded), onPressed: () => _showCreateDialog(context, ref)),
        ],
      ),
      body: packages.when(
        loading: () => const ListLoadingShimmer(itemCount: 4),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (list) {
          if (list.isEmpty) {
            return const EmptyState(title: 'No packages', icon: Icons.inventory_2_outlined);
          }
          return RefreshIndicator(
            color: AppTheme.primary,
            backgroundColor: AppTheme.surface2,
            onRefresh: () => ref.refresh(pkgsProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final p = list[i];
                return Opacity(
                  opacity: p.active ? 1.0 : 0.55,
                  child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppTheme.surface2,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: p.active ? AppTheme.border : AppTheme.border.withOpacity(0.4)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 50, height: 50,
                        decoration: BoxDecoration(
                          color: AppTheme.primaryLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text('${p.totalCredits}', style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w900, fontSize: 18)),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p.name, style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.foreground, fontSize: 15)),
                            const SizedBox(height: 3),
                            Text('${p.creditAmount} paid + ${p.bonusCredits} bonus credits', style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                          ],
                        ),
                      ),
                      Text(p.formattedPrice, style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w800, fontSize: 15)),
                    ],
                  ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _showCreateDialog(BuildContext context, WidgetRef ref) {
    showDialog(context: context, builder: (_) => _CreatePackageDialog(onCreated: () => ref.refresh(pkgsProvider.future)));
  }
}

class _CreatePackageDialog extends ConsumerStatefulWidget {
  final VoidCallback onCreated;
  const _CreatePackageDialog({required this.onCreated});

  @override
  ConsumerState<_CreatePackageDialog> createState() => _CreatePackageDialogState();
}

class _CreatePackageDialogState extends ConsumerState<_CreatePackageDialog> {
  final _nameCtrl = TextEditingController();
  final _creditsCtrl = TextEditingController();
  final _bonusCtrl = TextEditingController(text: '0');
  final _priceCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _nameCtrl.dispose(); _creditsCtrl.dispose(); _bonusCtrl.dispose(); _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final credits = int.tryParse(_creditsCtrl.text) ?? 0;
    final bonus = int.tryParse(_bonusCtrl.text) ?? 0;
    final price = int.tryParse(_priceCtrl.text) ?? 0;
    if (_nameCtrl.text.trim().isEmpty || credits <= 0) return;
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post(ApiConfig.packages, data: {
        'name': _nameCtrl.text.trim(),
        'creditAmount': credits,
        'bonusCredits': bonus,
        'totalCredits': credits + bonus,
        'price': price,
      });
      widget.onCreated();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppTheme.surface2,
      title: const Text('New Package', style: TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w800)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Package Name'), style: const TextStyle(color: AppTheme.foreground)),
          const SizedBox(height: 10),
          TextField(controller: _creditsCtrl, decoration: const InputDecoration(labelText: 'Credits'), keyboardType: TextInputType.number, style: const TextStyle(color: AppTheme.foreground)),
          const SizedBox(height: 10),
          TextField(controller: _bonusCtrl, decoration: const InputDecoration(labelText: 'Bonus Credits'), keyboardType: TextInputType.number, style: const TextStyle(color: AppTheme.foreground)),
          const SizedBox(height: 10),
          TextField(controller: _priceCtrl, decoration: const InputDecoration(labelText: 'Price (DA)'), keyboardType: TextInputType.number, style: const TextStyle(color: AppTheme.foreground)),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: _loading ? null : _submit,
          child: _loading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Create'),
        ),
      ],
    );
  }
}
