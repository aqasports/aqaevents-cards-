import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/client.dart';
import '../../core/models/ledger_entry.dart';
import '../../core/models/package.dart';
import '../../core/models/product.dart';
import '../../core/models/invoice.dart';
import '../../core/models/redemption.dart';
import '../../core/models/activity.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/loading_shimmer.dart';
import '../../shared/widgets/badge_chip.dart';

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

final clientInvoicesProvider = FutureProvider.family<List<Invoice>, String>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.invoices, params: {'clientId': id});
  final list = res.data as List<dynamic>;
  return list.map((e) => Invoice.fromJson(e as Map<String, dynamic>)).toList();
});

final clientRedemptionsProvider = FutureProvider.family<List<Redemption>, String>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.redemptions, params: {'clientId': id});
  final list = res.data as List<dynamic>;
  return list.map((e) => Redemption.fromJson(e as Map<String, dynamic>)).toList();
});

final clientNotificationsProvider = FutureProvider.family<List<dynamic>, String>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get('${ApiConfig.clientById(id)}/notifications');
  return res.data as List<dynamic>;
});

final clientNotPaidProvider = FutureProvider.family<bool, String>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get('${ApiConfig.clientById(id)}/not-paid');
  return (res.data as Map<String, dynamic>?)?['isNotPaid'] as bool? ?? false;
});

final activeActivitiesProvider = FutureProvider<List<Activity>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.activities, params: {'active': 'true'});
  final list = res.data as List<dynamic>;
  return list.map((e) => Activity.fromJson(e as Map<String, dynamic>)).where((a) => a.active).toList();
});

