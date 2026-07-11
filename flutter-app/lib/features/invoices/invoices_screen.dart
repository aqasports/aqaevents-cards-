import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/invoice.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/badge_chip.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_shimmer.dart';

final invoicesProvider = FutureProvider.family<List<Invoice>, String>((ref, filter) async {
  final api = ref.read(apiClientProvider);
  final params = filter.isNotEmpty ? {'status': filter} : null;
  final res = await api.get(ApiConfig.invoices, params: params);
  final list = res.data as List<dynamic>;
  return list.map((e) => Invoice.fromJson(e as Map<String, dynamic>)).toList();
});

class InvoicesScreen extends ConsumerStatefulWidget {
  const InvoicesScreen({super.key});
  @override
  ConsumerState<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends ConsumerState<InvoicesScreen> {
  String _filter = '';

  @override
  Widget build(BuildContext context) {
    final invoices = ref.watch(invoicesProvider(_filter));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Invoices'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
            child: Row(
              children: [
                for (final f in [('All', ''), ('Pending', 'pending'), ('Paid', 'paid')])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(f.$1),
                      selected: _filter == f.$2,
                      onSelected: (_) => setState(() => _filter = f.$2),
                      selectedColor: AppTheme.primaryLight,
                      labelStyle: TextStyle(
                        color: _filter == f.$2 ? AppTheme.primary : AppTheme.muted,
                        fontWeight: FontWeight.w600,
                      ),
                      backgroundColor: AppTheme.surface2,
                      side: BorderSide(color: _filter == f.$2 ? AppTheme.primary : AppTheme.border),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
      body: invoices.when(
        loading: () => const ListLoadingShimmer(),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (list) {
          if (list.isEmpty) {
            return EmptyState(
              title: 'No invoices',
              subtitle: _filter.isNotEmpty ? 'No $_filter invoices found.' : null,
              icon: Icons.receipt_long_outlined,
            );
          }
          return RefreshIndicator(
            color: AppTheme.primary,
            backgroundColor: AppTheme.surface2,
            onRefresh: () => ref.refresh(invoicesProvider(_filter).future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _InvoiceTile(invoice: list[i]),
            ),
          );
        },
      ),
    );
  }
}

class _InvoiceTile extends StatelessWidget {
  final Invoice invoice;
  const _InvoiceTile({required this.invoice});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/invoices/${invoice.id}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface2,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: invoice.isPending ? AppTheme.warning.withOpacity(0.4) : AppTheme.border,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(invoice.invoiceCode, style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700, fontFamily: 'monospace', fontSize: 13)),
                  const SizedBox(height: 4),
                  Text(invoice.formattedAmount, style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w800, fontSize: 16)),
                  const SizedBox(height: 4),
                  Text('${invoice.createdAt.day}/${invoice.createdAt.month}/${invoice.createdAt.year}', style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
                ],
              ),
            ),
            BadgeChip.status(invoice.status),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right_rounded, color: AppTheme.muted, size: 18),
          ],
        ),
      ),
    );
  }
}
