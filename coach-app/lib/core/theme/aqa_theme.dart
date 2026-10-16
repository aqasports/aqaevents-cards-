import 'package:flutter/material.dart';

/// AQA Dark Ocean Design Tokens & Agency-Grade UI Components
/// Powered by Okkul High-End Visual Design & UI/UX Pro Max Standards:
/// - Double-Bezel ("Doppelrand") nested glass/metal card architecture
/// - Ambient Cyan/Sky atmospheric depth orbs
/// - Island CTA buttons with nested trailing icon circles
/// - Fitts'-Law thumb-zone touch targets (>= 48px)
/// - Zero emojis, Western Arabic numerals only (0-9).
class AqaTheme {
  AqaTheme._();

  // Primary brand colors
  static const Color primarySky = Color(0xFF0EA5E9);
  static const Color primarySkyHover = Color(0xFF38BDF8);
  static const Color accentTeal = Color(0xFF00F2FF);

  // Surfaces & Backgrounds
  static const Color bgDark = Color(0xFF030712);
  static const Color bgShell = Color(0xFF080E1E);
  static const Color surfaceDark = Color(0xFF0F172A);
  static const Color surfaceSecondary = Color(0xFF1E293B);
  static const Color surfaceTertiary = Color(0xFF334155);

  // Borders
  static const Color borderSubtle = Color(0x14FFFFFF); // rgba(255, 255, 255, 0.08)
  static const Color borderTopHighlight = Color(0x22FFFFFF); // top rim highlight
  static const Color borderMedium = Color(0x26FFFFFF); // rgba(255, 255, 255, 0.15)
  static const Color borderTeal = Color(0x5900F2FF); // rgba(0, 242, 255, 0.35)
  static const Color borderSky = Color(0x590EA5E9);

  // Typography Colors
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textLightMuted = Color(0xFF64748B);

  // Status Colors
  static const Color statusSuccess = Color(0xFF10B981);
  static const Color statusSuccessBg = Color(0x2410B981);
  static const Color statusWarning = Color(0xFFF59E0B);
  static const Color statusWarningBg = Color(0x24F59E0B);
  static const Color statusDanger = Color(0xFFEF4444);
  static const Color statusDangerBg = Color(0x24EF4444);
  static const Color statusInfo = Color(0xFF38BDF8);
  static const Color statusInfoBg = Color(0x2438BDF8);

  // Radii
  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 22.0;

  // Glow Shadows
  static List<BoxShadow> get tealGlow => [
        const BoxShadow(
          color: Color(0x2E00F2FF),
          blurRadius: 20.0,
          spreadRadius: -2.0,
          offset: Offset(0, 6),
        ),
      ];

  static List<BoxShadow> get skyGlow => [
        const BoxShadow(
          color: Color(0x330EA5E9),
          blurRadius: 20.0,
          spreadRadius: -2.0,
          offset: Offset(0, 6),
        ),
      ];

  static List<BoxShadow> get cardShadow => [
        const BoxShadow(
          color: Color(0x59000000),
          blurRadius: 18.0,
          spreadRadius: -4.0,
          offset: Offset(0, 8),
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
      fontFamily: 'Inter',
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xE6080E1E),
        foregroundColor: textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 17.0,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
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
        fillColor: const Color(0xFF0A1122),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 15.0),
        hintStyle: const TextStyle(color: textLightMuted, fontSize: 14.0),
        labelStyle: const TextStyle(color: textMuted, fontSize: 13.0, fontWeight: FontWeight.w600),
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
          borderSide: const BorderSide(color: accentTeal, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: statusDanger, width: 1.2),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primarySky,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size(0, 48.0),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 14.0),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMd),
          ),
          textStyle: const TextStyle(
            fontSize: 14.0,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.2,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          elevation: 0,
          minimumSize: const Size(0, 48.0),
          side: const BorderSide(color: borderMedium, width: 1.0),
          padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 12.0),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMd),
          ),
          textStyle: const TextStyle(
            fontSize: 13.0,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Color(0xF2080E1E),
        selectedItemColor: accentTeal,
        unselectedItemColor: textLightMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: TextStyle(fontSize: 11.0, fontWeight: FontWeight.w700),
        unselectedLabelStyle: TextStyle(fontSize: 11.0, fontWeight: FontWeight.w500),
      ),
      dividerTheme: const DividerThemeData(
        color: borderSubtle,
        thickness: 1.0,
        space: 1.0,
      ),
    );
  }
}

