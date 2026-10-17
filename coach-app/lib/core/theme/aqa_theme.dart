import 'dart:ui' show ImageFilter, FontFeature;
import 'package:flutter/material.dart';

/// AQA Dark Ocean Design System — Precision-Engineered Luxury UI Components
/// Crafted to Linear / Raycast / Apple Pro Dark Ocean standards:
/// - Machined Obsidian-Glass cards with top-edge specular illumination (no double-wireframe artifacts)
/// - Ambient Cyan/Sky atmospheric depth mesh
/// - True clipped Island CTA buttons (zero CanvasKit Ink shadow box artifacts)
/// - Centered responsive viewport geometry for mobile, tablet, and desktop web
/// - Zero emojis, Western Arabic numerals only (0-9).
class AqaTheme {
  AqaTheme._();

  // Primary brand colors
  static const Color primarySky = Color(0xFF0EA5E9);
  static const Color primarySkyHover = Color(0xFF38BDF8);
  static const Color accentTeal = Color(0xFF00F2FF);

  // Surfaces & Backgrounds (Obsidian Slate Hierarchy)
  static const Color bgDark = Color(0xFF030712);
  static const Color bgShell = Color(0xFF060B16);
  static const Color surfaceRecessed = Color(0xFF070C18);
  static const Color surfaceDark = Color(0xFF0B1222);
  static const Color surfaceElevated = Color(0xFF111B30);
  static const Color surfaceSecondary = Color(0xFF17233B);
  static const Color surfaceTertiary = Color(0xFF263554);

  // Precision Hairline Borders
  static const Color borderSubtle = Color(0x14FFFFFF); // rgba(255, 255, 255, 0.08)
  static const Color borderTopHighlight = Color(0x24FFFFFF); // rgba(255, 255, 255, 0.14)
  static const Color borderMedium = Color(0x22FFFFFF); // rgba(255, 255, 255, 0.13)
  static const Color borderTeal = Color(0x4D00F2FF); // rgba(0, 242, 255, 0.30)
  static const Color borderSky = Color(0x4D0EA5E9); // rgba(14, 165, 233, 0.30)

