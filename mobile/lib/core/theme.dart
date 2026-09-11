import 'package:flutter/material.dart';

class AppTheme {
  // ── Brand Palette ────────────────────────────────────────────────
  static const Color primary     = Color(0xFF00C6A7);
  static const Color primaryGlow = Color(0x3300C6A7);
  static const Color accent      = Color(0xFF5B8BFF);
  static const Color danger      = Color(0xFFFF4C6A);
  static const Color dangerGlow  = Color(0x33FF4C6A);
  static const Color warning     = Color(0xFFFFB547);
  static const Color warningGlow = Color(0x33FFB547);
  static const Color success     = Color(0xFF00E096);
  static const Color successGlow = Color(0x3300E096);
  static const Color purple      = Color(0xFFAA7EFF);
  static const Color purpleGlow  = Color(0x33AA7EFF);

  // ── Surfaces ─────────────────────────────────────────────────────
  static const Color bgBase      = Color(0xFF060C18);
  static const Color bgCard      = Color(0xFF0D1424);
  static const Color bgElevated  = Color(0xFF131D30);
  static const Color bgGlass     = Color(0x1A5B8BFF);
  static const Color border      = Color(0xFF1C2A45);
  static const Color borderGlow  = Color(0xFF243656);

  // ── Text ─────────────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFFE8F0FF);
  static const Color textSecondary = Color(0xFF7A90B8);
  static const Color textMuted     = Color(0xFF3D5070);

  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: const ColorScheme.dark(
      primary: primary,
      secondary: accent,
      error: danger,
      surface: bgCard,
      onPrimary: Colors.black,
      onSecondary: Colors.white,
      onSurface: textPrimary,
    ),
    scaffoldBackgroundColor: bgBase,
    cardColor: bgCard,
    dividerColor: border,
    textTheme: const TextTheme(
      displayLarge: TextStyle(
        color: textPrimary, fontSize: 34,
        fontWeight: FontWeight.w800, letterSpacing: -1,
      ),
      headlineLarge: TextStyle(
        color: textPrimary, fontSize: 26,
        fontWeight: FontWeight.w700, letterSpacing: -0.5,
      ),
      headlineMedium: TextStyle(
        color: textPrimary, fontSize: 20,
        fontWeight: FontWeight.w700,
      ),
      titleLarge: TextStyle(
        color: textPrimary, fontSize: 17,
        fontWeight: FontWeight.w600,
      ),
      titleMedium: TextStyle(
        color: textPrimary, fontSize: 15,
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: TextStyle(
        color: textPrimary, fontSize: 15,
        fontWeight: FontWeight.w400,
      ),
      bodyMedium: TextStyle(
        color: textSecondary, fontSize: 13,
      ),
      labelSmall: TextStyle(
        color: textMuted, fontSize: 10,
        fontWeight: FontWeight.w600, letterSpacing: 1.2,
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: bgBase,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: TextStyle(
        color: textPrimary, fontSize: 18, fontWeight: FontWeight.w700,
      ),
      iconTheme: IconThemeData(color: textPrimary),
    ),
    cardTheme: CardThemeData(
      color: bgCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: bgElevated,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: primary, width: 1.5),
      ),
      labelStyle: const TextStyle(color: textSecondary),
      hintStyle: const TextStyle(color: textMuted),
      prefixIconColor: textSecondary,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.black,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 28),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: bgCard,
      selectedItemColor: primary,
      unselectedItemColor: textMuted,
      showSelectedLabels: true,
      showUnselectedLabels: true,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
  );
}
