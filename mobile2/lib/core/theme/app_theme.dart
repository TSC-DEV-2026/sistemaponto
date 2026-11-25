import 'package:flutter/material.dart';

/// Tokens da identidade do sistemaponto, os mesmos do site.
class BrandColors {
  const BrandColors._();

  static const ink = Color(0xFF0A0A0A);
  static const heading = Color(0xFF1B2534);
  static const paper = Color(0xFFF4F4F5);
  static const panel = Color(0xFFF3F4F6);
  static const quiet = Color(0xFF71717A);
  static const placeholder = Color(0xFF9CA3AF);
  static const cta = Color(0xFF084D6E);
  static const ctaDeep = Color(0xFF073F5A);
  /// "ponto" em fundo claro.
  static const wordmark = Color(0xFF084D6E);
  /// "ponto" em fundo escuro (sidebar / faixa da marca).
  static const wordmarkOnDark = Color(0xFF90AFBE);
  /// Faixa da marca no app (mesma família da sidebar do site).
  static const markPanel = Color(0xFF053248);
  static const rep = Color(0xFFB8860B);
  static const focus = Color(0xFF4D7F97);
  static const danger = Color(0xFFEF5350);
  static const warn = Color(0xFFE6B325);
  static const onWarn = Color(0xFF1B2534);
  static const success = Color(0xFF1E8A3A);
  static const field = Color(0xFFE4E8ED);
  static const line = Color(0xFF222222);
  static const stroke = Color(0xFFD9DEE5);
  static const card = Color(0xFFE7EBF0);
  static const tint = Color(0xFFEBF1F3);
  static const white = Color(0xFFFFFFFF);
}

ThemeData appTheme() {
  final scheme =
      ColorScheme.fromSeed(
        seedColor: BrandColors.cta,
        brightness: Brightness.light,
      ).copyWith(
        primary: BrandColors.cta,
        onPrimary: BrandColors.white,
        primaryContainer: BrandColors.tint,
        onPrimaryContainer: BrandColors.ctaDeep,
        secondary: BrandColors.wordmark,
        onSecondary: BrandColors.white,
        error: BrandColors.danger,
        onError: BrandColors.white,
        surface: BrandColors.white,
        onSurface: BrandColors.heading,
        onSurfaceVariant: BrandColors.quiet,
        outline: BrandColors.field,
        outlineVariant: BrandColors.card,
      );
  const radius = BorderRadius.all(Radius.circular(10));
  const fieldBorder = OutlineInputBorder(
    borderRadius: radius,
    borderSide: BorderSide(color: BrandColors.field),
  );
  final text = Typography.material2021().black.apply(
    bodyColor: BrandColors.heading,
    displayColor: BrandColors.heading,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: BrandColors.paper,
    canvasColor: BrandColors.paper,
    dividerColor: BrandColors.card,
    textTheme: text.copyWith(
      bodySmall: text.bodySmall?.copyWith(color: BrandColors.quiet),
      labelLarge: text.labelLarge?.copyWith(
        fontWeight: FontWeight.w600,
        color: BrandColors.heading,
      ),
    ),
    iconTheme: const IconThemeData(color: BrandColors.quiet),
    appBarTheme: const AppBarTheme(
      backgroundColor: BrandColors.white,
      foregroundColor: BrandColors.heading,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: BrandColors.white,
      surfaceTintColor: Colors.transparent,
      indicatorColor: BrandColors.cta.withValues(alpha: 0.12),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: selected ? BrandColors.cta : BrandColors.quiet,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          color: selected ? BrandColors.cta : BrandColors.quiet,
        );
      }),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: BrandColors.cta,
        foregroundColor: BrandColors.white,
        disabledBackgroundColor: BrandColors.line,
        disabledForegroundColor: BrandColors.placeholder,
        minimumSize: const Size(64, 48),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        elevation: 0,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: BrandColors.ink,
        minimumSize: const Size(64, 40),
        side: const BorderSide(color: BrandColors.stroke),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: BrandColors.cta,
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: BrandColors.white,
      labelStyle: const TextStyle(
        color: BrandColors.heading,
        fontWeight: FontWeight.w600,
        fontSize: 14,
      ),
      floatingLabelStyle: const TextStyle(
        color: BrandColors.ctaDeep,
        fontWeight: FontWeight.w600,
      ),
      hintStyle: const TextStyle(color: BrandColors.placeholder, fontSize: 14),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      border: fieldBorder,
      enabledBorder: fieldBorder,
      focusedBorder: fieldBorder.copyWith(
        borderSide: const BorderSide(color: BrandColors.focus, width: 1.5),
      ),
      errorBorder: fieldBorder.copyWith(
        borderSide: const BorderSide(color: BrandColors.danger),
      ),
      focusedErrorBorder: fieldBorder.copyWith(
        borderSide: const BorderSide(color: BrandColors.danger, width: 1.5),
      ),
    ),
    cardTheme: const CardThemeData(
      color: BrandColors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(14)),
        side: BorderSide(color: BrandColors.card),
      ),
    ),
    extensions: const [
      FeedbackColors(
        success: BrandColors.success,
        onSuccess: BrandColors.white,
        warning: BrandColors.warn,
        onWarning: BrandColors.onWarn,
        danger: BrandColors.danger,
        onDanger: BrandColors.white,
      ),
    ],
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: BrandColors.cta,
    ),
    snackBarTheme: const SnackBarThemeData(
      backgroundColor: BrandColors.heading,
      contentTextStyle: TextStyle(color: BrandColors.white),
    ),
  );
}

class FeedbackColors extends ThemeExtension<FeedbackColors> {
  const FeedbackColors({
    required this.success,
    required this.onSuccess,
    required this.warning,
    required this.onWarning,
    required this.danger,
    required this.onDanger,
  });

  final Color success;
  final Color onSuccess;
  final Color warning;
  final Color onWarning;
  final Color danger;
  final Color onDanger;

  @override
  FeedbackColors copyWith({
    Color? success,
    Color? onSuccess,
    Color? warning,
    Color? onWarning,
    Color? danger,
    Color? onDanger,
  }) {
    return FeedbackColors(
      success: success ?? this.success,
      onSuccess: onSuccess ?? this.onSuccess,
      warning: warning ?? this.warning,
      onWarning: onWarning ?? this.onWarning,
      danger: danger ?? this.danger,
      onDanger: onDanger ?? this.onDanger,
    );
  }

  @override
  FeedbackColors lerp(ThemeExtension<FeedbackColors>? other, double t) {
    if (other is! FeedbackColors) {
      return this;
    }
    return FeedbackColors(
      success: Color.lerp(success, other.success, t)!,
      onSuccess: Color.lerp(onSuccess, other.onSuccess, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      onWarning: Color.lerp(onWarning, other.onWarning, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      onDanger: Color.lerp(onDanger, other.onDanger, t)!,
    );
  }
}
