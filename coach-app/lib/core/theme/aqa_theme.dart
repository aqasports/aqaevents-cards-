import 'package:flutter/material.dart';

/// AQA Dark Ocean Design Tokens
/// Strictly adhering to AQA Brand Standards:
/// - Primary: Sky Blue (#0ea5e9, hover #38bdf8)
/// - Accent: AQA Teal (#00f2ff)
/// - Background: Deep Ocean (#030712)
/// - Surface: Slate 900 (#0f172a)
/// - Secondary Surface: Slate 800 (#1e293b)
/// - Border: Translucent white (0.08 / 0.15)
/// - Text: Primary (#f8fafc), Muted (#94a3b8), Light Muted (#64748b)
/// - Status: Success (#10b981), Warning (#f59e0b), Danger (#ef4444), Info (#38bdf8)
/// Zero emojis, Western Arabic numerals only (0-9).
class AqaTheme {
  AqaTheme._();

  // Primary brand colors
  static const Color primarySky = Color(0xFF0EA5E9);
  static const Color primarySkyHover = Color(0xFF38BDF8);
  static const Color accentTeal = Color(0xFF00F2FF);

  // Surfaces & Backgrounds
  static const Color bgDark = Color(0xFF030712);
  static const Color surfaceDark = Color(0xFF0F172A);
  static const Color surfaceSecondary = Color(0xFF1E293B);
  static const Color surfaceTertiary = Color(0xFF334155);

  // Borders
  static const Color borderSubtle = Color(0x14FFFFFF); // rgba(255, 255, 255, 0.08)
  static const Color borderMedium = Color(0x26FFFFFF); // rgba(255, 255, 255, 0.15)
  static const Color borderTeal = Color(0x4D00F2FF); // rgba(0, 242, 255, 0.3)

  // Typography Colors
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textLightMuted = Color(0xFF64748B);

  // Status Colors
  static const Color statusSuccess = Color(0xFF10B981);
  static const Color statusSuccessBg = Color(0x2610B981);
  static const Color statusWarning = Color(0xFFF59E0B);
  static const Color statusWarningBg = Color(0x26F59E0B);
  static const Color statusDanger = Color(0xFFEF4444);
  static const Color statusDangerBg = Color(0x26EF4444);
  static const Color statusInfo = Color(0xFF38BDF8);
  static const Color statusInfoBg = Color(0x2638BDF8);

  // Radii
  static const double radiusSm = 6.0;
  static const double radiusMd = 10.0;
  static const double radiusLg = 14.0;
  static const double radiusXl = 20.0;

  // Glow Shadows
  static List<BoxShadow> get tealGlow => [
        const BoxShadow(
          color: Color(0x3300F2FF),
          blurRadius: 16.0,
          spreadRadius: 0.0,
          offset: Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get cardShadow => [
        const BoxShadow(
          color: Color(0x40000000),
          blurRadius: 12.0,
          spreadRadius: 0.0,
          offset: Offset(0, 4),
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
        backgroundColor: surfaceDark,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 18.0,
          fontWeight: FontWeight.w600,
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
        fillColor: surfaceSecondary,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        hintStyle: const TextStyle(color: textLightMuted, fontSize: 14.0),
        labelStyle: const TextStyle(color: textMuted, fontSize: 14.0),
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
          borderSide: const BorderSide(color: primarySky, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: statusDanger, width: 1.0),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primarySky,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 14.0),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMd),
          ),
          textStyle: const TextStyle(
            fontSize: 14.0,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.2,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          elevation: 0,
          side: const BorderSide(color: borderMedium, width: 1.0),
          padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 12.0),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMd),
          ),
          textStyle: const TextStyle(
            fontSize: 14.0,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: surfaceDark,
        selectedItemColor: accentTeal,
        unselectedItemColor: textLightMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: TextStyle(fontSize: 11.0, fontWeight: FontWeight.w600),
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