/// Double-Bezel ("Doppelrand") Luxury Card Architecture from Okkul High-End Visual Design
/// Outer shell acts as a precision machined tray (`p: 3.5px`, `radius: 20px`)
/// Inner core holds the content with top-edge illumination and deep slate gradient.
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
    this.outerRadius = 20.0,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveAccent = accentColor ?? AqaTheme.accentTeal;
    final innerRadius = (outerRadius - 4.0).clamp(8.0, 32.0);
    final isGlowing = glowEffect ?? glowing;

    Widget innerCore = Container(
      padding: padding,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF131E36),
            AqaTheme.surfaceDark,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(innerRadius),
        border: Border.all(
          color: isGlowing
              ? effectiveAccent.withValues(alpha: 0.38)
              : AqaTheme.borderTopHighlight.withValues(alpha: 0.11),
          width: 1.0,
        ),
      ),
      child: child,
    );

    if (onTap != null) {
      innerCore = Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(innerRadius),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(innerRadius),
          splashColor: effectiveAccent.withValues(alpha: 0.08),
          highlightColor: effectiveAccent.withValues(alpha: 0.04),
          child: innerCore,
        ),
      );
    }

    return Container(
      margin: margin,
      padding: const EdgeInsets.all(3.5),
      decoration: BoxDecoration(
        color: isGlowing
            ? effectiveAccent.withValues(alpha: 0.07)
            : const Color(0xFF070C18),
        borderRadius: BorderRadius.circular(outerRadius),
        border: Border.all(
          color: isGlowing
              ? effectiveAccent.withValues(alpha: 0.45)
              : const Color(0x14FFFFFF),
          width: 1.0,
        ),
        boxShadow: isGlowing
            ? [
                BoxShadow(
                  color: effectiveAccent.withValues(alpha: 0.16),
                  blurRadius: 22.0,
                  spreadRadius: -2.0,
                  offset: const Offset(0, 6),
                ),
                ...AqaTheme.cardShadow,
              ]
            : AqaTheme.cardShadow,
      ),
      child: innerCore,
    );
  }
}

/// Atmospheric Dark Ocean background with subtle glowing cyan/sky orbs
class AqaAmbientBackground extends StatelessWidget {
  final Widget child;

  const AqaAmbientBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(color: AqaTheme.bgDark),
        Positioned(
          top: -90,
          right: -70,
          child: IgnorePointer(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AqaTheme.accentTeal.withValues(alpha: 0.10),
                    AqaTheme.primarySky.withValues(alpha: 0.03),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
        ),
        Positioned(
          bottom: -110,
          left: -80,
          child: IgnorePointer(
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AqaTheme.primarySky.withValues(alpha: 0.09),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
        ),
        child,
      ],
    );
  }
}

/// Island CTA Button with trailing circular icon badge (Okkul High-End Visual Design)
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

    Color bg;
    Color fg;
    Border? border;

    if (danger) {
      bg = AqaTheme.statusDanger;
      fg = Colors.white;
    } else if (secondary) {
      bg = color ?? AqaTheme.surfaceSecondary;
      fg = textColor ?? AqaTheme.accentTeal;
      border = Border.all(color: AqaTheme.borderSubtle);
    } else {
      bg = color ?? AqaTheme.accentTeal;
      fg = textColor ?? AqaTheme.bgDark;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isBusy ? null : onPressed,
        borderRadius: BorderRadius.circular(999),
        child: Ink(
          height: compact ? 42.0 : 50.0,
          padding: EdgeInsets.only(
            left: compact ? 16.0 : 20.0,
            right: compact ? 6.0 : 7.0,
          ),
          decoration: BoxDecoration(
            gradient: secondary
                ? null
                : LinearGradient(
                    colors: [
                      bg,
                      Color.lerp(bg, AqaTheme.primarySky, 0.35) ?? bg,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
            color: secondary ? bg : null,
            border: border,
            borderRadius: BorderRadius.circular(999),
            boxShadow: secondary
                ? null
                : [
                    BoxShadow(
                      color: bg.withValues(alpha: 0.28),
                      blurRadius: 16.0,
                      offset: const Offset(0, 4),
                    ),
                  ],
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
                    color: fg,
                    fontSize: compact ? 12.5 : 13.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.2,
                  ),
                ),
              ),
              SizedBox(width: compact ? 8.0 : 12.0),
              Container(
                width: compact ? 30.0 : 36.0,
                height: compact ? 30.0 : 36.0,
                decoration: BoxDecoration(
                  color: fg.withValues(alpha: 0.14),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: isBusy
                    ? SizedBox(
                        width: 15,
                        height: 15,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: fg,
                        ),
                      )
                    : Icon(icon, size: compact ? 16.0 : 18.0, color: fg),
              ),
            ],
          ),
        ),
      ),
    );
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
