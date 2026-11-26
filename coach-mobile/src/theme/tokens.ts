/**
 * AQA "Dark Ocean" design tokens matching src/app/globals.css in AQA ERP.
 *
 * Contrast (WCAG 2.x, measured against background #030712 and every surface below):
 * - textPrimary >= 13.9:1, textMuted >= 6.1:1, textLight >= 5.6:1 (normal text needs 4.5:1).
 * - Filled buttons use dark `onPrimary` text: 5.3:1 on danger up to 9.3:1 on warning.
 *   White text on these fills fails (2.1:1 to 3.7:1), so never use it there.
 */
export const aqaColors = {
  background: "#030712",
  surface: "#0f172a",
  surfaceSecondary: "#1e293b",
  // Layered dark surfaces, from lowest to highest elevation.
  surfaceSunken: "#070C18",
  surfaceRaised: "#0B1120",
  surfaceControl: "#111C33",
  surfaceSelected: "#13223D",
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.15)",
  borderAccent: "rgba(0, 242, 255, 0.38)",
  primary: "#0ea5e9",
  primaryHover: "#38bdf8",
  onPrimary: "#030712",
  accent: "#00f2ff",
  accentGlow: "rgba(0, 242, 255, 0.15)",
  accentTint: "rgba(0, 242, 255, 0.12)",
  rippleLight: "rgba(255, 255, 255, 0.12)",
  rippleDark: "rgba(3, 7, 18, 0.18)",
  text: "#f8fafc",
  textPrimary: "#f8fafc",
  // Was #64748b (4.2:1 on background, 3.1:1 on cards): failed WCAG for normal text.
  textLight: "#8b9bb4",
  muted: "#94a3b8",
  textMuted: "#94a3b8",
  mutedLight: "#8b9bb4",
  textMutedLight: "#8b9bb4",
  success: "#10b981",
  statusSuccess: "#10b981",
  statusSuccessSoft: "rgba(16, 185, 129, 0.14)",
  warning: "#f59e0b",
  statusWarning: "#f59e0b",
  statusWarningSoft: "rgba(245, 158, 11, 0.14)",
  danger: "#ef4444",
  // Use for red text on raised surfaces (#ef4444 drops to 4.2:1 on surfaceSelected).
  dangerText: "#f87171",
  statusDanger: "#ef4444",
  statusDangerSoft: "rgba(239, 68, 68, 0.14)",
  info: "#38bdf8",
  statusInfo: "#38bdf8",
  statusInfoSoft: "rgba(56, 189, 248, 0.14)",
} as const;

export const AqaTokens = {
  colors: aqaColors,
  radii: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    pill: 999,
  },
  spacing: {
    xxs: 4,
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
  },
  // Type scale: nothing below 12 so labels stay readable at the pool side.
  fontSize: {
    caption: 12,
    label: 13,
    body: 15,
    bodyLarge: 16,
    title: 17,
    headline: 20,
    display: 24,
  },
  // 48 meets Android 48dp and iOS 44pt. Smaller visuals add hitSlop to reach it.
  touch: {
    min: 48,
    compact: 40,
    gap: 8,
  },
  icon: {
    sm: 16,
    md: 20,
    lg: 24,
  },
  // Durations in ms; skip animation entirely when reduce motion is on.
  motion: {
    press: 100,
    fast: 150,
    base: 220,
    slow: 300,
  },
  typography: {
    fontUi: "Inter",
    fontMono: "JetBrains Mono",
    baseSize: 14,
    lineHeight: 22,
  },
} as const;
