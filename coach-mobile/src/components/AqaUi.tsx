import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AQA_IMAGES, AQA_STROKE_BARS, getBadgeImageSource, getStrokeBarLabel, getStrokeBarShortLabel } from "../assets/badges";
import { coachApiClient } from "../api/client";
import type { StrokeBarKey, StrokeBars } from "../contract";
import type { SupportedLocale } from "../i18n/translations";
import { useCoachStore } from "../state/CoachStore";
import { AqaTokens, aqaColors } from "../theme/tokens";

export type AqaIconName = React.ComponentProps<typeof Ionicons>["name"];

const T = AqaTokens;

/** Pressed feedback that never changes layout bounds: opacity only, plus ripple on Android. */
const pressedOpacity = ({ pressed }: PressableStateCallbackType) =>
  pressed ? { opacity: 0.82 } : null;

/** Expands a small visual control to the 48dp minimum without changing its look. */
function hitSlopFor(visualHeight: number) {
  const pad = Math.max(0, Math.ceil((T.touch.min - visualHeight) / 2));
  return { top: pad, bottom: pad, left: 4, right: 4 };
}

/**
 * Header for stack screens (opened on top of the tabs). Adds the status-bar / notch inset,
 * a 48pt back button that mirrors in Arabic, and a title announced as a heading.
 */
export function AqaScreenHeader({
  title,
  subtitle,
  rightSlot,
  onBack,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useCoachStore();

  return (
    <View style={[styles.screenHeader, { paddingTop: insets.top + 8 }]}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        android_ripple={{ color: aqaColors.rippleLight, borderless: true }}
        style={(state) => [styles.screenHeaderBack, pressedOpacity(state)]}
      >
        <Ionicons
          name={isRtl ? "chevron-forward" : "chevron-back"}
          size={T.icon.lg}
          color={aqaColors.accent}
        />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.screenHeaderTitle} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.screenHeaderSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightSlot}
    </View>
  );
}

export function AqaAmbientBackground({
  children,
  showOceanImage = true,
}: {
  children: React.ReactNode;
  showOceanImage?: boolean;
}) {
  return (
    <View style={styles.ambientRoot}>
      {showOceanImage ? (
        <ImageBackground
          source={AQA_IMAGES.oceanBg}
          style={StyleSheet.absoluteFill}
          imageStyle={{ opacity: 0.08 }}
          resizeMode="cover"
        />
      ) : null}
      <View style={styles.ambientTopGlow} pointerEvents="none" />
      <View style={styles.ambientBottomGlow} pointerEvents="none" />
      {children}
    </View>
  );
}

