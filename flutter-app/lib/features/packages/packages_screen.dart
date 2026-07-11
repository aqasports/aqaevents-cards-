import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/package.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/badge_chip.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_shimmer.dart';

final pkgsProvider = FutureProvider<List<Package>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.packages);
  final list = res.data as List<dynamic>;
  return list.map((e) => Package.fromJson(e as Map<String, dynamic>)).toList();
});

class PackagesScreen extends ConsumerStatefulWidget {
  const PackagesScreen({super.key});

  @override
  ConsumerState<PackagesScreen> createState() => _PackagesScreenState();
}

class _PackagesScreenState extends ConsumerState<PackagesScreen> {
  String? _editingId;
  final _editNameCtrl = TextEditingController();
  final _editCreditsCtrl = TextEditingController();
  final _editBonusCtrl = TextEditingController();
  final _editSortCtrl = TextEditingController();
  bool _editLoading = false;
  bool _actionLoading = false;

  @override
  void dispose() {
    _editNameCtrl.dispose();
    _editCreditsCtrl.dispose();
    _editBonusCtrl.dispose();
    _editSortCtrl.dispose();
    super.dispose();
  }

  void _startEdit(Package p) {
    setState(() {
      _editingId = p.id;
      _editNameCtrl.text = p.name;
      _editCreditsCtrl.text = p.creditAmount.toString();
      _editBonusCtrl.text = p.bonusCredits.toString();
      _editSortCtrl.text = p.sortOrder.toString();
    });
  }

  void _cancelEdit() {
    setState(() {
      _editingId = null;
    });
  }

  Future<void> _saveEdit(String id) async {
    final name = _editNameCtrl.text.trim();
    final credits = int.tryParse(_editCreditsCtrl.text) ?? 1;
    final bonus = int.tryParse(_editBonusCtrl.text) ?? 0;
    final sort = int.tryParse(_editSortCtrl.text) ?? 0;

    if (name.isEmpty || credits < 1) return;

    setState(() => _editLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch(ApiConfig.packageById(id), data: {
        'name': name,
        'creditAmount': credits,
        'bonusCredits': bonus,
        'sortOrder': sort,
      });
      setState(() {
        _editingId = null;
        _editLoading = false;
      });
      ref.refresh(pkgsProvider);
    } catch (_) {
      setState(() => _editLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update package'), backgroundColor: AppTheme.danger),
      );
    }
  }

