import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_shimmer.dart';
import '../../shared/widgets/badge_chip.dart';

class _AdminUser {
  final String id;
  final String name;
  final String email;
  final String role;
  final DateTime createdAt;

  const _AdminUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.createdAt,
  });

  factory _AdminUser.fromJson(Map<String, dynamic> json) => _AdminUser(
        id: json['id'] as String,
        name: json['name'] as String,
        email: json['email'] as String,
        role: json['role'] as String? ?? 'staff',
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  bool get isSuperAdmin => role == 'super_admin';
}

final usersProvider = FutureProvider<List<_AdminUser>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.users);
  final list = res.data as List<dynamic>;
  return list.map((e) => _AdminUser.fromJson(e as Map<String, dynamic>)).toList();
});

class UsersScreen extends ConsumerWidget {
  const UsersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final users = ref.watch(usersProvider);
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Staff')),
      body: users.when(
        loading: () => const ListLoadingShimmer(itemCount: 4),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (list) {
          if (list.isEmpty) {
            return const EmptyState(title: 'No staff accounts', icon: Icons.manage_accounts_outlined);
          }
          return RefreshIndicator(
            color: AppTheme.primary,
            backgroundColor: AppTheme.surface2,
            onRefresh: () => ref.refresh(usersProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final user = list[i];
                final initials = user.name.split(' ').take(2)
                    .map((w) => w.isNotEmpty ? w[0].toUpperCase() : '').join();
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.surface2,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: user.isSuperAdmin
                          ? AppTheme.primary.withOpacity(0.3)
                          : AppTheme.border,
                    ),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 22,
                        backgroundColor: user.isSuperAdmin
                            ? AppTheme.primaryLight
                            : AppTheme.surface,
                        child: Text(
                          initials,
                          style: TextStyle(
                            color: user.isSuperAdmin ? AppTheme.primary : AppTheme.muted,
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.foreground,
                                    fontSize: 15)),
                            Text(user.email,
                                style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                          ],
                        ),
                      ),
                      BadgeChip(
                        label: user.isSuperAdmin ? 'Super Admin' : 'Staff',
                        color: user.isSuperAdmin ? AppTheme.primary : AppTheme.muted,
                        bgColor: user.isSuperAdmin
                            ? AppTheme.primaryLight
                            : AppTheme.surface,
                      ),
                    ],
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
