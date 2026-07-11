import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_shimmer.dart';

final clientsListProvider = FutureProvider.family<List<Client>, String>((ref, search) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.clients, params: search.isNotEmpty ? {'search': search} : null);
  final list = res.data as List<dynamic>;
  return list.map((e) => Client.fromJson(e as Map<String, dynamic>)).toList();
});

class ClientsListScreen extends ConsumerStatefulWidget {
  const ClientsListScreen({super.key});
  @override
  ConsumerState<ClientsListScreen> createState() => _ClientsListScreenState();
}

class _ClientsListScreenState extends ConsumerState<ClientsListScreen> {
  final _searchCtrl = TextEditingController();
  String _search = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final clients = ref.watch(clientsListProvider(_search));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Clients'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_rounded),
            onPressed: () => context.go('/clients/new'),
            tooltip: 'New Client',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchCtrl,
              style: const TextStyle(color: AppTheme.foreground),
              decoration: InputDecoration(
                hintText: 'Search by name, phone, email...',
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                suffixIcon: _search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 18),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _search = '');
                        },
                      )
                    : null,
              ),
              onChanged: (v) => setState(() => _search = v.trim()),
            ),
          ),
          // List
          Expanded(
            child: clients.when(
              loading: () => const ListLoadingShimmer(),
              error: (e, _) => Center(
                child: Text('Error: $e', style: const TextStyle(color: AppTheme.muted)),
              ),
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: _search.isEmpty ? 'No clients yet' : 'No results found',
                    subtitle: _search.isEmpty
                        ? 'Add your first client to get started.'
                        : 'Try a different search term.',
                    icon: Icons.people_outline_rounded,
                    action: _search.isEmpty
                        ? ElevatedButton(
                            onPressed: () => context.go('/clients/new'),
                            child: const Text('Add Client'),
                          )
                        : null,
                  );
                }
                return RefreshIndicator(
                  color: AppTheme.primary,
                  backgroundColor: AppTheme.surface2,
                  onRefresh: () => ref.refresh(clientsListProvider(_search).future),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _ClientTile(client: list[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ClientTile extends StatelessWidget {
  final Client client;
  const _ClientTile({required this.client});

  @override
  Widget build(BuildContext context) {
    final initials = client.fullName.split(' ').take(2).map((w) => w.isNotEmpty ? w[0].toUpperCase() : '').join();
    final activeCard = client.cards?.isEmpty == true
        ? null
        : client.cards?.firstWhere((c) => c.isActive,
            orElse: () => client.cards!.first);

    return GestureDetector(
      onTap: () => context.go('/clients/${client.id}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface2,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            // Avatar
            CircleAvatar(
              radius: 22,
              backgroundColor: AppTheme.primaryLight,
              child: Text(initials, style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w800, fontSize: 14)),
            ),
            const SizedBox(width: 14),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    client.fullName,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppTheme.foreground,
                        ),
                  ),
                  const SizedBox(height: 3),
                  if (client.phone != null)
                    Text(
                      client.phone!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppTheme.muted),
                    ),
                  if (activeCard != null)
                    Text(
                      activeCard.cardCode,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.info,
                            fontWeight: FontWeight.w600,
                            fontFamily: 'monospace',
                          ),
                    ),
                ],
              ),
            ),
            // Segment badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.border),
              ),
              child: Text(
                client.customerSegment,
                style: const TextStyle(fontSize: 10, color: AppTheme.muted, fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right_rounded, color: AppTheme.muted, size: 18),
          ],
        ),
      ),
    );
  }
}
