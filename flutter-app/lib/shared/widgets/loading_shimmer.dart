import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/theme/app_theme.dart';

class LoadingShimmer extends StatelessWidget {
  final double? height;
  final double? width;
  final BorderRadius? borderRadius;

  const LoadingShimmer({
    super.key,
    this.height,
    this.width,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppTheme.surface2,
      highlightColor: AppTheme.border,
      child: Container(
        height: height ?? 16,
        width: width,
        decoration: BoxDecoration(
          color: AppTheme.surface2,
          borderRadius: borderRadius ?? BorderRadius.circular(8),
        ),
      ),
    );
  }
}

/// Full-page loading shimmer for list screens
class ListLoadingShimmer extends StatelessWidget {
  final int itemCount;
  const ListLoadingShimmer({super.key, this.itemCount = 6});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: itemCount,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface2,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                LoadingShimmer(height: 40, width: 40, borderRadius: BorderRadius.circular(20)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      LoadingShimmer(height: 14, width: 140),
                      SizedBox(height: 6),
                      LoadingShimmer(height: 11, width: 80),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
