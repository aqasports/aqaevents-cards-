import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/client.dart';
import '../../core/models/ledger_entry.dart';
import '../../core/models/package.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/loading_shimmer.dart';

final clientDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.clientById(id));
  return res.data as Map<String, dynamic>;
});

final clientLedgerProvider = FutureProvider.family<List<LedgerEntry>, String>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.ledger, params: {'clientId': id});
  final list = res.data as List<dynamic>;
  return list.map((e) => LedgerEntry.fromJson(e as Map<String, dynamic>)).toList();
});

final packagesListProvider = FutureProvider<List<Package>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.packages);
  final list = res.data as List<dynamic>;
  return list.map((e) => Package.fromJson(e as Map<String, dynamic>)).where((p) => p.active).toList();
});

class ClientDetailScreen extends ConsumerWidget {
  final String clientId;
  const ClientDetailScreen({super.key, required this.clientId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(clientDetailProvider(clientId));
    return detail.when(
      loading: () => const Scaffold(
        backgroundColor: AppTheme.background,
        body: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      ),
      error: (e, _) => Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(title: const Text('Client')),
        body: Center(child: Text('Error: $e', style: const TextStyle(color: AppTheme.muted))),
      ),
      data: (data) {
        final client = Client.fromJson(data['client'] as Map<String, dynamic>? ?? data);
        final balance = (data['balance'] as num?)?.toDouble() ?? 0.0;
        return _ClientDetailView(client: client, balance: balance, clientId: clientId);
      },
    );
  }
}

class _ClientDetailView extends ConsumerStatefulWidget {
  final Client client;
  final double balance;
  final String clientId;
  const _ClientDetailView({required this.client, required this.balance, required this.clientId});

  @override
  ConsumerState<_ClientDetailView> createState() => _ClientDetailViewState();
}

class _ClientDetailViewState extends ConsumerState<_ClientDetailView> with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _showAddCreditsDialog() async {
    final packages = await ref.read(packagesListProvider.future);
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (ctx) => _AddCreditsSheet(clientId: widget.clientId, packages: packages, onSuccess: () {
        ref.refresh(clientDetailProvider(widget.clientId));
        ref.refresh(clientLedgerProvider(widget.clientId));
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ledger = ref.watch(clientLedgerProvider(widget.clientId));
    final client = widget.client;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(client.fullName),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_card_rounded),
            onPressed: _showAddCreditsDialog,
            tooltip: 'Add Credits',
          ),
        ],
      ),
      body: NestedScrollView(
        headerSliverBuilder: (_, __) => [
          SliverToBoxAdapter(
            child: Column(
              children: [
                // Client header card
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      // Balance hero
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [AppTheme.primary.withOpacity(0.15), AppTheme.surface2],
                          ),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
                        ),
                        child: Column(
                          children: [
                            Text('Available Balance', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppTheme.muted, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            Text(
                              '${widget.balance.toStringAsFixed(widget.balance % 1 == 0 ? 0 : 1)} credits',
                              style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                                    color: widget.balance > 0 ? AppTheme.success : AppTheme.muted,
                                    fontWeight: FontWeight.w900,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Info row
                      Row(
                        children: [
                          if (client.phone != null)
                            Expanded(child: _InfoChip(icon: Icons.phone_rounded, label: client.phone!, onTap: () => launchUrl(Uri.parse('tel:${client.phone}')))),
                          if (client.email != null) ...[
                            const SizedBox(width: 8),
                            Expanded(child: _InfoChip(icon: Icons.email_rounded, label: client.email!, onTap: () => launchUrl(Uri.parse('mailto:${client.email}')))),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                TabBar(
                  controller: _tabs,
                  indicatorColor: AppTheme.primary,
                  labelColor: AppTheme.primary,
                  unselectedLabelColor: AppTheme.muted,
                  tabs: const [Tab(text: 'Ledger'), Tab(text: 'Details')],
                ),
              ],
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabs,
          children: [
            // Ledger tab
            ledger.when(
              loading: () => const ListLoadingShimmer(itemCount: 5),
              error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
              data: (entries) => entries.isEmpty
                  ? const Center(child: Text('No ledger entries', style: TextStyle(color: AppTheme.muted)))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: entries.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) => _LedgerTile(entry: entries[i]),
                    ),
            ),
            // Details tab
            ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _DetailRow(label: 'Full Name', value: client.fullName),
                _DetailRow(label: 'Segment', value: client.customerSegment),
                if (client.leadSource != null) _DetailRow(label: 'Lead Source', value: client.leadSource!),
                if (client.favoriteActivity != null) _DetailRow(label: 'Fav. Activity', value: client.favoriteActivity!),
                if (client.notes != null) _DetailRow(label: 'Notes', value: client.notes!),
                _DetailRow(label: 'Joined', value: '${client.createdAt.day}/${client.createdAt.month}/${client.createdAt.year}'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  const _InfoChip({required this.icon, required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.surface2,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: AppTheme.primary),
            const SizedBox(width: 6),
            Flexible(child: Text(label, style: const TextStyle(color: AppTheme.foreground, fontSize: 12, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis)),
          ],
        ),
      ),
    );
  }
}

class _LedgerTile extends StatelessWidget {
  final LedgerEntry entry;
  const _LedgerTile({required this.entry});

  @override
  Widget build(BuildContext context) {
    final isCredit = entry.isCredit;
    final color = isCredit ? AppTheme.success : AppTheme.danger;
    final sign = isCredit ? '+' : '';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: color.withOpacity(0.12), shape: BoxShape.circle),
            child: Icon(isCredit ? Icons.add_rounded : Icons.remove_rounded, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entry.type.replaceAll('_', ' ').toLowerCase(), style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w600, fontSize: 13)),
                if (entry.reason != null)
                  Text(entry.reason!, style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
              ],
            ),
          ),
          Text('$sign${entry.delta}', style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 15)),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 120, child: Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 13))),
          Expanded(child: Text(value, style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w600, fontSize: 13))),
        ],
      ),
    );
  }
}

