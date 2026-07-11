// Stub - full implementation follows the same pattern
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class InvoiceDetailScreen extends StatelessWidget {
  final String invoiceId;
  const InvoiceDetailScreen({super.key, required this.invoiceId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Invoice Detail')),
      body: Center(child: Text('Invoice $invoiceId', style: const TextStyle(color: AppTheme.muted))),
    );
  }
}