export function AqaDoubleBezelCard({
  children,
  style,
  onPress,
  glowEffect = false,
  accentColor,
  padding = 16,
  accessibilityLabel,
  accessibilityHint,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  glowEffect?: boolean;
  accentColor?: string;
  padding?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const borderColor = accentColor
    ? `${accentColor}66`
    : glowEffect
    ? "rgba(0, 242, 255, 0.36)"
    : "rgba(255, 255, 255, 0.09)";

  const topSpecularColor = accentColor
    ? `${accentColor}99`
    : glowEffect
    ? "rgba(0, 242, 255, 0.65)"
    : "rgba(255, 255, 255, 0.16)";

  const content = (
    <View
      style={[
        styles.bezelOuter,
        {
          borderColor,
          padding,
        },
        glowEffect && styles.bezelGlowShadow,
        style,
      ]}
    >
      <View
        style={[
          styles.bezelTopHighlight,
          { backgroundColor: topSpecularColor },
        ]}
        pointerEvents="none"
      />
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={pressedOpacity}
        android_ripple={{ color: aqaColors.rippleLight, foreground: true }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

export function AqaIslandButton({
  label,
  onPress,
  secondary = false,
  danger = false,
  success = false,
  compact = false,
  loading = false,
  disabled = false,
  style,
  icon,
  accessibilityLabel,
  accessibilityHint,
}: {
  label: string;
  onPress?: () => void;
  secondary?: boolean;
  danger?: boolean;
  success?: boolean;
  compact?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Optional leading icon; it is decorative because the label is always visible. */
  icon?: AqaIconName;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const bg = danger
    ? aqaColors.danger
    : success
    ? aqaColors.success
    : secondary
    ? aqaColors.surfaceControl
    : aqaColors.primary;

  const border = danger
    ? "rgba(239, 68, 68, 0.55)"
    : success
    ? "rgba(16, 185, 129, 0.55)"
    : secondary
    ? "rgba(56, 189, 248, 0.35)"
    : "rgba(0, 242, 255, 0.45)";

  // Dark text on every filled variant: white fails contrast on all of them.
  const textCol = secondary ? aqaColors.accent : aqaColors.onPrimary;
  const isDisabled = disabled || loading || !onPress;
  const height = compact ? T.touch.compact : T.touch.min;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      hitSlop={compact ? hitSlopFor(height) : undefined}
      android_ripple={{
        color: secondary ? aqaColors.rippleLight : aqaColors.rippleDark,
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={(state) => [
        styles.islandBtn,
        {
          backgroundColor: bg,
          borderColor: border,
          minHeight: height,
          paddingHorizontal: compact ? 12 : 18,
          opacity: disabled ? 0.5 : 1,
        },
        !disabled && pressedOpacity(state),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textCol} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={compact ? T.icon.sm : T.icon.md}
              color={textCol}
              accessible={false}
              importantForAccessibility="no"
            />
          ) : null}
          <Text
            numberOfLines={1}
            style={[
              styles.islandBtnText,
              {
                color: textCol,
                fontSize: compact ? T.fontSize.label : T.fontSize.body,
              },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function AqaSectionHeader({
  eyebrow,
  title,
  subtitle,
  rightSlot,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightSlot ? <View style={{ marginLeft: 10 }}>{rightSlot}</View> : null}
    </View>
  );
}

export function AqaPulseIndicator({
  color = aqaColors.accent,
  size = 7,
}: {
  color?: string;
  size?: number;
}) {
  // Decorative status dot: always paired with text, so hidden from screen readers.
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: 0.85,
        shadowRadius: 5,
        elevation: 3,
      }}
    />
  );
}

export function AqaNewClientBadge({ compact = false }: { compact?: boolean }) {
  return (
    <View
      style={[
        styles.newClientBadge,
        compact && { paddingHorizontal: 5, paddingVertical: 1 },
      ]}
    >
      <Text style={styles.newClientBadgeText}>
        NEW
      </Text>
    </View>
  );
}

export function LanguageSwitcherPill({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useCoachStore();
  // Spoken name of each language, in that language, so screen readers announce it correctly.
  const langs: Array<{ code: SupportedLocale; label: string; spoken: string }> = [
    { code: "fr", label: "FR", spoken: "Français" },
    { code: "en", label: "EN", spoken: "English" },
    { code: "ar", label: "AR", spoken: "العربية" },
  ];
  const itemHeight = compact ? 28 : 32;

  return (
    <View style={styles.langPillWrap} accessibilityRole="radiogroup">
      {langs.map((item) => {
        const active = locale === item.code;
        return (
          <Pressable
            key={item.code}
            onPress={() => void setLocale(item.code)}
            hitSlop={hitSlopFor(itemHeight)}
            accessibilityRole="radio"
            accessibilityLabel={item.spoken}
            accessibilityState={{ checked: active }}
            style={(state) => [
              styles.langPillItem,
              { minHeight: itemHeight },
              compact && { paddingHorizontal: 8 },
              active && styles.langPillItemActive,
              pressedOpacity(state),
            ]}
          >
            <Text
              style={[
                styles.langPillText,
                active && styles.langPillTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AqaSegmentedControl<T extends string | number>({
  values,
  labels,
  selectedValue,
  onValueChanged,
}: {
  values: readonly T[];
  labels: string[];
  selectedValue: T;
  onValueChanged: (val: T) => void;
}) {
  return (
    <View style={styles.segmentedWrap} accessibilityRole="tablist">
      {values.map((val, idx) => {
        const active = val === selectedValue;
        return (
          <Pressable
            key={String(val)}
            onPress={() => onValueChanged(val)}
            accessibilityRole="tab"
            accessibilityLabel={labels[idx] ?? String(val)}
            accessibilityState={{ selected: active }}
            style={(state) => [
              styles.segmentedItem,
              active && styles.segmentedItemActive,
              pressedOpacity(state),
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.segmentedText, active && styles.segmentedTextActive]}
            >
              {labels[idx] ?? String(val)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AqaStrokeBar200({
  barKey,
  value,
  locale,
  isLastTouched = false,
  onChange,
  readOnly = false,
  compact = false,
}: {
  barKey: StrokeBarKey;
  value: number;
  locale: SupportedLocale;
  isLastTouched?: boolean;
  onChange?: (nextVal: number) => void;
  readOnly?: boolean;
  compact?: boolean;
}) {
  const def = AQA_STROKE_BARS.find((b) => b.key === barKey) ?? AQA_STROKE_BARS[0];
  const clamped = Math.max(0, Math.min(200, Math.round(value)));
  const isElite = clamped > 100;
  const activeColor = isElite ? aqaColors.warning : aqaColors.accent;
  const techPct = Math.min(100, clamped) / 2; // 0..50% of 200-bar width
  const elitePct = Math.max(0, clamped - 100) / 2; // 0..50% of 200-bar width

  const zoneText = isElite
    ? locale === "ar"
      ? "نخبة (تحمل، سرعة، قوة)"
      : locale === "en"
      ? "Elite (Endurance, Speed, Strength)"
      : "Elite (Endurance, Vitesse, Force)"
    : locale === "ar"
    ? "تقييم تقني (0-100%)"
    : locale === "en"
    ? "Technical (0-100%)"
    : "Technique (0-100%)";

  const stepValues = [-10, -5, 5, 10, 25];
  const presetValues = [0, 50, 100, 150, 200];

  return (
    <View
      style={[
        styles.strokeBarBox,
        isLastTouched && {
          borderColor: "rgba(0, 242, 255, 0.42)",
          backgroundColor: "rgba(14, 165, 233, 0.08)",
        },
        compact && { padding: 10 },
      ]}
    >
      <View style={styles.strokeBarHeader}>
        <View style={styles.strokeBarTitleRow}>
          <Image
            source={getBadgeImageSource(def.asset)}
            style={styles.strokeMascotImg}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text numberOfLines={1} style={styles.strokeBarTitle}>
                {getStrokeBarLabel(def, locale)}
              </Text>
              {isLastTouched ? (
                <View style={styles.lastTouchedChip}>
                  <Text style={styles.lastTouchedChipText}>
                    {locale === "ar" ? "نشط" : "ACTIVE"}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.strokeBarZoneText, { color: activeColor }]}>
              {zoneText}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.strokePctBadge,
            {
              borderColor: activeColor,
              backgroundColor: isElite
                ? "rgba(245, 158, 11, 0.16)"
                : "rgba(0, 242, 255, 0.14)",
            },
          ]}
        >
          <Text style={[styles.strokePctText, { color: activeColor }]}>
            {clamped}%
          </Text>
        </View>
      </View>

      {/* 2-Zone Visual Progress Track (0-100% Tech | 100-200% Elite) */}
      <View
        style={styles.trackContainer}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${getStrokeBarLabel(def, locale)}, ${zoneText}`}
        accessibilityValue={{ min: 0, max: 200, now: clamped, text: `${clamped}%` }}
      >
        <View style={styles.trackBackground}>
          {techPct > 0 ? (
            <View
              style={[
                styles.trackFillTech,
                {
                  width: `${techPct}%`,
                  borderTopRightRadius: elitePct > 0 ? 0 : 999,
                  borderBottomRightRadius: elitePct > 0 ? 0 : 999,
                },
              ]}
            />
          ) : null}
          {elitePct > 0 ? (
            <View
              style={[
                styles.trackFillElite,
                {
                  width: `${elitePct}%`,
                },
              ]}
            />
          ) : null}
        </View>
        <View style={styles.trackMidDivider} pointerEvents="none" />
      </View>

      <View style={styles.trackLegendRow}>
        <Text style={styles.trackLegendMuted}>0%</Text>
        <Text style={styles.trackLegendTeal}>
          {locale === "ar"
            ? "100% (تقني مكتمل)"
            : locale === "en"
            ? "100% (Tech Complete)"
            : "100% (Technique acquise)"}
        </Text>
        <Text style={styles.trackLegendElite}>200% (Elite)</Text>
      </View>

      {!readOnly && onChange ? (
        <View style={{ marginTop: 10, gap: T.touch.gap }}>
          <View style={styles.stepButtonRow}>
            {stepValues.map((delta) => (
              <Pressable
                key={delta}
                onPress={() =>
                  onChange(Math.max(0, Math.min(200, clamped + delta)))
                }
                accessibilityRole="button"
                accessibilityLabel={`${getStrokeBarLabel(def, locale)} ${
                  delta > 0 ? `+${delta}` : delta
                }%`}
                android_ripple={{ color: aqaColors.rippleLight }}
                style={(state) => [
                  styles.stepControlBtn,
                  delta > 0 && styles.stepControlBtnPositive,
                  pressedOpacity(state),
                ]}
              >
                <Text
                  style={[
                    styles.stepControlBtnText,
                    delta > 0 && { color: aqaColors.accent },
                  ]}
                >
                  {delta > 0 ? `+${delta}%` : `${delta}%`}
                </Text>
              </Pressable>
            ))}
          </View>
          {!compact ? (
            <View style={styles.stepButtonRow}>
              {presetValues.map((preset) => {
                const selected = clamped === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => onChange(preset)}
                    hitSlop={hitSlopFor(T.touch.compact)}
                    accessibilityRole="button"
                    accessibilityLabel={`${getStrokeBarLabel(def, locale)} ${preset}%`}
                    accessibilityState={{ selected }}
                    style={(state) => [
                      styles.presetChip,
                      selected && {
                        borderColor: activeColor,
                        backgroundColor: "rgba(0, 242, 255, 0.14)",
                      },
                      pressedOpacity(state),
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        selected && { color: activeColor },
                      ]}
                    >
                      {preset}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * 5-Axis Biomechanical Radar & Progress Matrix rendered natively
 */
export function AqaBiomechanicalRadar({
  bars,
  locale,
}: {
  bars: StrokeBars;
  locale: SupportedLocale;
}) {
  const size = 210;
  const center = size / 2;
  const maxRadius = 72;
  const numSides = 5;
  const startAngle = -Math.PI / 2;
  const angleStep = (2 * Math.PI) / numSides;

  const points = AQA_STROKE_BARS.map((def, i) => {
    const rawPct = Math.max(0, Math.min(200, bars[def.key] ?? 0));
    const ratio = Math.max(0.15, Math.min(1, rawPct / 100));
    const angle = startAngle + i * angleStep;
    const x = center + maxRadius * ratio * Math.cos(angle);
    const y = center + maxRadius * ratio * Math.sin(angle);
    const labelX = center + (maxRadius + 24) * Math.cos(angle);
    const labelY = center + (maxRadius + 20) * Math.sin(angle);
    return {
      key: def.key,
      label: getStrokeBarShortLabel(def, locale),
      pct: rawPct,
      x,
      y,
      labelX,
      labelY,
      angle,
    };
  });

  // The radar is drawn from Views, so give screen readers the numbers as one summary.
  const radarSummary = points.map((pt) => `${pt.label} ${pt.pct}%`).join(", ");

  return (
    <View
      style={styles.radarContainer}
      accessible
      accessibilityRole="image"
      accessibilityLabel={radarSummary}
    >
      <View
        style={{ width: size, height: size, position: "relative" }}
        importantForAccessibility="no-hide-descendants"
      >
        {/* Concentric radar rings */}
        {[0.25, 0.5, 0.75, 1].map((ring) => {
          const r = maxRadius * ring;
          return (
            <View
              key={ring}
              style={{
                position: "absolute",
                left: center - r,
                top: center - r,
                width: r * 2,
                height: r * 2,
                borderRadius: r,
                borderWidth: 1,
                borderColor:
                  ring === 1
                    ? "rgba(0, 242, 255, 0.28)"
                    : "rgba(255, 255, 255, 0.08)",
                backgroundColor:
                  ring === 0.25 ? "rgba(0, 242, 255, 0.04)" : "transparent",
              }}
            />
          );
        })}

        {/* Axis spokes & Polygon Edge Connectors */}
        {points.map((pt, idx) => {
          const nextPt = points[(idx + 1) % points.length];
          const dx = nextPt.x - pt.x;
          const dy = nextPt.y - pt.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const edgeAngle = Math.atan2(dy, dx);
          const midX = (pt.x + nextPt.x) / 2;
          const midY = (pt.y + nextPt.y) / 2;

          return (
            <React.Fragment key={pt.key}>
              {/* Edge line between vertex idx and idx+1 */}
              <View
                style={{
                  position: "absolute",
                  left: midX - length / 2,
                  top: midY - 1,
                  width: length,
                  height: 2,
                  backgroundColor: aqaColors.accent,
                  transform: [{ rotate: `${edgeAngle}rad` }],
                }}
              />
              {/* Vertex glow dot */}
              <View
                style={{
                  position: "absolute",
                  left: pt.x - 5,
                  top: pt.y - 5,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: pt.pct > 100 ? aqaColors.warning : aqaColors.accent,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                }}
              />
              {/* Axis Label */}
              <View
                style={{
                  position: "absolute",
                  left: pt.labelX - 34,
                  top: pt.labelY - 12,
                  width: 68,
                  alignItems: "center",
                }}
              >
                <Text style={styles.radarAxisLabel}>{pt.label}</Text>
                <Text
                  style={[
                    styles.radarAxisValue,
                    {
                      color:
                        pt.pct > 100 ? aqaColors.warning : aqaColors.accent,
                    },
                  ]}
                >
                  {pt.pct}%
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Top Executive AppBar matching coach-app HomeScreen AppBar + Notification Center Sheet
 */
export function AqaExecutiveHeader() {
  const {
    user,
    bootstrap,
    notifySettings,
    outboxItems,
    rejectedItems,
    isRefreshing,
    t,
    refreshWorkspace,
    dismissNotification,
    dismissAllNotifications,
    sendTestLocalNotification,
  } = useCoachStore();

  const [notifOpen, setNotifOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const isHead = user?.isHeadCoach === true;
  const isAssistant = user?.isAssistant === true;
  const roleColor = isHead
    ? aqaColors.warning
    : isAssistant
    ? aqaColors.textMuted
    : aqaColors.primaryHover;

  const activeNotifs = (bootstrap?.coachNotifications ?? []).filter(
    (n) => !notifySettings.dismissedIds.includes(n.id)
  );
  const incomingReplacements = (bootstrap?.pendingRequests ?? []).filter(
    (r) => r.isIncomingRequest
  );
  const totalBadgeCount = activeNotifs.length + incomingReplacements.length;
  const announcement =
    typeof bootstrap?.appConfig?.announcement === "string"
      ? bootstrap.appConfig.announcement.trim()
      : "";

  const respondToReplacement = async (id: string, accept: boolean) => {
    try {
      await coachApiClient.respondReplacement(id, accept);
      await refreshWorkspace();
    } catch (err) {
      Alert.alert(t("common.error"), err instanceof Error ? err.message : t("common.error"));
    }
  };

  const bellLabel =
    totalBadgeCount > 0
      ? `${t("header.notifications")}, ${t("header.notifications_count", { count: totalBadgeCount })}`
      : t("header.notifications");

  return (
    <>
      <View style={styles.execBar}>
        <View style={styles.execBarInner}>
          {/* Coach Logo Mark (decorative: the coach name beside it is the visible label) */}
          <View style={styles.execLogoBox} importantForAccessibility="no-hide-descendants">
            <Image
              source={AQA_IMAGES.coachLogo}
              style={styles.execLogoImg}
              resizeMode="cover"
              accessible={false}
            />
          </View>

          {/* Coach Name + Role + Sync status */}
          <View style={{ flex: 1 }} accessible accessibilityRole="header">
            <Text numberOfLines={1} style={styles.execCoachName}>
              {user?.name || "Coach AQA"}
            </Text>
            <View style={styles.execMetaRow}>
              <View
                style={[
                  styles.execRolePill,
                  {
                    borderColor: `${roleColor}66`,
                    backgroundColor: `${roleColor}1F`,
                  },
                ]}
              >
                <View style={[styles.execRoleDot, { backgroundColor: roleColor }]} />
                <Text style={[styles.execRoleText, { color: roleColor }]} numberOfLines={1}>
                  {(user?.roleDisplay || "COACH").toUpperCase()}
                </Text>
              </View>
              {outboxItems.length > 0 ? (
                <View
                  style={styles.statusChip}
                  accessible
                  accessibilityLabel={t("common.pending_sync", { count: outboxItems.length })}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={T.icon.sm}
                    color={aqaColors.warning}
                    accessible={false}
                  />
                  <Text style={[styles.statusChipText, { color: aqaColors.warning }]}>
                    {outboxItems.length}
                  </Text>
                </View>
              ) : null}
              {rejectedItems.length > 0 ? (
                <View
                  style={[styles.statusChip, { borderColor: aqaColors.dangerText }]}
                  accessible
                  accessibilityLabel={t("common.rejected_sync", { count: rejectedItems.length })}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={T.icon.sm}
                    color={aqaColors.dangerText}
                    accessible={false}
                  />
                  <Text style={[styles.statusChipText, { color: aqaColors.dangerText }]}>
                    {rejectedItems.length}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Refresh */}
          <Pressable
            onPress={() => void refreshWorkspace()}
            disabled={isRefreshing}
            accessibilityRole="button"
            accessibilityLabel={t("common.refresh")}
            accessibilityState={{ busy: isRefreshing, disabled: isRefreshing }}
            android_ripple={{ color: aqaColors.rippleLight, borderless: true }}
            style={(state) => [styles.execIconBtn, pressedOpacity(state)]}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={aqaColors.accent} />
            ) : (
              <Ionicons name="refresh" size={T.icon.md} color={aqaColors.textMuted} />
            )}
          </Pressable>

          {/* Notification Bell with count badge */}
          <Pressable
            onPress={() => setNotifOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={bellLabel}
            android_ripple={{ color: aqaColors.rippleLight, borderless: true }}
            style={(state) => [
              styles.execIconBtn,
              totalBadgeCount > 0 && { borderColor: aqaColors.borderAccent },
              pressedOpacity(state),
            ]}
          >
            <Ionicons
              name={totalBadgeCount > 0 ? "notifications" : "notifications-outline"}
              size={T.icon.md}
              color={totalBadgeCount > 0 ? aqaColors.accent : aqaColors.textMuted}
            />
            {totalBadgeCount > 0 ? (
              <View style={styles.countBadge} importantForAccessibility="no-hide-descendants">
                <Text style={styles.countBadgeText}>
                  {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {/* Notification Center Modal Sheet */}
      <Modal
        visible={notifOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setNotifOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          {/* Tapping the dimmed area closes the sheet; the close button stays the labelled path. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setNotifOpen(false)}
            accessible={false}
            importantForAccessibility="no"
          />
          <View
            style={[styles.notifSheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
            accessibilityViewIsModal
          >
            <View style={styles.sheetHandle} />
            <View style={styles.notifHeaderRow}>
              <Text style={styles.notifHeaderTitle} accessibilityRole="header" numberOfLines={2}>
                {t("notif.center_title")}
              </Text>
              <Pressable
                onPress={() => setNotifOpen(false)}
                hitSlop={hitSlopFor(36)}
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
                style={(state) => [styles.closeModalBtn, pressedOpacity(state)]}
              >
                <Ionicons name="close" size={T.icon.md} color={aqaColors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.notifActionsRow}>
              <AqaIslandButton
                label={t("notif.test_short")}
                icon="notifications-outline"
                compact
                secondary
                onPress={() => void sendTestLocalNotification()}
              />
              {activeNotifs.length > 0 ? (
                <AqaIslandButton
                  label={t("notif.clear_all")}
                  icon="checkmark-done-outline"
                  compact
                  secondary
                  onPress={() =>
                    void dismissAllNotifications(activeNotifs.map((n) => n.id))
                  }
                />
              ) : null}
            </View>

            <ScrollView
              style={{ maxHeight: 460 }}
              contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
            >
              {announcement.length > 0 ? (
                <AqaDoubleBezelCard accentColor={aqaColors.primary} padding={12}>
                  <Text style={styles.announcementEyebrow}>
                    {t("notif.official_announcement")}
                  </Text>
                  <Text style={styles.announcementBody}>{announcement}</Text>
                </AqaDoubleBezelCard>
              ) : null}

              {incomingReplacements.map((rep) => (
                <AqaDoubleBezelCard
                  key={rep.id}
                  accentColor={aqaColors.warning}
                  padding={12}
                >
                  <Text style={styles.repNotifTitle}>
                    {t("notif.replacement_request", { name: rep.originalCoachName })}
                  </Text>
                  <Text style={styles.repNotifMeta}>
                    {rep.groupName} • {rep.sessionDate} ({rep.startTime}-{rep.endTime})
                  </Text>
                  <View style={{ flexDirection: "row", gap: T.touch.gap, marginTop: 10 }}>
                    <AqaIslandButton
                      label={t("replacements.decline")}
                      icon="close-circle-outline"
                      compact
                      secondary
                      style={{ flex: 1 }}
                      onPress={() => void respondToReplacement(rep.id, false)}
                    />
                    <AqaIslandButton
                      label={t("replacements.accept")}
                      icon="checkmark-circle-outline"
                      compact
                      success
                      style={{ flex: 1 }}
                      onPress={() => void respondToReplacement(rep.id, true)}
                    />
                  </View>
                </AqaDoubleBezelCard>
              ))}

              {activeNotifs.map((n) => {
                const isNewClient = n.type.includes("new_client");
                const accent = isNewClient ? aqaColors.success : aqaColors.primaryHover;
                return (
                  <AqaDoubleBezelCard key={n.id} accentColor={accent} padding={12}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {isNewClient ? <AqaNewClientBadge compact /> : null}
                          <Text style={styles.notifItemTitle}>{n.title}</Text>
                        </View>
                        {n.message ? (
                          <Text style={styles.notifItemBody}>{n.message}</Text>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() => void dismissNotification(n.id)}
                        hitSlop={hitSlopFor(32)}
                        accessibilityRole="button"
                        accessibilityLabel={`${t("notif.dismiss")}: ${n.title}`}
                        style={(state) => [styles.dismissBtn, pressedOpacity(state)]}
                      >
                        <Ionicons name="close" size={T.icon.sm} color={aqaColors.textMuted} />
                      </Pressable>
                    </View>
                  </AqaDoubleBezelCard>
                );
              })}

              {announcement.length === 0 &&
              incomingReplacements.length === 0 &&
              activeNotifs.length === 0 ? (
                <View style={styles.notifEmptyWrap}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={T.icon.lg + 8}
                    color={aqaColors.textLight}
                    accessible={false}
                  />
                  <Text style={styles.notifEmptyTitle}>{t("notif.empty")}</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  ambientRoot: {
    flex: 1,
    backgroundColor: aqaColors.background,
  },
  ambientTopGlow: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0, 242, 255, 0.06)",
  },
  ambientBottomGlow: {
    position: "absolute",
    bottom: -140,
    left: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(14, 165, 233, 0.06)",
  },
  bezelOuter: {
    backgroundColor: aqaColors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  bezelGlowShadow: {
    shadowColor: aqaColors.accent,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  bezelTopHighlight: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1.5,
    borderRadius: 2,
  },
  islandBtn: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  islandBtnText: {
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionEyebrow: {
    color: aqaColors.accent,
    fontSize: T.fontSize.caption,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sectionTitle: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.title,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.label,
    marginTop: 2,
  },
  newClientBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.18)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: aqaColors.success,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newClientBadgeText: {
    color: aqaColors.success,
    fontSize: T.fontSize.caption,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  langPillWrap: {
    flexDirection: "row",
    backgroundColor: aqaColors.surfaceSunken,
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
  },
  langPillItem: {
    paddingHorizontal: 9,
    paddingVertical: 0,
    borderRadius: 8,
    justifyContent: "center",
  },
  langPillItemActive: {
    backgroundColor: "rgba(14, 165, 233, 0.24)",
  },
  langPillText: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.caption,
    fontWeight: "800",
  },
  langPillTextActive: {
    color: aqaColors.accent,
  },
  segmentedWrap: {
    flexDirection: "row",
    backgroundColor: aqaColors.surfaceSunken,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    gap: 4,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  segmentedItemActive: {
    backgroundColor: aqaColors.surfaceSelected,
    borderWidth: 1,
    borderColor: aqaColors.borderAccent,
  },
  segmentedText: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.label,
    fontWeight: "700",
  },
  segmentedTextActive: {
    color: aqaColors.accent,
    fontWeight: "800",
  },
  strokeBarBox: {
    backgroundColor: "#080E1E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    padding: 13,
  },
  strokeBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  strokeBarTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  strokeMascotImg: {
    width: 30,
    height: 30,
  },
  strokeBarTitle: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.body,
    fontWeight: "800",
  },
  strokeBarZoneText: {
    fontSize: T.fontSize.caption,
    fontWeight: "700",
    marginTop: 2,
  },
  lastTouchedChip: {
    backgroundColor: "rgba(0, 242, 255, 0.16)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: aqaColors.accent,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  lastTouchedChipText: {
    color: aqaColors.accent,
    fontSize: T.fontSize.caption,
    fontWeight: "900",
  },
  strokePctBadge: {
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  strokePctText: {
    fontSize: 14,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  trackContainer: {
    marginTop: 10,
    position: "relative",
    justifyContent: "center",
  },
  trackBackground: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#050914",
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    flexDirection: "row",
    overflow: "hidden",
  },
  trackFillTech: {
    height: "100%",
    backgroundColor: aqaColors.accent,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },
  trackFillElite: {
    height: "100%",
    backgroundColor: aqaColors.warning,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  trackMidDivider: {
    position: "absolute",
    left: "50%",
    width: 2,
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
  },
  trackLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  trackLegendMuted: {
    color: aqaColors.textLight,
    fontSize: T.fontSize.caption,
    fontWeight: "700",
  },
  trackLegendTeal: {
    color: aqaColors.accent,
    fontSize: T.fontSize.caption,
    fontWeight: "700",
  },
  trackLegendElite: {
    color: aqaColors.warning,
    fontSize: T.fontSize.caption,
    fontWeight: "700",
  },
  stepButtonRow: {
    flexDirection: "row",
    gap: T.touch.gap,
  },
  stepControlBtn: {
    flex: 1,
    backgroundColor: aqaColors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingVertical: 0,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  stepControlBtnPositive: {
    borderColor: "rgba(0, 242, 255, 0.32)",
    backgroundColor: "rgba(0, 242, 255, 0.08)",
  },
  stepControlBtnText: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.label,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  presetChip: {
    flex: 1,
    backgroundColor: aqaColors.surfaceSunken,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingVertical: 0,
    alignItems: "center",
    minHeight: T.touch.compact,
    justifyContent: "center",
  },
  presetChipText: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.caption,
    fontWeight: "800",
  },
  radarContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  radarAxisLabel: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.caption,
    fontWeight: "800",
  },
  radarAxisValue: {
    fontSize: T.fontSize.caption,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  execBar: {
    backgroundColor: "#050914",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  execBarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  execLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 255, 0.38)",
    overflow: "hidden",
  },
  execLogoImg: {
    width: "100%",
    height: "100%",
  },
  execCoachName: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.body,
    fontWeight: "800",
  },
  execRolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  execRoleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  execRoleText: {
    fontSize: T.fontSize.caption,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  execIconBtn: {
    backgroundColor: aqaColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 0,
    paddingVertical: 0,
    position: "relative",
    width: T.touch.min,
    height: T.touch.min,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.82)",
    justifyContent: "flex-end",
  },
  notifSheet: {
    backgroundColor: aqaColors.surfaceRaised,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(0, 242, 255, 0.4)",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
    alignSelf: "center",
    marginBottom: 12,
  },
  notifHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  notifHeaderTitle: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.title,
    fontWeight: "800",
    flex: 1,
  },
  closeModalBtn: {
    backgroundColor: aqaColors.surfaceSecondary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  announcementEyebrow: {
    color: aqaColors.primaryHover,
    fontSize: T.fontSize.caption,
    fontWeight: "800",
    marginBottom: 4,
  },
  announcementBody: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.body,
    lineHeight: 22,
  },
  repNotifTitle: {
    color: aqaColors.warning,
    fontSize: T.fontSize.body,
    fontWeight: "800",
  },
  repNotifMeta: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.label,
    marginTop: 2,
  },
  notifItemTitle: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.body,
    fontWeight: "800",
  },
  notifItemBody: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.label,
    marginTop: 4,
    lineHeight: 19,
  },
  notifEmptyWrap: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 10,
  },
  notifEmptyTitle: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.body,
    fontWeight: "700",
    textAlign: "center",
  },
  execMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
    flexWrap: "wrap",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: aqaColors.warning,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  statusChipText: {
    fontSize: T.fontSize.caption,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  countBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: aqaColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    color: aqaColors.onPrimary,
    fontSize: T.fontSize.caption,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  notifActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  dismissBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: aqaColors.surfaceSecondary,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#060B16",
    borderBottomWidth: 1,
    borderBottomColor: aqaColors.borderSubtle,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  screenHeaderBack: {
    width: T.touch.min,
    height: T.touch.min,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    backgroundColor: aqaColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  screenHeaderTitle: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.title,
    fontWeight: "800",
  },
  screenHeaderSubtitle: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.label,
    marginTop: 2,
  },
});