final clientProductsProvider = FutureProvider<List<Product>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.products);
  final list = res.data as List<dynamic>;
  return list.map((e) => Product.fromJson(e as Map<String, dynamic>)).where((p) => p.active).toList();
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
  bool _togglingNotPaid = false;
  bool _reissuing = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 6, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _showAddCreditsSheet() async {
    final packages = await ref.read(packagesListProvider.future);
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (ctx) => _AddCreditsSheet(
        clientId: widget.clientId,
        packages: packages,
        onSuccess: () {
          ref.refresh(clientDetailProvider(widget.clientId));
          ref.refresh(clientLedgerProvider(widget.clientId));
          ref.refresh(clientInvoicesProvider(widget.clientId));
        },
      ),
    );
  }

  Future<void> _toggleNotPaid(bool currentValue) async {
    setState(() => _togglingNotPaid = true);
    try {
      final api = ref.read(apiClientProvider);
      if (currentValue) {
        await api.delete('${ApiConfig.clientById(widget.clientId)}/not-paid');
      } else {
        await api.post('${ApiConfig.clientById(widget.clientId)}/not-paid');
      }
      ref.refresh(clientNotPaidProvider(widget.clientId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(currentValue ? 'Not Paid flag cleared' : 'Client flagged as Not Paid'),
          backgroundColor: AppTheme.success,
        ),
      );
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update Not Paid flag'), backgroundColor: AppTheme.danger),
      );
    } finally {
      setState(() => _togglingNotPaid = false);
    }
  }

  Future<void> _reissueCard() async {
    final codeCtrl = TextEditingController();
    String mode = 'auto';

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          backgroundColor: AppTheme.surface2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Reissue PVC Card', style: TextStyle(fontWeight: FontWeight.w800, color: AppTheme.foreground)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Deactivates the old card immediately and transfers all credits to the new card.',
                style: TextStyle(color: AppTheme.muted, fontSize: 12),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Radio<String>(
                    value: 'auto',
                    groupValue: mode,
                    onChanged: (val) => setDialogState(() => mode = val!),
                    activeColor: AppTheme.primary,
                  ),
                  const Text('Auto-Generate Code', style: TextStyle(color: AppTheme.foreground, fontSize: 13)),
                ],
              ),
              Row(
                children: [
                  Radio<String>(
                    value: 'preprinted',
                    groupValue: mode,
                    onChanged: (val) => setDialogState(() => mode = val!),
                    activeColor: AppTheme.primary,
                  ),
                  const Text('Preprinted Card Code', style: TextStyle(color: AppTheme.foreground, fontSize: 13)),
                ],
              ),
              if (mode == 'preprinted') ...[
                const SizedBox(height: 8),
                TextField(
                  controller: codeCtrl,
                  decoration: const InputDecoration(labelText: 'Card Code (e.g. AQA1029)'),
                  style: const TextStyle(color: AppTheme.foreground),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                final code = mode == 'preprinted' ? codeCtrl.text.trim().toUpperCase() : null;
                if (mode == 'preprinted' && (code == null || code.isEmpty)) return;
                Navigator.pop(ctx);
                setState(() => _reissuing = true);
                try {
                  final api = ref.read(apiClientProvider);
                  await api.post('${ApiConfig.clientById(widget.clientId)}/reissue-card', data: {
                    'newCardCode': code,
                  });
                  ref.refresh(clientDetailProvider(widget.clientId));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Card reissued successfully'), backgroundColor: AppTheme.success),
                  );
                } catch (_) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to reissue card'), backgroundColor: AppTheme.danger),
                  );
                } finally {
                  setState(() => _reissuing = false);
                }
              },
              child: const Text('Reissue'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final client = widget.client;
    final ledger = ref.watch(clientLedgerProvider(widget.clientId));
    final invoices = ref.watch(clientInvoicesProvider(widget.clientId));
    final redemptions = ref.watch(clientRedemptionsProvider(widget.clientId));
    final notifications = ref.watch(clientNotificationsProvider(widget.clientId));
    final notPaidVal = ref.watch(clientNotPaidProvider(widget.clientId));

    final activeCard = client.cards?.firstWhere((c) => c.isActive, orElse: () => const ClientCard(id: '', cardCode: '', isActive: false));
    final hasActiveCard = activeCard != null && activeCard.id.isNotEmpty;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(client.fullName),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_card_rounded),
            onPressed: _showAddCreditsSheet,
            tooltip: 'Add Credits',
          ),
        ],
      ),
      body: Stack(
        children: [
          NestedScrollView(
            headerSliverBuilder: (_, __) => [
              SliverToBoxAdapter(
                child: Column(
                  children: [
                    // Not Paid Warning Banner
                    notPaidVal.when(
                      data: (isNotPaid) => isNotPaid
                          ? Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              color: AppTheme.dangerBg,
                              child: const Row(
                                children: [
                                  Icon(Icons.warning_amber_rounded, color: AppTheme.danger, size: 20),
                                  SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'NOT PAID ALERT: Client portal is flagged, warning staff of outstanding payment.',
                                      style: TextStyle(color: AppTheme.danger, fontWeight: FontWeight.w700, fontSize: 12),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : const SizedBox.shrink(),
                      loading: () => const SizedBox.shrink(),
                      error: (_, __) => const SizedBox.shrink(),
                    ),

                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          // Balance Hero Card
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [AppTheme.primary.withOpacity(0.12), AppTheme.surface2],
                              ),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppTheme.primary.withOpacity(0.25)),
                            ),
                            child: Column(
                              children: [
                                const Text(
                                  'Available Balance',
                                  style: TextStyle(color: AppTheme.muted, fontWeight: FontWeight.w600, fontSize: 11),
                                ),
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
                          // Phone & Email Action Buttons
                          Row(
                            children: [
                              if (client.phone != null && client.phone!.trim().isNotEmpty)
                                Expanded(
                                  child: _InfoChip(
                                    icon: Icons.phone_rounded,
                                    label: client.phone!,
                                    onTap: () => launchUrl(Uri.parse('tel:${client.phone}')),
                                  ),
                                ),
                              if (client.email != null && client.email!.trim().isNotEmpty) ...[
                                if (client.phone != null && client.phone!.trim().isNotEmpty) const SizedBox(width: 8),
                                Expanded(
                                  child: _InfoChip(
                                    icon: Icons.email_rounded,
                                    label: client.email!,
                                    onTap: () => launchUrl(Uri.parse('mailto:${client.email}')),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    TabBar(
                      controller: _tabs,
                      isScrollable: true,
                      indicatorColor: AppTheme.primary,
                      labelColor: AppTheme.primary,
                      unselectedLabelColor: AppTheme.muted,
                      tabs: const [
                        Tab(text: 'Overview'),
                        Tab(text: 'Ledger'),
                        Tab(text: 'Invoices'),
                        Tab(text: 'Store'),
                        Tab(text: 'Activities'),
                        Tab(text: 'Notifications'),
                      ],
                    ),
                  ],
                ),
              ),
            ],
            body: TabBarView(
              controller: _tabs,
              children: [
                // Overview Tab
                _buildOverviewTab(hasActiveCard, activeCard, notPaidVal.valueOrNull ?? false),
                // Ledger Tab
                _buildLedgerTab(ledger),
                // Invoices Tab
                _buildInvoicesTab(invoices),
                // Store Tab
                _buildStoreTab(),
                // Activities Tab
                _buildActivitiesTab(redemptions),
                // Notifications Tab
                _buildNotificationsTab(notifications),
              ],
            ),
          ),
          if (_togglingNotPaid || _reissuing)
            Container(
              color: Colors.black38,
              child: const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
            ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(bool hasCard, ClientCard? card, bool isNotPaid) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // PVC Card Layout Block
        if (hasCard) ...[
          Container(
            height: 180,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1E1E2A), Color(0xFF13131A)],
              ),
              boxShadow: [
                BoxShadow(color: AppTheme.primary.withOpacity(0.08), blurRadius: 16, offset: const Offset(0, 4)),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('AQA SPORTS', style: TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.5)),
                          Text('OUTDOOR EVENTS CARD', style: TextStyle(color: AppTheme.muted, fontSize: 8, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            card!.cardCode,
                            style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w800, fontSize: 16, fontFamily: 'monospace', letterSpacing: 1.2),
                          ),
                          const SizedBox(height: 4),
                          const Row(
                            children: [
                              Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 12),
                              SizedBox(width: 4),
                              Text('Active PVC Token', style: TextStyle(color: AppTheme.success, fontWeight: FontWeight.w700, fontSize: 9)),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (card.qrToken != null)
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                    child: QrImageView(
                      data: '${ApiConfig.baseUrl}/eventscard/${card.qrToken}',
                      version: QrVersions.auto,
                      size: 100.0,
                      gapless: false,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _reissueCard,
            icon: const Icon(Icons.autorenew_rounded, size: 16),
            label: const Text('Reissue Card'),
          ),
        ] else ...[
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppTheme.surface2,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border, style: BorderStyle.solid),
            ),
            child: Column(
              children: [
                const Icon(Icons.credit_card_off_rounded, color: AppTheme.muted, size: 40),
                const SizedBox(height: 10),
                const Text('No active card linked', style: TextStyle(color: AppTheme.muted, fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 12),
                ElevatedButton(onPressed: _reissueCard, child: const Text('Issue New Card')),
              ],
            ),
          ),
        ],

        const SizedBox(height: 24),
        const Divider(),
        const SizedBox(height: 16),

        // CRM Details list
        _DetailRow(label: 'Segment', value: widget.client.customerSegment),
        _DetailRow(label: 'Lead Source', value: widget.client.leadSource ?? 'Unknown'),
        _DetailRow(label: 'Fav. Activity', value: widget.client.favoriteActivity ?? 'None'),
        _DetailRow(label: 'Joined', value: '${widget.client.createdAt.day}/${widget.client.createdAt.month}/${widget.client.createdAt.year}'),
        _DetailRow(label: 'Notes', value: widget.client.notes ?? 'No notes provided.'),

        const SizedBox(height: 16),
        const Divider(),
        const SizedBox(height: 16),

        // Not Paid flag Switch Tile
        SwitchListTile(
          title: const Text('Flag Client as "Not Paid"', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.foreground, fontSize: 13)),
          subtitle: const Text('Locks portal or alerts staff during event attendance.', style: TextStyle(color: AppTheme.muted, fontSize: 11)),
          value: isNotPaid,
          activeColor: AppTheme.danger,
          onChanged: _togglingNotPaid ? null : (_) => _toggleNotPaid(isNotPaid),
        ),
      ],
    );
  }

  Widget _buildLedgerTab(AsyncValue<List<LedgerEntry>> ledger) {
    return ledger.when(
      loading: () => const ListLoadingShimmer(itemCount: 4),
      error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
      data: (entries) => entries.isEmpty
          ? const Center(child: Text('No transactions recorded', style: TextStyle(color: AppTheme.muted)))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: entries.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (ctx, i) {
                final entry = entries[i];
                final isCredit = entry.isCredit;
                final color = isCredit ? AppTheme.success : AppTheme.danger;

                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppTheme.surface2,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(color: color.withOpacity(0.12), shape: BoxShape.circle),
                        child: Icon(isCredit ? Icons.add_rounded : Icons.remove_rounded, color: color, size: 18),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              entry.type.replaceAll('_', ' ').toLowerCase(),
                              style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w700, fontSize: 13),
                            ),
                            if (entry.reason != null && entry.reason!.isNotEmpty) ...[
                              const SizedBox(height: 3),
                              Text(entry.reason!, style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
                            ],
                            const SizedBox(height: 4),
                            Text(
                              '${entry.createdAt.day}/${entry.createdAt.month}/${entry.createdAt.year}',
                              style: const TextStyle(color: AppTheme.muted, fontSize: 10),
                            ),
                          ],
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${isCredit ? '+' : ''}${entry.delta.toStringAsFixed(0)}',
                            style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 15),
                          ),
                          const SizedBox(width: 8),
                          PopupMenuButton<String>(
                            icon: const Icon(Icons.more_vert_rounded, size: 18, color: AppTheme.muted),
                            onSelected: (action) {
                              if (action == 'edit') {
                                _editLedger(entry);
                              } else if (action == 'delete') {
                                _deleteLedger(entry);
                              }
                            },
                            itemBuilder: (context) => [
                              const PopupMenuItem(value: 'edit', child: Text('Edit Reason/Delta')),
                              const PopupMenuItem(value: 'delete', child: Text('Delete Entry')),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }

  Future<void> _editLedger(LedgerEntry entry) async {
    final reasonCtrl = TextEditingController(text: entry.reason ?? '');
    final deltaCtrl = TextEditingController(text: entry.delta.toStringAsFixed(0));

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface2,
        title: const Text('Edit Ledger Entry', style: TextStyle(fontWeight: FontWeight.w800)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: deltaCtrl, decoration: const InputDecoration(labelText: 'Credit Delta'), keyboardType: TextInputType.number),
            const SizedBox(height: 10),
            TextField(controller: reasonCtrl, decoration: const InputDecoration(labelText: 'Adjustment Reason')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final newDelta = double.tryParse(deltaCtrl.text) ?? entry.delta;
              final newReason = reasonCtrl.text.trim();
              Navigator.pop(ctx);
              setState(() => _reissuing = true); // use local screen loading spinner
              try {
                final api = ref.read(apiClientProvider);
                await api.patch('${ApiConfig.ledger}/${entry.id}', data: {
                  'delta': newDelta,
                  'reason': newReason,
                });
                ref.refresh(clientDetailProvider(widget.clientId));
                ref.refresh(clientLedgerProvider(widget.clientId));
              } catch (_) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Failed to update ledger entry'), backgroundColor: AppTheme.danger),
                );
              } finally {
                setState(() => _reissuing = false);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteLedger(LedgerEntry entry) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface2,
        title: const Text('Delete entry?', style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text('This will permanently delete the transaction record and alter the client\'s balance.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _reissuing = true);
      try {
        final api = ref.read(apiClientProvider);
        await api.delete('${ApiConfig.ledger}/${entry.id}');
        ref.refresh(clientDetailProvider(widget.clientId));
        ref.refresh(clientLedgerProvider(widget.clientId));
      } catch (_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete ledger entry'), backgroundColor: AppTheme.danger),
        );
      } finally {
        setState(() => _reissuing = false);
      }
    }
  }

  Widget _buildInvoicesTab(AsyncValue<List<Invoice>> invoices) {
    return invoices.when(
      loading: () => const ListLoadingShimmer(itemCount: 4),
      error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
      data: (list) => list.isEmpty
          ? const Center(child: Text('No invoices recorded', style: TextStyle(color: AppTheme.muted)))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (ctx, i) {
                final inv = list[i];
                return GestureDetector(
                  onTap: () => context.go('/invoices/${inv.id}'),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.surface2,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(inv.invoiceCode, style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                              const SizedBox(height: 4),
                              Text(inv.formattedAmount, style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w800)),
                              const SizedBox(height: 4),
                              Text(inv.items ?? '', style: const TextStyle(color: AppTheme.muted, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                            ],
                          ),
                        ),
                        BadgeChip.status(inv.status),
                        const SizedBox(width: 8),
                        const Icon(Icons.chevron_right_rounded, color: AppTheme.muted, size: 16),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  Widget _buildStoreTab() {
    final packages = ref.watch(packagesListProvider);
    final products = ref.watch(clientProductsProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Configure storefront transactions or purchase on credit.', style: TextStyle(color: AppTheme.muted, fontSize: 11)),
        const SizedBox(height: 16),

        // Packages Storefront
        Text('Credit Packages'.toUpperCase(), style: const TextStyle(color: AppTheme.muted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
        const SizedBox(height: 10),
        packages.when(
          loading: () => const SizedBox(height: 60, child: Center(child: CircularProgressIndicator())),
          error: (e, _) => Text('$e', style: const TextStyle(color: AppTheme.danger)),
          data: (pList) => Column(
            children: pList.map((p) => _buildStorePackageRow(p)).toList(),
          ),
        ),
        const SizedBox(height: 24),

        // Products Storefront
        Text('Ad-hoc Products'.toUpperCase(), style: const TextStyle(color: AppTheme.muted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
        const SizedBox(height: 10),
        products.when(
          loading: () => const SizedBox(height: 60, child: Center(child: CircularProgressIndicator())),
          error: (e, _) => Text('$e', style: const TextStyle(color: AppTheme.danger)),
          data: (prodList) => prodList.isEmpty
              ? const Text('No products available.', style: TextStyle(color: AppTheme.muted, fontSize: 12))
              : Column(
                  children: prodList.map((product) => _buildStoreProductRow(product)).toList(),
                ),
        ),
      ],
    );
  }

  Widget _buildStorePackageRow(Package p) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(p.name, style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w800)),
                  Text('${p.totalCredits} credits · ${p.formattedPrice}', style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _buyPackage(p, 'unpaid'),
                  child: const Text('On Credit', style: TextStyle(fontSize: 12)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => _buyPackage(p, 'paid'),
                  child: const Text('Buy (Paid)', style: TextStyle(fontSize: 12)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStoreProductRow(Product product) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w800)),
                  Text(product.formattedPrice, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _buyProduct(product, 'unpaid'),
                  child: const Text('On Credit', style: TextStyle(fontSize: 12)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => _buyProduct(product, 'paid'),
                  child: const Text('Buy (Paid)', style: TextStyle(fontSize: 12)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _buyPackage(Package p, String status) async {
    setState(() => _reissuing = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post(ApiConfig.clientCredits(widget.clientId), data: {
        'packageId': p.id,
        'reason': 'Store Purchase: ${p.name} (${status == 'paid' ? 'Paid' : 'On Credit'})',
        'invoice': {
          'amount': p.price,
          'category': 'package',
          'items': '${p.name} Package — ${p.creditAmount} credits + ${p.bonusCredits} bonus (${p.totalCredits} total)',
          'notes': status == 'unpaid' ? 'Purchased on credit (Unpaid)' : 'Paid at storefront',
          'status': status,
        },
      });
      ref.refresh(clientDetailProvider(widget.clientId));
      ref.refresh(clientLedgerProvider(widget.clientId));
      ref.refresh(clientInvoicesProvider(widget.clientId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Purchased package ${p.name} successfully'), backgroundColor: AppTheme.success),
      );
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to purchase package'), backgroundColor: AppTheme.danger),
      );
    } finally {
      setState(() => _reissuing = false);
    }
  }

  Future<void> _buyProduct(Product p, String status) async {
    setState(() => _reissuing = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post(ApiConfig.invoices, data: {
        'clientId': widget.clientId,
        'amount': p.price,
        'category': 'adhoc',
        'items': 'Product: ${p.name}',
        'notes': status == 'unpaid' ? 'Product bought on credit' : 'Product purchased at storefront',
        'status': status,
      });
      ref.refresh(clientDetailProvider(widget.clientId));
      ref.refresh(clientInvoicesProvider(widget.clientId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Purchased product ${p.name} successfully'), backgroundColor: AppTheme.success),
      );
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to purchase product'), backgroundColor: AppTheme.danger),
      );
    } finally {
      setState(() => _reissuing = false);
    }
  }

  Widget _buildActivitiesTab(AsyncValue<List<Redemption>> redemptions) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Redeem activity directly
        _RedeemActivityForm(
          clientId: widget.clientId,
          onRedeem: () {
            ref.refresh(clientDetailProvider(widget.clientId));
            ref.refresh(clientLedgerProvider(widget.clientId));
            ref.refresh(clientRedemptionsProvider(widget.clientId));
          },
        ),

        const SizedBox(height: 24),
        Text('Redemption History'.toUpperCase(), style: const TextStyle(color: AppTheme.muted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
        const SizedBox(height: 10),

        redemptions.when(
          loading: () => const SizedBox(height: 60, child: Center(child: CircularProgressIndicator())),
          error: (e, _) => Text('$e', style: const TextStyle(color: AppTheme.danger)),
          data: (list) => list.isEmpty
              ? const Text('No activities redeemed yet.', style: TextStyle(color: AppTheme.muted, fontSize: 12))
              : Column(
                  children: list.map((red) => _buildRedemptionRow(red)).toList(),
                ),
        ),
      ],
    );
  }

  Widget _buildRedemptionRow(Redemption red) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(red.activity?.name ?? 'Redeemed Activity', style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w700)),
                if (red.session?.location != null || red.session?.sessionDate != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    '${red.session?.location ?? ''} - ${red.session?.sessionDate != null ? '${red.session!.sessionDate.day}/${red.session!.sessionDate.month}' : ''}',
                    style: const TextStyle(color: AppTheme.muted, fontSize: 11),
                  ),
                ],
                if (red.notes != null && red.notes!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(red.notes!, style: const TextStyle(color: AppTheme.muted, fontSize: 11, fontStyle: FontStyle.italic)),
                ],
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('-${red.creditsUsed.toStringAsFixed(0)} cr', style: const TextStyle(color: AppTheme.danger, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              TextButton(
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.danger,
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: () => _refundRedemption(red),
                child: const Text('Refund', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _refundRedemption(Redemption red) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface2,
        title: const Text('Refund redemption?', style: TextStyle(fontWeight: FontWeight.w800)),
        content: Text('Refund redemption for ${red.activity?.name ?? 'Activity'}? This cancels the entry and returns ${red.creditsUsed.toStringAsFixed(0)} credits to the client\'s balance.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Refund'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _reissuing = true);
      try {
        final api = ref.read(apiClientProvider);
        await api.delete('${ApiConfig.redemptions}/${red.id}');
        ref.refresh(clientDetailProvider(widget.clientId));
        ref.refresh(clientLedgerProvider(widget.clientId));
        ref.refresh(clientRedemptionsProvider(widget.clientId));
      } catch (_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to refund redemption'), backgroundColor: AppTheme.danger),
        );
      } finally {
        setState(() => _reissuing = false);
      }
    }
  }

  Widget _buildNotificationsTab(AsyncValue<List<dynamic>> notifications) {
    return notifications.when(
      loading: () => const ListLoadingShimmer(itemCount: 3),
      error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
      data: (list) => list.isEmpty
          ? const Center(child: Text('No notifications sent yet.', style: TextStyle(color: AppTheme.muted)))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (ctx, i) {
                final notif = list[i];
                final date = DateTime.tryParse(notif['createdAt'] as String? ?? '') ?? DateTime.now();

                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppTheme.surface2, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(notif['message'] as String? ?? 'Notification', style: const TextStyle(color: AppTheme.foreground, fontSize: 13, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 6),
                      Text('${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}', style: const TextStyle(color: AppTheme.muted, fontSize: 10)),
                    ],
                  ),
                );
              },
            ),
    );
  }
}

class _RedeemActivityForm extends ConsumerStatefulWidget {
  final String clientId;
  final VoidCallback onRedeem;
  const _RedeemActivityForm({required this.clientId, required this.onRedeem});

  @override
  ConsumerState<_RedeemActivityForm> createState() => _RedeemActivityFormState();
}

class _RedeemActivityFormState extends ConsumerState<_RedeemActivityForm> {
  Activity? _selectedActivity;
  ActivitySession? _selectedSession;
  final _notesCtrl = TextEditingController();
  final _creditsUsedCtrl = TextEditingController(text: '1');
  bool _loading = false;

  @override
  void dispose() {
    _notesCtrl.dispose();
    _creditsUsedCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedActivity == null) return;
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final creds = double.tryParse(_creditsUsedCtrl.text) ?? 1.0;

      await api.post(ApiConfig.redemptions, data: {
        'clientId': widget.clientId,
        'activityId': _selectedActivity!.id,
        'sessionId': _selectedSession?.id,
        'notes': _notesCtrl.text.trim(),
        'creditsUsed': creds,
      });

      _notesCtrl.clear();
      _creditsUsedCtrl.text = '1';
      setState(() {
        _selectedActivity = null;
        _selectedSession = null;
      });
      widget.onRedeem();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Activity redeemed successfully'), backgroundColor: AppTheme.success),
      );
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to redeem activity'), backgroundColor: AppTheme.danger),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final activities = ref.watch(activeActivitiesProvider);

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
          const Text('Redeem Activity Session', style: TextStyle(fontWeight: FontWeight.w800, color: AppTheme.foreground)),
          const SizedBox(height: 14),

          // Dropdown active activities
          activities.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('$e', style: const TextStyle(color: AppTheme.danger)),
            data: (list) => DropdownButtonFormField<Activity>(
              value: _selectedActivity,
              dropdownColor: AppTheme.surface2,
              decoration: const InputDecoration(labelText: 'Select Activity'),
              items: list.map((a) => DropdownMenuItem(value: a, child: Text('${a.name} (${a.creditCost} cr)', style: const TextStyle(color: AppTheme.foreground)))).toList(),
              onChanged: (val) {
                setState(() {
                  _selectedActivity = val;
                  _selectedSession = null;
                  if (val != null) {
                    _creditsUsedCtrl.text = val.creditCost.toString();
                  }
                });
              },
            ),
          ),

          if (_selectedActivity?.sessions?.isNotEmpty == true) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<ActivitySession>(
              value: _selectedSession,
              dropdownColor: AppTheme.surface2,
              decoration: const InputDecoration(labelText: 'Select Session (Optional)'),
              items: _selectedActivity!.sessions!.map((s) {
                return DropdownMenuItem(
                  value: s,
                  child: Text(
                    '${s.sessionDate.day}/${s.sessionDate.month} - ${s.location ?? 'No location'}',
                    style: const TextStyle(color: AppTheme.foreground, fontSize: 13),
                  ),
                );
              }).toList(),
              onChanged: (val) => setState(() => _selectedSession = val),
            ),
          ],

          const SizedBox(height: 12),
          TextField(controller: _creditsUsedCtrl, decoration: const InputDecoration(labelText: 'Credits to Use'), keyboardType: TextInputType.number, style: const TextStyle(color: AppTheme.foreground)),
          const SizedBox(height: 12),
          TextField(controller: _notesCtrl, decoration: const InputDecoration(labelText: 'Redemption Notes (e.g. wet weather)'), style: const TextStyle(color: AppTheme.foreground)),
          const SizedBox(height: 16),

          ElevatedButton(
            onPressed: (_selectedActivity != null && !_loading) ? _submit : null,
            child: _loading
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Confirm Redemption'),
          ),
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
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 12, fontWeight: FontWeight.w600))),
          Expanded(child: Text(value, style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w600, fontSize: 12))),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _InfoChip({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          decoration: BoxDecoration(color: AppTheme.surface2, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: AppTheme.primary),
              const SizedBox(width: 6),
              Flexible(child: Text(label, style: const TextStyle(color: AppTheme.foreground, fontSize: 11, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis)),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddCreditsSheet extends StatefulWidget {
  final String clientId;
  final List<Package> packages;
  final VoidCallback onSuccess;
  const _AddCreditsSheet({required this.clientId, required this.packages, required this.onSuccess});

  @override
  State<_AddCreditsSheet> createState() => _AddCreditsSheetState();
}

class _AddCreditsSheetState extends State<_AddCreditsSheet> {
  String _mode = 'package'; // package, money, manual
  Package? _selectedPkg;
  bool _loading = false;
  String? _error;

  // Money mode controllers & calculations
  final _moneyCtrl = TextEditingController();
  final _moneyReasonCtrl = TextEditingController();
  int _moneyBase = 0;
  int _moneyBonus = 0;
  String _changeOption = 'refund'; // refund, convert

  // Manual mode controllers
  final _manualCreditsCtrl = TextEditingController();
  final _manualReasonCtrl = TextEditingController();
  final _manualPricePaidCtrl = TextEditingController(text: '0');

  @override
  void dispose() {
    _moneyCtrl.dispose();
    _moneyReasonCtrl.dispose();
    _manualCreditsCtrl.dispose();
    _manualReasonCtrl.dispose();
    _manualPricePaidCtrl.dispose();
    super.dispose();
  }

  void _calculateMoneyCredits(String value) {
    final parsed = int.tryParse(value) ?? 0;
    final base = parsed ~/ 1900;
    int bonus = 0;
    if (base >= 50) {
      bonus = 17;
    } else if (base >= 30) {
      bonus = 9;
    } else if (base >= 20) {
      bonus = 5;
    } else if (base >= 10) {
      bonus = 2;
    } else if (base >= 7) {
      bonus = 1;
    }
    setState(() {
      _moneyBase = base;
      _moneyBonus = bonus;
    });
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final api = ApiClient();
      if (_mode == 'package') {
        if (_selectedPkg == null) throw Exception('No package selected');
        await api.post(ApiConfig.clientCredits(widget.clientId), data: {
          'packageId': _selectedPkg!.id,
          'reason': 'Package: ${_selectedPkg!.name} (${_selectedPkg!.creditAmount} paid + ${_selectedPkg!.bonusCredits} bonus) - Paid: ${_selectedPkg!.price} DA',
          'invoice': {
            'amount': _selectedPkg!.price,
            'category': 'package',
            'items': '${_selectedPkg!.name} Package — ${_selectedPkg!.creditAmount} credits + ${_selectedPkg!.bonusCredits} bonus (${_selectedPkg!.totalCredits} total)',
            'status': 'paid',
          },
        });
      } else if (_mode == 'money') {
        final rawMoney = int.tryParse(_moneyCtrl.text) ?? 0;
        if (rawMoney <= 0) throw Exception('Invalid cash amount');
        final change = rawMoney % 1900;
        final hasChange = change > 0;
        final isConvert = hasChange && _changeOption == 'convert';

        final total = _moneyBase + _moneyBonus + (isConvert ? 1 : 0);
        if (total <= 0) throw Exception('No credits computed from cash');

        final changeInfo = hasChange ? (isConvert ? ' + 1 rest; change of $change DA converted' : '; change of $change DA refunded') : '';
        final reason = _moneyReasonCtrl.text.trim();
        final computedReason = reason.isNotEmpty
            ? 'Payment: $rawMoney DA ($_moneyBase paid + $_moneyBonus bonus$changeInfo) - $reason'
            : 'Payment: $rawMoney DA ($_moneyBase paid + $_moneyBonus bonus$changeInfo)';

        await api.post(ApiConfig.clientCredits(widget.clientId), data: {
          'customAmount': total,
          'reason': computedReason,
          'invoice': {
            'amount': rawMoney,
            'category': 'custom',
            'items': 'Custom recharge — $_moneyBase paid + $_moneyBonus bonus${isConvert ? ' + 1 rest' : ''} = $total credits',
            'notes': reason.isNotEmpty ? reason : (hasChange ? 'Change: $change DA ${isConvert ? 'converted' : 'refunded'}' : null),
            'status': 'paid',
          },
        });
      } else if (_mode == 'manual') {
        final amount = int.tryParse(_manualCreditsCtrl.text) ?? 0;
        final reason = _manualReasonCtrl.text.trim();
        final pricePaid = int.tryParse(_manualPricePaidCtrl.text) ?? 0;

        if (amount == 0 || reason.isEmpty) throw Exception('Invalid amount or reason');

        await api.post(ApiConfig.clientCredits(widget.clientId), data: {
          'customAmount': amount,
          'reason': pricePaid > 0 ? '$reason - Paid: $pricePaid DA' : reason,
          if (pricePaid > 0)
            'invoice': {
              'amount': pricePaid,
              'category': 'adhoc',
              'items': reason,
              'status': 'paid',
            },
        });
      }

      widget.onSuccess();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception:', '');
        _loading = false;
      });
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Recharge / Adjust Balance', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800, color: AppTheme.foreground)),
              DropdownButton<String>(
                value: _mode,
                dropdownColor: AppTheme.surface,
                icon: const Icon(Icons.arrow_drop_down_rounded, color: AppTheme.primary),
                underline: const SizedBox.shrink(),
                items: const [
                  DropdownMenuItem(value: 'package', child: Text('Package purchase', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700))),
                  DropdownMenuItem(value: 'money', child: Text('Money payment', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700))),
                  DropdownMenuItem(value: 'manual', child: Text('Manual adjust', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700))),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _mode = val);
                },
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Render inputs depending on mode
          if (_mode == 'package') _buildPackageModeInput(),
          if (_mode == 'money') _buildMoneyModeInput(),
          if (_mode == 'manual') _buildManualModeInput(),

          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: AppTheme.danger, fontSize: 12, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
          ],
          const SizedBox(height: 20),
          SizedBox(
            height: 48,
            child: ElevatedButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Add Credits'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPackageModeInput() {
    return Column(
      children: widget.packages.map((p) {
        final isSel = _selectedPkg?.id == p.id;
        return GestureDetector(
          onTap: () => setState(() => _selectedPkg = p),
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
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
                  Text('${p.totalCredits} credits (${p.creditAmount} + ${p.bonusCredits} bonus)', style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
                ]),
                Text(p.formattedPrice, style: TextStyle(color: isSel ? AppTheme.primary : AppTheme.foreground, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildMoneyModeInput() {
    final rawMoney = int.tryParse(_moneyCtrl.text) ?? 0;
    final change = rawMoney % 1900;
    final hasChange = change > 0;
    final isConvert = hasChange && _changeOption == 'convert';
    final total = _moneyBase + _moneyBonus + (isConvert ? 1 : 0);

    return Column(
      children: [
        TextField(
          controller: _moneyCtrl,
          decoration: const InputDecoration(labelText: 'Cash Received (DA)', hintText: 'e.g. 20000'),
          keyboardType: TextInputType.number,
          style: const TextStyle(color: AppTheme.foreground),
          onChanged: _calculateMoneyCredits,
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _moneyReasonCtrl,
          decoration: const InputDecoration(labelText: 'Custom Note (Optional)'),
          style: const TextStyle(color: AppTheme.foreground),
        ),
        if (hasChange) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppTheme.warningBg, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppTheme.warning.withOpacity(0.3))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Change (Rest): $change DA', style: const TextStyle(color: AppTheme.warning, fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Radio<String>(
                      value: 'refund',
                      groupValue: _changeOption,
                      onChanged: (val) => setState(() => _changeOption = val!),
                      activeColor: AppTheme.warning,
                    ),
                    const Text('Refund change (Cash)', style: TextStyle(color: AppTheme.foreground, fontSize: 12)),
                  ],
                ),
                Row(
                  children: [
                    Radio<String>(
                      value: 'convert',
                      groupValue: _changeOption,
                      onChanged: (val) => setState(() => _changeOption = val!),
                      activeColor: AppTheme.warning,
                    ),
                    const Text('Convert to 1 credit (+1 Rest)', style: TextStyle(color: AppTheme.foreground, fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppTheme.surface2, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppTheme.border)),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Computed Credits:', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
              Text(
                '$_moneyBase base + $_moneyBonus bonus${isConvert ? ' + 1 rest' : ''} = $total cr',
                style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w800, fontSize: 12),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildManualModeInput() {
    return Column(
      children: [
        TextField(
          controller: _manualCreditsCtrl,
          decoration: const InputDecoration(labelText: 'Credits Delta (+N / -N)', hintText: 'e.g. 5 or -2'),
          keyboardType: const TextInputType.numberWithOptions(signed: true),
          style: const TextStyle(color: AppTheme.foreground),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _manualReasonCtrl,
          decoration: const InputDecoration(labelText: 'Adjustment Reason (Required)', hintText: 'e.g. Manager courtesy adjustment'),
          style: const TextStyle(color: AppTheme.foreground),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _manualPricePaidCtrl,
          decoration: const InputDecoration(labelText: 'Amount Paid in DA (Optional)', hintText: '0'),
          keyboardType: TextInputType.number,
          style: const TextStyle(color: AppTheme.foreground),
        ),
      ],
    );
  }
}
