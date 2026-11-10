/**
 * AQA "Dark Ocean" design tokens matching src/app/globals.css in AQA ERP.
 */
export const aqaColors = {
  background: "#030712",
  surface: "#0f172a",
  surfaceSecondary: "#1e293b",
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.15)",
  primary: "#0ea5e9",
  primaryHover: "#38bdf8",
  accent: "#00f2ff",
  accentGlow: "rgba(0, 242, 255, 0.15)",
  text: "#f8fafc",
  textPrimary: "#f8fafc",
  textLight: "#64748b",
  muted: "#94a3b8",
  textMuted: "#94a3b8",
  mutedLight: "#64748b",
  textMutedLight: "#64748b",
  success: "#10b981",
  statusSuccess: "#10b981",
  statusSuccessSoft: "rgba(16, 185, 129, 0.14)",
  warning: "#f59e0b",
  statusWarning: "#f59e0b",
  statusWarningSoft: "rgba(245, 158, 11, 0.14)",
  danger: "#ef4444",
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
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    fontUi: "Inter",
    fontMono: "JetBrains Mono",
    baseSize: 14,
    lineHeight: 22,
  },
} as const;