class _AddCreditsSheet extends ConsumerStatefulWidget {
  final String clientId;
  final List<Package> packages;
  final VoidCallback onSuccess;
  const _AddCreditsSheet({required this.clientId, required this.packages, required this.onSuccess});

  @override
  ConsumerState<_AddCreditsSheet> createState() => _AddCreditsSheetState();
}

class _AddCreditsSheetState extends ConsumerState<_AddCreditsSheet> {
  Package? _selectedPkg;
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    if (_selectedPkg == null) return;
    setState(() { _loading = true; _error = null; });
    try {
      final api = ref.read(apiClientProvider);
      await api.post(ApiConfig.clientCredits(widget.clientId), data: {
        'packageId': _selectedPkg!.id,
        'creditAmount': _selectedPkg!.totalCredits,
      });
      widget.onSuccess();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() { _error = 'Failed to add credits.'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 20, 16, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Add Credits', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800, color: AppTheme.foreground)),
          const SizedBox(height: 16),
          ...widget.packages.map((p) {
            final isSel = _selectedPkg?.id == p.id;
            return GestureDetector(
              onTap: () => setState(() => _selectedPkg = p),
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isSel ? AppTheme.primaryLight : AppTheme.surface2,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isSel ? AppTheme.primary : AppTheme.border),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(p.name, style: TextStyle(color: isSel ? AppTheme.primary : AppTheme.foreground, fontWeight: FontWeight.w700)),
                      Text('${p.totalCredits} credits', style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                    ]),
                    Text(p.formattedPrice, style: TextStyle(color: isSel ? AppTheme.primary : AppTheme.foreground, fontWeight: FontWeight.w800)),
                  ],
                ),
              ),
            );
          }),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: AppTheme.danger), textAlign: TextAlign.center),
          ],
          const SizedBox(height: 16),
          SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: (_selectedPkg != null && !_loading) ? _submit : null,
              child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Add Credits'),
            ),
          ),
        ],
      ),
    );
  }
}
