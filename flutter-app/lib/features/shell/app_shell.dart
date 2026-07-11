import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';

class AppShell extends ConsumerStatefulWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  static const _tabs = [
    _TabItem(path: '/', label: 'Dashboard', icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard_rounded),
    _TabItem(path: '/clients', label: 'Clients', icon: Icons.people_outline_rounded, activeIcon: Icons.people_rounded),
    _TabItem(path: '/redeem', label: 'Redeem', icon: Icons.qr_code_scanner_rounded, activeIcon: Icons.qr_code_scanner_rounded),
    _TabItem(path: '/invoices', label: 'Invoices', icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long_rounded),
    _TabItem(path: '/demands', label: 'Demands', icon: Icons.inbox_outlined, activeIcon: Icons.inbox_rounded),
  ];

  int _selectedIndex = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final location = GoRouterState.of(context).matchedLocation;
    for (int i = 0; i < _tabs.length; i++) {
      if (_tabs[i].path == '/' ? location == '/' : location.startsWith(_tabs[i].path)) {
        if (_selectedIndex != i) setState(() => _selectedIndex = i);
        break;
      }
    }
  }

  void _onTabTapped(int index) {
    setState(() => _selectedIndex = index);
    context.go(_tabs[index].path);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    return Scaffold(
      backgroundColor: AppTheme.background,
      drawer: _AppDrawer(auth: auth),
      body: widget.child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppTheme.border, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: _onTabTapped,
          backgroundColor: AppTheme.surface,
          selectedItemColor: AppTheme.primary,
          unselectedItemColor: AppTheme.muted,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          items: _tabs.map((tab) => BottomNavigationBarItem(
            icon: Icon(tab.icon),
            activeIcon: Icon(tab.activeIcon),
            label: tab.label,
          )).toList(),
        ),
      ),
    );
  }
}

class _TabItem {
  final String path;
  final String label;
  final IconData icon;
  final IconData activeIcon;
  const _TabItem({
    required this.path,
    required this.label,
    required this.icon,
    required this.activeIcon,
  });
}

class _AppDrawer extends ConsumerWidget {
  final AuthState auth;
  const _AppDrawer({required this.auth});

  static const _drawerItems = [
    _DrawerItem(path: '/', label: 'Dashboard', icon: Icons.dashboard_outlined),
    _DrawerItem(path: '/clients', label: 'Clients', icon: Icons.people_outline_rounded),
    _DrawerItem(path: '/activities', label: 'Activities', icon: Icons.bolt_outlined),
    _DrawerItem(path: '/packages', label: 'Packages', icon: Icons.inventory_2_outlined),
    _DrawerItem(path: '/events', label: 'Events', icon: Icons.event_outlined),
    _DrawerItem(path: '/clubs', label: 'Clubs', icon: Icons.business_outlined),
    _DrawerItem(path: '/redeem', label: 'Redeem', icon: Icons.qr_code_scanner_rounded),
    _DrawerItem(path: '/invoices', label: 'Invoices', icon: Icons.receipt_long_outlined),
    _DrawerItem(path: '/demands', label: 'Demands', icon: Icons.inbox_outlined),
    _DrawerItem(path: '/proposals', label: 'Proposals', icon: Icons.lightbulb_outline_rounded),
    _DrawerItem(path: '/products', label: 'Products', icon: Icons.shopping_bag_outlined),
    _DrawerItem(path: '/reports', label: 'Reports', icon: Icons.bar_chart_rounded),
    _DrawerItem(path: '/users', label: 'Staff', icon: Icons.manage_accounts_outlined),
    _DrawerItem(path: '/settings', label: 'Settings', icon: Icons.settings_outlined),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppTheme.border)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.bolt_rounded, color: AppTheme.primary),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'AQA Sports',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppTheme.foreground,
                        ),
                  ),
                  Text(
                    auth.userEmail ?? '',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: AppTheme.muted),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            // Nav links
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                children: _drawerItems.map((item) {
                  final isActive = item.path == '/'
                      ? location == '/'
                      : location.startsWith(item.path);
                  return ListTile(
                    leading: Icon(
                      item.icon,
                      size: 20,
                      color: isActive ? AppTheme.primary : AppTheme.muted,
                    ),
                    title: Text(
                      item.label,
                      style: TextStyle(
                        color: isActive ? AppTheme.primary : AppTheme.foreground,
                        fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                        fontSize: 14,
                      ),
                    ),
                    tileColor: isActive ? AppTheme.primaryLight : Colors.transparent,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    onTap: () {
                      Navigator.pop(context);
                      context.go(item.path);
                    },
                  );
                }).toList(),
              ),
            ),
            // Sign out
            Container(
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppTheme.border)),
              ),
              padding: const EdgeInsets.all(12),
              child: ListTile(
                leading: const Icon(Icons.logout_rounded,
                    color: AppTheme.danger, size: 20),
                title: const Text('Sign Out',
                    style: TextStyle(
                        color: AppTheme.danger,
                        fontWeight: FontWeight.w600,
                        fontSize: 14)),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
                onTap: () => ref.read(authProvider.notifier).signOut(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerItem {
  final String path;
  final String label;
  final IconData icon;
  const _DrawerItem(
      {required this.path, required this.label, required this.icon});
}
