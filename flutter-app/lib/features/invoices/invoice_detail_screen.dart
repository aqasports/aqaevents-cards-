import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/invoice.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/badge_chip.dart';

final invoiceDetailProvider = FutureProvider.family<Invoice, String>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.invoiceById(id));
  return Invoice.fromJson(res.data as Map<String, dynamic>);
});

class InvoiceDetailScreen extends ConsumerStatefulWidget {
  final String invoiceId;
  const InvoiceDetailScreen({super.key, required this.invoiceId});

  @override
  ConsumerState<InvoiceDetailScreen> createState() => _InvoiceDetailScreenState();
}

class _InvoiceDetailScreenState extends ConsumerState<InvoiceDetailScreen> {
  bool _loading = false;

  Future<void> _updateStatus(String status) async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch(ApiConfig.invoiceById(widget.invoiceId), data: {'status': status});
      ref.refresh(invoiceDetailProvider(widget.invoiceId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Invoice marked as $status'), backgroundColor: AppTheme.success),
      );
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update invoice status'), backgroundColor: AppTheme.danger),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _deleteInvoice() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface2,
        title: const Text('Delete invoice?', style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text('Are you sure you want to delete this invoice? This will permanently remove the record from the system.'),
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
      setState(() => _loading = true);
      try {
        final api = ref.read(apiClientProvider);
        await api.delete(ApiConfig.invoiceById(widget.invoiceId));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Invoice deleted successfully'), backgroundColor: AppTheme.success),
          );
          context.pop();
        }
      } catch (_) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete invoice'), backgroundColor: AppTheme.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final invoiceVal = ref.watch(invoiceDetailProvider(widget.invoiceId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Invoice Detail'),
      ),
      body: Stack(
        children: [
          invoiceVal.when(
            loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
            error: (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: AppTheme.muted))),
            data: (inv) => ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Top Info Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppTheme.surface2,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            inv.invoiceCode,
                            style: const TextStyle(
                              color: AppTheme.primary,
                              fontWeight: FontWeight.w900,
                              fontFamily: 'monospace',
                              fontSize: 15,
                              letterSpacing: 1.0,
                            ),
                          ),
                          BadgeChip.status(inv.status),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        inv.formattedAmount,
                        style: const TextStyle(
                          color: AppTheme.foreground,
                          fontWeight: FontWeight.w900,
                          fontSize: 26,
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Divider(),
                      const SizedBox(height: 10),
                      _buildRow('Client', inv.clientName ?? 'Unknown Client'),
                      _buildRow('Category', inv.category?.replaceAll('_', ' ').toLowerCase() ?? 'General'),
                      _buildRow('Date', '${inv.createdAt.day}/${inv.createdAt.month}/${inv.createdAt.year}'),
                    ],
                  ),
                ),

                const SizedBox(height: 20),
                Text('Items Details'.toUpperCase(), style: const TextStyle(color: AppTheme.muted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                const SizedBox(height: 8),

                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.surface2,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Text(
                    inv.items ?? 'No item description available.',
                    style: const TextStyle(color: AppTheme.foreground, fontSize: 13, height: 1.4),
                  ),
                ),

                if (inv.notes != null && inv.notes!.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text('Admin Notes'.toUpperCase(), style: const TextStyle(color: AppTheme.muted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.surface2,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Text(
                      inv.notes!,
                      style: const TextStyle(color: AppTheme.muted, fontSize: 13, height: 1.4, fontStyle: FontStyle.italic),
                    ),
                  ),
                ],

                const SizedBox(height: 32),
                const Divider(),
                const SizedBox(height: 20),

                // Status adjustment actions
                Row(
                  children: [
                    if (inv.status != 'paid')
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _loading ? null : () => _updateStatus('paid'),
                          child: const Text('Mark Paid', style: TextStyle(fontSize: 12)),
                        ),
                      ),
                    if (inv.status == 'paid')
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _loading ? null : () => _updateStatus('unpaid'),
                          child: const Text('Mark Unpaid', style: TextStyle(fontSize: 12)),
                        ),
                      ),
                    const SizedBox(width: 8),
                    if (inv.status != 'refunded')
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _loading ? null : () => _updateStatus('refunded'),
                          child: const Text('Refund', style: TextStyle(fontSize: 12)),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(foregroundColor: AppTheme.danger, side: const BorderSide(color: AppTheme.dangerBg)),
                  onPressed: _loading ? null : _deleteInvoice,
                  icon: const Icon(Icons.delete_forever_rounded, size: 16),
                  label: const Text('Delete Invoice'),
                ),
              ],
            ),
          ),
          if (_loading)
            Container(
              color: Colors.black26,
              child: const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
            ),
        ],
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
          Text(value, style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w600, fontSize: 12)),
        ],
      ),
    );
  }
}
