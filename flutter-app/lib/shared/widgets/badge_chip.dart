import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class BadgeChip extends StatelessWidget {
  final String label;
  final Color color;
  final Color bgColor;

  const BadgeChip({
    super.key,
    required this.label,
    required this.color,
    required this.bgColor,
  });

  factory BadgeChip.status(String status) {
    switch (status.toLowerCase()) {
      case 'active':
      case 'paid':
      case 'accepted':
      case 'success':
        return BadgeChip(label: status, color: AppTheme.success, bgColor: AppTheme.successBg);
      case 'pending':
        return BadgeChip(label: status, color: AppTheme.warning, bgColor: AppTheme.warningBg);
      case 'rejected':
      case 'voided':
      case 'failed':
        return BadgeChip(label: status, color: AppTheme.danger, bgColor: AppTheme.dangerBg);
      case 'reviewed':
      case 'archived':
        return BadgeChip(label: status, color: AppTheme.muted, bgColor: AppTheme.surface2);
      default:
        return BadgeChip(label: status, color: AppTheme.info, bgColor: AppTheme.infoBg);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
