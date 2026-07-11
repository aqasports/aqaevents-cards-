import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/stat_card.dart';
import '../../shared/widgets/loading_shimmer.dart';

final dashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.reports);
  return (res.data as Map<String, dynamic>?) ?? {};
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(dashboardProvider);
    final auth = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Dashboard'),
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            onPressed: () => Scaffold.of(ctx).openDrawer(),
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: CircleAvatar(
              radius: 17,
              backgroundColor: AppTheme.primaryLight,
              child: Text(
                (auth.userName?.isNotEmpty == true) ? auth.userName![0].toUpperCase() : 'A',
                style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w800, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        backgroundColor: AppTheme.surface2,
        onRefresh: () => ref.refresh(dashboardProvider.future),
        child: data.when(
          loading: () => const _DashboardShimmer(),
          error: (err, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.wifi_off_rounded, color: AppTheme.muted, size: 48),
                const SizedBox(height: 12),
                Text('Failed to load data', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.muted)),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => ref.refresh(dashboardProvider.future),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
          data: (summary) => _DashboardContent(summary: summary),
        ),
      ),
    );
  }
}

class _DashboardContent extends StatelessWidget {
  final Map<String, dynamic> summary;
  const _DashboardContent({required this.summary});

  @override
  Widget build(BuildContext context) {
    final totalClients = summary['totalClients'] ?? 0;
    final activeCards = summary['activeCards'] ?? 0;
    final totalRedemptions = summary['totalRedemptions'] ?? 0;
    final totalRevenue = summary['totalRevenue'] ?? 0;
    final pendingInvoices = summary['pendingInvoices'] ?? 0;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Greeting
          Text(
            'Overview',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppTheme.foreground,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            'Live system statistics',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppTheme.muted),
          ),
          const SizedBox(height: 20),

          // Stats grid
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.35,
            children: [
              StatCard(
                label: 'Total Clients',
                value: '$totalClients',
                icon: Icons.people_rounded,
                color: AppTheme.primary,
                onTap: () => context.go('/clients'),
              ),
              StatCard(
                label: 'Active Cards',
                value: '$activeCards',
                icon: Icons.credit_card_rounded,
                color: AppTheme.success,
                onTap: null,
              ),
              StatCard(
                label: 'Redemptions',
                value: '$totalRedemptions',
                icon: Icons.check_circle_rounded,
                color: AppTheme.info,
                onTap: () => context.go('/redeem'),
              ),
              StatCard(
                label: 'Pending Invoices',
                value: '$pendingInvoices',
                icon: Icons.receipt_long_rounded,
                color: pendingInvoices > 0 ? AppTheme.danger : AppTheme.muted,
                onTap: () => context.go('/invoices'),
                badge: pendingInvoices > 0 ? '$pendingInvoices' : null,
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Revenue summary card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.surface2,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1E1E2A), Color(0xFF16161E)],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.trending_up_rounded, color: AppTheme.primary, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Total Revenue',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            color: AppTheme.muted,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  _formatCurrency(totalRevenue),
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: AppTheme.foreground,
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Quick actions
          Text(
            'Quick Actions',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppTheme.muted,
                  letterSpacing: 0.5,
                ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _QuickAction(
                  label: 'New Client',
                  icon: Icons.person_add_rounded,
                  color: AppTheme.primary,
                  onTap: () => context.go('/clients/new'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickAction(
                  label: 'Scan QR',
                  icon: Icons.qr_code_scanner_rounded,
                  color: AppTheme.success,
                  onTap: () => context.go('/redeem'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickAction(
                  label: 'Reports',
                  icon: Icons.bar_chart_rounded,
                  color: AppTheme.info,
                  onTap: () => context.go('/reports'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  String _formatCurrency(dynamic val) {
    final n = (val as num?)?.toInt() ?? 0;
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)} M DA';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(0)} k DA';
    return '$n DA';
  }
}

class _QuickAction extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _QuickAction({required this.label, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 26),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _DashboardShimmer extends StatelessWidget {
  const _DashboardShimmer();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          LoadingShimmer(height: 20, width: 120),
          SizedBox(height: 20),
          Row(
            children: [
              Expanded(child: LoadingShimmer(height: 100)),
              SizedBox(width: 12),
              Expanded(child: LoadingShimmer(height: 100)),
            ],
          ),
          SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: LoadingShimmer(height: 100)),
              SizedBox(width: 12),
              Expanded(child: LoadingShimmer(height: 100)),
            ],
          ),
          SizedBox(height: 24),
          LoadingShimmer(height: 120),
        ],
      ),
    );
  }
}