  Future<void> _toggleActive(Package p) async {
    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch(ApiConfig.packageById(p.id), data: {
        'active': !p.active,
      });
      ref.refresh(pkgsProvider);
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to toggle package status'), backgroundColor: AppTheme.danger),
      );
    } finally {
      setState(() => _actionLoading = false);
    }
  }

  Future<void> _movePackage(Package p, List<Package> activeList, String direction) async {
    final currentIndex = activeList.indexWhere((item) => item.id == p.id);
    final nextIndex = direction == 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= activeList.length) return;

    final targetPackage = activeList[nextIndex];

    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      // Swap sortOrder values
      await api.patch(ApiConfig.packageById(p.id), data: {'sortOrder': targetPackage.sortOrder});
      await api.patch(ApiConfig.packageById(targetPackage.id), data: {'sortOrder': p.sortOrder});
      ref.refresh(pkgsProvider);
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update package order'), backgroundColor: AppTheme.danger),
      );
    } finally {
      setState(() => _actionLoading = false);
    }
  }

  void _showCreateDialog() {
    showDialog(
      context: context,
      builder: (_) => _CreatePackageDialog(
        onCreated: () => ref.refresh(pkgsProvider),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final packages = ref.watch(pkgsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Packages'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: _actionLoading ? null : _showCreateDialog,
          ),
        ],
      ),
      body: Stack(
        children: [
          packages.when(
            loading: () => const ListLoadingShimmer(itemCount: 4),
            error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
            data: (list) {
              final activePackages = list
                  .where((p) => p.active)
                  .toList()
                ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

              final archivedPackages = list.where((p) => !p.active).toList();

              if (list.isEmpty) {
                return const EmptyState(title: 'No packages', icon: Icons.inventory_2_outlined);
              }

              return RefreshIndicator(
                color: AppTheme.primary,
                backgroundColor: AppTheme.surface2,
                onRefresh: () => ref.refresh(pkgsProvider.future),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (activePackages.isNotEmpty) ...[
                      Text(
                        'Active Packages (${activePackages.length})',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(color: AppTheme.muted, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 10),
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: activePackages.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, i) {
                          final p = activePackages[i];
                          if (_editingId == p.id) {
                            return _buildEditCard(p);
                          }
                          return _buildPackageRow(
                            p,
                            activeList: activePackages,
                            isFirst: i == 0,
                            isLast: i == activePackages.length - 1,
                          );
                        },
                      ),
                      const SizedBox(height: 24),
                    ],
                    if (archivedPackages.isNotEmpty) ...[
                      Text(
                        'Archived Packages (${archivedPackages.length})',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(color: AppTheme.muted, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 10),
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: archivedPackages.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, i) {
                          final p = archivedPackages[i];
                          return Opacity(
                            opacity: 0.6,
                            child: _buildPackageRow(p, activeList: const []),
                          );
                        },
                      ),
                      const SizedBox(height: 32),
                    ],
                  ],
                ),
              );
            },
          ),
          if (_actionLoading)
            Container(
              color: Colors.black26,
              child: const Center(
                child: CircularProgressIndicator(color: AppTheme.primary),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPackageRow(Package p, {required List<Package> activeList, bool isFirst = false, bool isLast = false}) {
    final effectiveRate = p.totalCredits > 0 ? p.price / p.totalCredits : 0.0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppTheme.primaryLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    '${p.totalCredits}',
                    style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w900, fontSize: 16),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            p.name,
                            style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.foreground, fontSize: 15),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (p.active) ...[
                          const SizedBox(width: 6),
                          BadgeChip(label: '#${p.sortOrder}', color: AppTheme.muted, bgColor: AppTheme.surface),
                        ] else ...[
                          const SizedBox(width: 6),
                          BadgeChip.status('archived'),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${p.creditAmount} paid + ${p.bonusCredits} bonus credits',
                      style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    p.formattedPrice,
                    style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w800, fontSize: 15),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${effectiveRate.toStringAsFixed(0)} DA / activity',
                    style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700, fontSize: 10),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${p.salesCount} sale${p.salesCount == 1 ? '' : 's'}',
                style: const TextStyle(color: AppTheme.muted, fontSize: 11, fontWeight: FontWeight.w500),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (p.active) ...[
                    IconButton(
                      icon: const Icon(Icons.arrow_upward_rounded, size: 16),
                      onPressed: isFirst ? null : () => _movePackage(p, activeList, 'up'),
                      tooltip: 'Move Up',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(width: 12),
                    IconButton(
                      icon: const Icon(Icons.arrow_downward_rounded, size: 16),
                      onPressed: isLast ? null : () => _movePackage(p, activeList, 'down'),
                      tooltip: 'Move Down',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(width: 16),
                    TextButton(
                      style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                      onPressed: () => _startEdit(p),
                      child: const Text('Edit', style: TextStyle(fontSize: 13)),
                    ),
                    const SizedBox(width: 16),
                  ],
                  TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: p.active ? AppTheme.muted : AppTheme.primary,
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    onPressed: () => _toggleActive(p),
                    child: Text(p.active ? 'Archive' : 'Restore', style: const TextStyle(fontSize: 13)),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEditCard(Package p) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primary, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Edit Package',
            style: TextStyle(fontWeight: FontWeight.w800, color: AppTheme.foreground, fontSize: 14),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _editNameCtrl,
            decoration: const InputDecoration(labelText: 'Name'),
            style: const TextStyle(color: AppTheme.foreground, fontSize: 13),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: StatefulBuilder(
                  builder: (ctx, setInnerState) => TextField(
                    controller: _editCreditsCtrl,
                    decoration: const InputDecoration(labelText: 'Paid Credits'),
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: AppTheme.foreground, fontSize: 13),
                    onChanged: (val) {
                      setState(() {});
                      setInnerState(() {});
                    },
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: StatefulBuilder(
                  builder: (ctx, setInnerState) => TextField(
                    controller: _editBonusCtrl,
                    decoration: const InputDecoration(labelText: 'Bonus Credits'),
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: AppTheme.foreground, fontSize: 13),
                    onChanged: (val) {
                      setState(() {});
                      setInnerState(() {});
                    },
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _editSortCtrl,
            decoration: const InputDecoration(labelText: 'Sort Order'),
            keyboardType: TextInputType.number,
            style: const TextStyle(color: AppTheme.foreground, fontSize: 13),
          ),
          const SizedBox(height: 12),

          // Calculations Preview
          _buildCalculationsPreview(
            credits: int.tryParse(_editCreditsCtrl.text) ?? 1,
            bonus: int.tryParse(_editBonusCtrl.text) ?? 0,
          ),

          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: _editLoading ? null : _cancelEdit,
                child: const Text('Cancel'),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _editLoading ? null : () => _saveEdit(p.id),
                child: _editLoading
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Save'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCalculationsPreview({required int credits, required int bonus}) {
    final total = credits + bonus;
    final price = credits * 1900;
    final rate = total > 0 ? price / total : 0.0;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Automatic Calculations Preview'.toUpperCase(),
            style: const TextStyle(color: AppTheme.muted, fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),
          _buildPreviewRow('Total activities', '$total'),
          const SizedBox(height: 4),
          _buildPreviewRow('Client price (Locked)', '${price.toStringAsFixed(0)} DA'),
          const SizedBox(height: 4),
          _buildPreviewRow(
            'Effective rate',
            '${rate.toStringAsFixed(0)} DA / activity',
            valueColor: AppTheme.primary,
            bold: true,
          ),
        ],
      ),
    );
  }

  Widget _buildPreviewRow(String label, String val, {Color? valueColor, bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
        Text(
          val,
          style: TextStyle(
            color: valueColor ?? AppTheme.foreground,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

class _CreatePackageDialog extends StatefulWidget {
  final VoidCallback onCreated;
  const _CreatePackageDialog({required this.onCreated});

  @override
  State<_CreatePackageDialog> createState() => _CreatePackageDialogState();
}

class _CreatePackageDialogState extends State<_CreatePackageDialog> {
  final _nameCtrl = TextEditingController();
  final _creditsCtrl = TextEditingController(text: '1');
  final _bonusCtrl = TextEditingController(text: '0');
  final _sortCtrl = TextEditingController(text: '1');
  bool _loading = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _creditsCtrl.dispose();
    _bonusCtrl.dispose();
    _sortCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit(BuildContext context) async {
    final credits = int.tryParse(_creditsCtrl.text) ?? 1;
    final bonus = int.tryParse(_bonusCtrl.text) ?? 0;
    final sort = int.tryParse(_sortCtrl.text) ?? 0;

    if (_nameCtrl.text.trim().isEmpty || credits < 1) return;

    setState(() => _loading = true);
    try {
      final api = ApiClient();
      await api.post(ApiConfig.packages, data: {
        'name': _nameCtrl.text.trim(),
        'creditAmount': credits,
        'bonusCredits': bonus,
        'sortOrder': sort,
      });
      widget.onCreated();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to create package'), backgroundColor: AppTheme.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppTheme.surface2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: const Text('Add package', style: TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w800)),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(labelText: 'Package Name', hintText: 'e.g. Starter Pack'),
              style: const TextStyle(color: AppTheme.foreground),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _creditsCtrl,
                    decoration: const InputDecoration(labelText: 'Paid Credits'),
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: AppTheme.foreground),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _bonusCtrl,
                    decoration: const InputDecoration(labelText: 'Bonus Credits'),
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: AppTheme.foreground),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _sortCtrl,
              decoration: const InputDecoration(labelText: 'Sort Order', hintText: 'Lower numbers appear first.'),
              keyboardType: TextInputType.number,
              style: const TextStyle(color: AppTheme.foreground),
            ),
            const SizedBox(height: 16),

            // Live preview math calculations
            _buildCalculationsPreview(
              credits: int.tryParse(_creditsCtrl.text) ?? 1,
              bonus: int.tryParse(_bonusCtrl.text) ?? 0,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _loading ? null : () => _submit(context),
          child: _loading
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Create package'),
        ),
      ],
    );
  }

  Widget _buildCalculationsPreview({required int credits, required int bonus}) {
    final total = credits + bonus;
    final price = credits * 1900;
    final rate = total > 0 ? price / total : 0.0;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Automatic Calculations Preview'.toUpperCase(),
            style: const TextStyle(color: AppTheme.muted, fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),
          _buildPreviewRow('Total activities', '$total'),
          const SizedBox(height: 4),
          _buildPreviewRow('Client price (Locked)', '${price.toStringAsFixed(0)} DA'),
          const SizedBox(height: 4),
          _buildPreviewRow(
            'Effective rate',
            '${rate.toStringAsFixed(0)} DA / activity',
            valueColor: AppTheme.primary,
            bold: true,
          ),
        ],
      ),
    );
  }

  Widget _buildPreviewRow(String label, String val, {Color? valueColor, bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
        Text(
          val,
          style: TextStyle(
            color: valueColor ?? AppTheme.foreground,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}
