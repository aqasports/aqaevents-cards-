import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_shimmer.dart';
import 'package:cached_network_image/cached_network_image.dart';

class _Product {
  final String id;
  final String name;
  final int price;
  final String? description;
  final String? imageUrl;
  final bool active;
  final bool advertised;

  const _Product({
    required this.id,
    required this.name,
    required this.price,
    this.description,
    this.imageUrl,
    required this.active,
    required this.advertised,
  });

  factory _Product.fromJson(Map<String, dynamic> json) => _Product(
        id: json['id'] as String,
        name: json['name'] as String,
        price: json['price'] as int,
        description: json['description'] as String?,
        imageUrl: json['imageUrl'] as String?,
        active: json['active'] as bool? ?? true,
        advertised: json['advertised'] as bool? ?? true,
      );

  String get formattedPrice {
    if (price >= 1000) return '${(price / 1000).toStringAsFixed(price % 1000 == 0 ? 0 : 1)} k DA';
    return '$price DA';
  }
}

final productsProvider = FutureProvider<List<_Product>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get(ApiConfig.products);
  final list = res.data as List<dynamic>;
  return list.map((e) => _Product.fromJson(e as Map<String, dynamic>)).toList();
});

class ProductsScreen extends ConsumerWidget {
  const ProductsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(productsProvider);
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Products')),
      body: products.when(
        loading: () => const ListLoadingShimmer(),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (list) {
          if (list.isEmpty) {
            return const EmptyState(title: 'No products', icon: Icons.shopping_bag_outlined);
          }
          return RefreshIndicator(
            color: AppTheme.primary,
            backgroundColor: AppTheme.surface2,
            onRefresh: () => ref.refresh(productsProvider.future),
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.78,
              ),
              itemCount: list.length,
              itemBuilder: (_, i) => _ProductCard(product: list[i]),
            ),
          );
        },
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final _Product product;
  const _ProductCard({required this.product});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      clipBehavior: Clip.hardEdge,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image
          Expanded(
            child: product.imageUrl != null
                ? CachedNetworkImage(
                    imageUrl: product.imageUrl!,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: AppTheme.surface),
                    errorWidget: (_, __, ___) => Container(
                      color: AppTheme.surface,
                      child: const Icon(Icons.shopping_bag_outlined, color: AppTheme.muted, size: 36),
                    ),
                  )
                : Container(
                    color: AppTheme.primaryLight,
                    child: const Center(
                      child: Icon(Icons.shopping_bag_rounded, color: AppTheme.primary, size: 36),
                    ),
                  ),
          ),
          // Info
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: const TextStyle(
                    color: AppTheme.foreground,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      product.formattedPrice,
                      style: const TextStyle(
                        color: AppTheme.primary,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
                    if (!product.active)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.dangerBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Off', style: TextStyle(color: AppTheme.danger, fontSize: 9, fontWeight: FontWeight.w800)),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