  // Typography Colors
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFFCBD5E1);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textLightMuted = Color(0xFF64748B);

  // Status Colors
  static const Color statusSuccess = Color(0xFF10B981);
  static const Color statusSuccessBg = Color(0x1F10B981);
  static const Color statusWarning = Color(0xFFF59E0B);
  static const Color statusWarningBg = Color(0x1FF59E0B);
  static const Color statusDanger = Color(0xFFEF4444);
  static const Color statusDangerBg = Color(0x1FEF4444);
  static const Color statusInfo = Color(0xFF38BDF8);
  static const Color statusInfoBg = Color(0x1F38BDF8);

  // Radii Scale (6 / 10 / 14 / 20px)
  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 20.0;

  // Max content width for desktop/web so cards never stretch into awkward bars
  static const double maxContentWidth = 860.0;

  // Tabular numerals helper for timers, scores, and KPIs
  static const List<FontFeature> tabularNums = [FontFeature.tabularFigures()];

  // Glow Shadows
  static List<BoxShadow> get tealGlow => const [
        BoxShadow(
          color: Color(0x2400F2FF),
          blurRadius: 20.0,
          spreadRadius: -4.0,
          offset: Offset(0, 6),
        ),
      ];

  static List<BoxShadow> get skyGlow => const [
        BoxShadow(
          color: Color(0x280EA5E9),
          blurRadius: 20.0,
          spreadRadius: -4.0,
          offset: Offset(0, 6),
        ),
      ];

  static List<BoxShadow> get cardShadow => const [
        BoxShadow(
          color: Color(0x66000000),
          blurRadius: 24.0,
          spreadRadius: -6.0,
          offset: Offset(0, 10),
        ),
      ];

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bgDark,
      colorScheme: const ColorScheme.dark(
        primary: primarySky,
        secondary: accentTeal,
        surface: surfaceDark,
        error: statusDanger,
        onPrimary: Colors.white,
        onSecondary: bgDark,
        onSurface: textPrimary,
      ),
      fontFamily: 'Roboto',
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xE6050914),
        foregroundColor: textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: 'Roboto',
          color: textPrimary,
          fontSize: 16.5,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
        shape: Border(
          bottom: BorderSide(color: borderSubtle, width: 1.0),
        ),
      ),
      cardTheme: CardThemeData(
        color: surfaceDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          side: const BorderSide(color: borderSubtle, width: 1.0),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceRecessed,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        hintStyle: const TextStyle(
          color: textLightMuted,
          fontSize: 13.5,
          fontWeight: FontWeight.w400,
        ),
        labelStyle: const TextStyle(
          color: textMuted,
          fontSize: 13.0,
          fontWeight: FontWeight.w600,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: borderSubtle, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: borderSubtle, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: primarySkyHover, width: 1.2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: statusDanger, width: 1.2),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: statusDanger, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primarySky,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size(0, 42.0),
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10.0),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Roboto',
            fontSize: 13.0,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.1,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          backgroundColor: surfaceRecessed,
          elevation: 0,
          minimumSize: const Size(0, 42.0),
          side: const BorderSide(color: borderMedium, width: 1.0),
          padding: const EdgeInsets.symmetric(horizontal: 15.0, vertical: 10.0),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10.0),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Roboto',
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: surfaceRecessed,
        selectedColor: primarySky.withValues(alpha: 0.20),
        side: const BorderSide(color: borderSubtle, width: 1.0),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999.0),
        ),
        labelStyle: const TextStyle(
          fontFamily: 'Roboto',
          color: textMuted,
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
        ),
        secondaryLabelStyle: const TextStyle(
          fontFamily: 'Roboto',
          color: accentTeal,
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
        ),
        showCheckmark: false,
      ),
      dividerTheme: const DividerThemeData(
        color: Color(0x12FFFFFF),
        thickness: 1.0,
        space: 1.0,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: surfaceElevated,
        contentTextStyle: const TextStyle(
          fontFamily: 'Roboto',
          color: textPrimary,
          fontSize: 13.0,
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12.0),
          side: const BorderSide(color: borderMedium, width: 1.0),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

/// Precision Obsidian-Slate Card Architecture
/// Replaces the old double-wireframe border with a single machined 1px hairline border,
/// deep internal slate gradient, subtle top-edge specular highlight, and soft ambient glow.
class AqaDoubleBezelCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final Color? accentColor;
  final bool glowing;
  final bool? glowEffect;
  final VoidCallback? onTap;
  final double outerRadius;

  const AqaDoubleBezelCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16.0),
    this.margin,
    this.accentColor,
    this.glowing = false,
    this.glowEffect,
    this.onTap,
    this.outerRadius = 16.0,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveAccent = accentColor ?? AqaTheme.accentTeal;
    final isGlowing = glowEffect ?? glowing;
    final radius = BorderRadius.circular(outerRadius);

    Widget content = Stack(
      children: [
        // Subtle radial ambient sheen in top-left corner when glowing
        if (isGlowing)
          Positioned(
            top: -40,
            left: -40,
            child: IgnorePointer(
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      effectiveAccent.withValues(alpha: 0.12),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
        // Top-edge specular hairline highlight
        Positioned(
          top: 0,
          left: outerRadius,
          right: outerRadius,
          child: IgnorePointer(
            child: Container(
              height: 1.0,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    isGlowing
                        ? effectiveAccent.withValues(alpha: 0.55)
                        : Colors.white.withValues(alpha: 0.16),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: padding,
          child: child,
        ),
      ],
    );

    if (onTap != null) {
      content = Material(
        color: Colors.transparent,
        borderRadius: radius,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          splashColor: effectiveAccent.withValues(alpha: 0.08),
          highlightColor: effectiveAccent.withValues(alpha: 0.04),
          child: content,
        ),
      );
    } else {
      content = ClipRRect(
        borderRadius: radius,
        child: content,
      );
    }

    return Container(
      margin: margin,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isGlowing
              ? [
                  Color.lerp(const Color(0xFF0F192E), effectiveAccent, 0.06) ??
                      const Color(0xFF0F192E),
                  const Color(0xFF080E1C),
                ]
              : const [
                  Color(0xFF0E1729),
                  Color(0xFF080E1B),
                ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: radius,
        border: Border.all(
          color: isGlowing
              ? effectiveAccent.withValues(alpha: 0.34)
              : const Color(0x16FFFFFF),
          width: 1.0,
        ),
        boxShadow: isGlowing
            ? [
                BoxShadow(
                  color: effectiveAccent.withValues(alpha: 0.12),
                  blurRadius: 20.0,
                  spreadRadius: -4.0,
                  offset: const Offset(0, 6),
                ),
                ...AqaTheme.cardShadow,
              ]
            : AqaTheme.cardShadow,
      ),
      child: content,
    );
  }
}

/// Atmospheric Dark Ocean background with subtle glowing cyan/sky orbs
/// and automatic centered responsive constraint for wide web/tablet viewports.
class AqaAmbientBackground extends StatelessWidget {
  final Widget child;
  final bool constrainWidth;

  const AqaAmbientBackground({
    super.key,
    required this.child,
    this.constrainWidth = true,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const ColoredBox(color: AqaTheme.bgDark),
        Positioned(
          top: -120,
          right: -90,
          child: IgnorePointer(
            child: Container(
              width: 340,
              height: 340,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AqaTheme.primarySky.withValues(alpha: 0.08),
                    AqaTheme.accentTeal.withValues(alpha: 0.02),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
        ),
        Positioned(
          bottom: -140,
          left: -100,
          child: IgnorePointer(
            child: Container(
              width: 360,
              height: 360,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AqaTheme.accentTeal.withValues(alpha: 0.06),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
        ),
        if (constrainWidth)
          Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: AqaTheme.maxContentWidth),
              child: child,
            ),
          )
        else
          child,
      ],
    );
  }
}

/// Precision-Clipped Island CTA Button
/// Eliminates the Flutter CanvasKit `Ink` rectangular shadow bug by holding
/// the gradient, border, and shadow on an outer `DecoratedBox` and clipping
/// the inner `Material` + `InkWell` cleanly to `BorderRadius.circular(12)`.
class AqaIslandButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback? onPressed;
  final bool loading;
  final bool? isLoading;
  final bool secondary;
  final bool danger;
  final Color? color;
  final Color? textColor;
  final bool compact;

  const AqaIslandButton({
    super.key,
    required this.label,
    required this.icon,
    required this.onPressed,
    this.loading = false,
    this.isLoading,
    this.secondary = false,
    this.danger = false,
    this.color,
    this.textColor,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final isBusy = isLoading ?? loading;
    final radius = BorderRadius.circular(compact ? 10.0 : 12.0);

    Color baseColor;
    Color fgColor;
    Border border;
    Gradient? gradient;
    List<BoxShadow>? shadows;

    if (danger) {
      baseColor = AqaTheme.statusDanger;
      fgColor = Colors.white;
      gradient = const LinearGradient(
        colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
      border = Border.all(color: Colors.white.withValues(alpha: 0.18), width: 1.0);
      shadows = [
        BoxShadow(
          color: AqaTheme.statusDanger.withValues(alpha: 0.25),
          blurRadius: 14.0,
          spreadRadius: -2.0,
          offset: const Offset(0, 4),
        ),
      ];
    } else if (secondary) {
      baseColor = color ?? AqaTheme.surfaceElevated;
      fgColor = textColor ?? AqaTheme.textPrimary;
      gradient = const LinearGradient(
        colors: [Color(0xFF162238), Color(0xFF0E1729)],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      );
      border = Border.all(color: AqaTheme.borderMedium, width: 1.0);
      shadows = null;
    } else {
      baseColor = color ?? AqaTheme.primarySky;
      final isCustomLight = baseColor == AqaTheme.accentTeal || baseColor == AqaTheme.statusWarning;
      fgColor = textColor ?? (isCustomLight ? const Color(0xFF030712) : Colors.white);
      gradient = color != null
          ? LinearGradient(
              colors: [
                baseColor,
                Color.lerp(baseColor, AqaTheme.primarySky, 0.35) ?? baseColor,
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            )
          : const LinearGradient(
              colors: [Color(0xFF0EA5E9), Color(0xFF0284C7)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            );
      border = Border.all(
        color: Colors.white.withValues(alpha: 0.20),
        width: 1.0,
      );
      shadows = [
        BoxShadow(
          color: baseColor.withValues(alpha: 0.28),
          blurRadius: 16.0,
          spreadRadius: -3.0,
          offset: const Offset(0, 5),
        ),
      ];
    }

    return Container(
      height: compact ? 38.0 : 46.0,
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: radius,
        border: border,
        boxShadow: onPressed == null ? null : shadows,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: radius,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: isBusy ? null : onPressed,
          borderRadius: radius,
          splashColor: fgColor.withValues(alpha: 0.12),
          highlightColor: fgColor.withValues(alpha: 0.06),
          child: Padding(
            padding: EdgeInsets.only(
              left: compact ? 13.0 : 18.0,
              right: compact ? 8.0 : 10.0,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: fgColor,
                      fontSize: compact ? 12.0 : 13.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.1,
                    ),
                  ),
                ),
                SizedBox(width: compact ? 8.0 : 10.0),
                Container(
                  width: compact ? 24.0 : 28.0,
                  height: compact ? 24.0 : 28.0,
                  decoration: BoxDecoration(
                    color: fgColor.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(compact ? 7.0 : 8.0),
                  ),
                  alignment: Alignment.center,
                  child: isBusy
                      ? SizedBox(
                          width: 13,
                          height: 13,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: fgColor,
                          ),
                        )
                      : Icon(icon, size: compact ? 14.5 : 16.5, color: fgColor),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Sleek Glass Icon Action Button (for AppBar / Card headers)
class AqaGlassIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  final String? tooltip;
  final Color? iconColor;
  final double size;

  const AqaGlassIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.tooltip,
    this.iconColor,
    this.size = 36.0,
  });

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(10.0);
    final btn = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AqaTheme.surfaceRecessed,
        borderRadius: radius,
        border: Border.all(color: AqaTheme.borderSubtle, width: 1.0),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: radius,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onPressed,
          borderRadius: radius,
          child: Icon(
            icon,
            size: size * 0.5,
            color: iconColor ?? AqaTheme.textSecondary,
          ),
        ),
      ),
    );

    if (tooltip != null && tooltip!.isNotEmpty) {
      return Tooltip(message: tooltip!, child: btn);
    }
    return btn;
  }
}

