import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/loading_shimmer.dart';

final reportsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.reportsSummary);
  return (res.data as Map<String, dynamic>?) ?? {};
});

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(reportsProvider);
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Reports')),
      body: RefreshIndicator(
        color: AppTheme.primary,
        backgroundColor: AppTheme.surface2,
        onRefresh: () => ref.refresh(reportsProvider.future),
        child: data.when(
          loading: () => const Padding(padding: EdgeInsets.all(16), child: Column(children: [LoadingShimmer(height: 200), SizedBox(height: 16), LoadingShimmer(height: 150)])),
          error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
          data: (summary) => _ReportsContent(summary: summary),
        ),
      ),
    );
  }
}

class _ReportsContent extends StatelessWidget {
  final Map<String, dynamic> summary;
  const _ReportsContent({required this.summary});

  @override
  Widget build(BuildContext context) {
    final totalClients = (summary['totalClients'] as num?)?.toInt() ?? 0;
    final totalRedemptions = (summary['totalRedemptions'] as num?)?.toInt() ?? 0;
    final totalRevenue = (summary['totalRevenue'] as num?)?.toInt() ?? 0;
    final activeCards = (summary['activeCards'] as num?)?.toInt() ?? 0;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Summary', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800, color: AppTheme.foreground)),
          const SizedBox(height: 16),
          // Stat rows
          _StatRow(label: 'Total Clients', value: '$totalClients', icon: Icons.people_rounded, color: AppTheme.primary),
          _StatRow(label: 'Active Cards', value: '$activeCards', icon: Icons.credit_card_rounded, color: AppTheme.success),
          _StatRow(label: 'Total Redemptions', value: '$totalRedemptions', icon: Icons.check_circle_rounded, color: AppTheme.info),
          _StatRow(label: 'Total Revenue', value: _fmt(totalRevenue), icon: Icons.attach_money_rounded, color: AppTheme.warning),

          const SizedBox(height: 28),
          Text('Redemptions vs Revenue', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700, color: AppTheme.muted)),
          const SizedBox(height: 16),
          Container(
            height: 200,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.surface2,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: (totalRedemptions > 0 ? totalRedemptions.toDouble() : 10),
                barGroups: [
                  BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: totalRedemptions.toDouble(), color: AppTheme.primary, width: 40, borderRadius: BorderRadius.circular(6))]),
                ],
                gridData: const FlGridData(show: false),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (v, _) => const Text('Redemptions', style: TextStyle(color: AppTheme.muted, fontSize: 11)),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  String _fmt(int val) {
    if (val >= 1000000) return '${(val / 1000000).toStringAsFixed(1)} M DA';
    if (val >= 1000) return '${(val / 1000).toStringAsFixed(0)} k DA';
    return '$val DA';
  }
}

class _StatRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatRow({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 14),
          Expanded(child: Text(label, style: const TextStyle(color: AppTheme.muted, fontWeight: FontWeight.w500))),
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 16)),
        ],
      ),
    );
  }
}