/// Eyebrow Tag + Section Header
class AqaSectionHeader extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String? subtitle;
  final Widget? trailing;

  const AqaSectionHeader({
    super.key,
    this.eyebrow = 'AQA SWIM',
    required this.title,
    this.subtitle,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: AqaTheme.accentTeal,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    eyebrow.toUpperCase(),
                    style: const TextStyle(
                      color: AqaTheme.accentTeal,
                      fontSize: 10.0,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.1,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 18.0,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                ),
              ),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle!,
                  style: const TextStyle(
                    color: AqaTheme.textMuted,
                    fontSize: 12.0,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (trailing != null) trailing!,
      ],
    );
  }
}

/// Data definition for items in the Floating Glassmorphic Dock
class AqaFloatingDockItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final int badgeCount;

  const AqaFloatingDockItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    this.badgeCount = 0,
  });
}

/// Precision-Engineered Floating Glassmorphic Command Dock
/// Centered island (`maxWidth: 620`) with frosted obsidian glass,
/// top laser active indicator, and clean typography.
class AqaFloatingDock extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<AqaFloatingDockItem> items;

  const AqaFloatingDock({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12.0, 0, 12.0, 10.0),
        child: Align(
          alignment: Alignment.bottomCenter,
          heightFactor: 1.0,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 620.0),
            child: Container(
              height: 62.0,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20.0),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x80000000),
                    blurRadius: 28.0,
                    spreadRadius: 0.0,
                    offset: Offset(0, 10),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20.0),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 20.0, sigmaY: 20.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 5.0),
                    decoration: BoxDecoration(
                      color: const Color(0xEB070C18),
                      borderRadius: BorderRadius.circular(20.0),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.10),
                        width: 1.0,
                      ),
                    ),
                    child: Row(
                      children: List.generate(items.length, (index) {
                        final item = items[index];
                        final isSelected = currentIndex == index;
                        return Expanded(
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => onTap(index),
                              borderRadius: BorderRadius.circular(14.0),
                              splashColor: AqaTheme.accentTeal.withValues(alpha: 0.08),
                              highlightColor: Colors.transparent,
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                curve: Curves.easeOutCubic,
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? const Color(0xFF111D35)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(14.0),
                                  border: Border.all(
                                    color: isSelected
                                        ? AqaTheme.primarySky.withValues(alpha: 0.30)
                                        : Colors.transparent,
                                    width: 1.0,
                                  ),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    // Top laser indicator bar
                                    AnimatedContainer(
                                      duration: const Duration(milliseconds: 200),
                                      width: isSelected ? 18.0 : 0.0,
                                      height: 2.0,
                                      margin: const EdgeInsets.only(bottom: 3.0),
                                      decoration: BoxDecoration(
                                        color: AqaTheme.accentTeal,
                                        borderRadius: BorderRadius.circular(999),
                                        boxShadow: isSelected
                                            ? const [
                                                BoxShadow(
                                                  color: Color(0x8000F2FF),
                                                  blurRadius: 6.0,
                                                ),
                                              ]
                                            : null,
                                      ),
                                    ),
                                    Stack(
                                      clipBehavior: Clip.none,
                                      children: [
                                        Icon(
                                          isSelected ? item.activeIcon : item.icon,
                                          size: 19.5,
                                          color: isSelected
                                              ? AqaTheme.accentTeal
                                              : AqaTheme.textLightMuted,
                                        ),
                                        if (item.badgeCount > 0)
                                          Positioned(
                                            top: -4,
                                            right: -9,
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(
                                                horizontal: 4.5,
                                                vertical: 1.0,
                                              ),
                                              decoration: BoxDecoration(
                                                color: AqaTheme.statusWarning,
                                                borderRadius: BorderRadius.circular(999),
                                                border: Border.all(
                                                  color: const Color(0xFF070C18),
                                                  width: 1.2,
                                                ),
                                              ),
                                              child: Text(
                                                '${item.badgeCount}',
                                                style: const TextStyle(
                                                  color: Color(0xFF030712),
                                                  fontSize: 8.5,
                                                  fontWeight: FontWeight.w900,
                                                  fontFeatures: AqaTheme.tabularNums,
                                                ),
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 2.5),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 2.0),
                                      child: Text(
                                        item.label,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: isSelected
                                              ? AqaTheme.textPrimary
                                              : AqaTheme.textLightMuted,
                                          fontSize: 9.5,
                                          fontWeight:
                                              isSelected ? FontWeight.w700 : FontWeight.w500,
                                          letterSpacing: -0.2,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Luxury Segmented Pill Switcher
class AqaSegmentedControl<T> extends StatelessWidget {
  final List<T> values;
  final List<String> labels;
  final T selectedValue;
  final ValueChanged<T> onValueChanged;
  final EdgeInsetsGeometry padding;

  const AqaSegmentedControl({
    super.key,
    required this.values,
    required this.labels,
    required this.selectedValue,
    required this.onValueChanged,
    this.padding = const EdgeInsets.all(3.5),
  }) : assert(values.length == labels.length);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: AqaTheme.surfaceRecessed,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: AqaTheme.borderSubtle, width: 1.0),
      ),
      child: Row(
        children: List.generate(values.length, (idx) {
          final val = values[idx];
          final isSelected = val == selectedValue;
          return Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onValueChanged(val),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutCubic,
                padding: const EdgeInsets.symmetric(vertical: 8.5, horizontal: 6.0),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSelected ? AqaTheme.surfaceSecondary : Colors.transparent,
                  borderRadius: BorderRadius.circular(9.0),
                  border: Border.all(
                    color: isSelected
                        ? AqaTheme.primarySky.withValues(alpha: 0.40)
                        : Colors.transparent,
                    width: 1.0,
                  ),
                ),
                child: Text(
                  labels[idx],
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: isSelected ? AqaTheme.textPrimary : AqaTheme.textMuted,
                    fontSize: 12.0,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    letterSpacing: -0.1,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

/// Animated Status Indicator Dot with subtle ambient pulse
class AqaPulseIndicator extends StatelessWidget {
  final Color color;
  final double size;

  const AqaPulseIndicator({
    super.key,
    required this.color,
    this.size = 7.0,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.55),
            blurRadius: size * 1.4,
            spreadRadius: 0.5,
          ),
        ],
      ),
    );
  }
}

/// Tactile Binary Attendance Toggle Switch (Strictly PRESENT vs ABSENT)
class AqaBinaryAttendanceToggle extends StatelessWidget {
  final bool isPresent;
  final VoidCallback onToggle;
  final String presentLabel;
  final String absentLabel;
  final bool readOnly;

  const AqaBinaryAttendanceToggle({
    super.key,
    required this.isPresent,
    required this.onToggle,
    this.presentLabel = 'Present',
    this.absentLabel = 'Absent',
    this.readOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    final activeColor = isPresent ? AqaTheme.statusSuccess : AqaTheme.statusDanger;
    final radius = BorderRadius.circular(10.0);

    return Container(
      height: 40.0,
      decoration: BoxDecoration(
        color: isPresent
            ? const Color(0xFF071F18)
            : const Color(0xFF220C12),
        borderRadius: radius,
        border: Border.all(
          color: activeColor.withValues(alpha: 0.45),
          width: 1.0,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: radius,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: readOnly ? null : onToggle,
          borderRadius: radius,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12.0),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AqaPulseIndicator(color: activeColor, size: 6.5),
                const SizedBox(width: 7.0),
                Text(
                  isPresent ? presentLabel.toUpperCase() : absentLabel.toUpperCase(),
                  style: TextStyle(
                    color: activeColor,
                    fontSize: 11.0,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                  ),
                ),
                const SizedBox(width: 6.0),
                Icon(
                  isPresent ? Icons.check_circle_rounded : Icons.cancel_rounded,
                  size: 15.5,
                  color: activeColor,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
