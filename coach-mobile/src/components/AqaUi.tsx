import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { AQA_IMAGES, AQA_STROKE_BARS, getBadgeImageSource, getStrokeBarLabel, getStrokeBarShortLabel } from "../assets/badges";
import { coachApiClient } from "../api/client";
import type { StrokeBarKey, StrokeBars } from "../contract";
import type { SupportedLocale } from "../i18n/translations";
import { useCoachStore } from "../state/CoachStore";
import { aqaColors } from "../theme/tokens";

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
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  glowEffect?: boolean;
  accentColor?: string;
  padding?: number;
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
      <TouchableOpacity activeOpacity={0.82} onPress={onPress}>
        {content}
      </TouchableOpacity>
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
}) {
  const bg = danger
    ? aqaColors.danger
    : success
    ? aqaColors.success
    : secondary
    ? "#111C33"
    : aqaColors.primary;

  const border = danger
    ? "rgba(239, 68, 68, 0.55)"
    : success
    ? "rgba(16, 185, 129, 0.55)"
    : secondary
    ? "rgba(56, 189, 248, 0.35)"
    : "rgba(0, 242, 255, 0.45)";

  const textCol = secondary ? aqaColors.accent : "#FFFFFF";

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      disabled={disabled || loading || !onPress}
      onPress={onPress}
      style={[
        styles.islandBtn,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingVertical: compact ? 9 : 13,
          paddingHorizontal: compact ? 12 : 18,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textCol} />
      ) : (
        <Text
          numberOfLines={1}
          style={[
            styles.islandBtnText,
            {
              color: textCol,
              fontSize: compact ? 11.5 : 13.5,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
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
        <Text style={styles.sectionTitle}>{title}</Text>
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
  return (
    <View
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
        compact && { paddingHorizontal: 5, paddingVertical: 1.5 },
      ]}
    >
      <Text style={[styles.newClientBadgeText, compact && { fontSize: 8.5 }]}>
        NEW
      </Text>
    </View>
  );
}

export function LanguageSwitcherPill({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useCoachStore();
  const langs: Array<{ code: SupportedLocale; label: string }> = [
    { code: "fr", label: "FR" },
    { code: "en", label: "EN" },
    { code: "ar", label: "AR" },
  ];

  return (
    <View style={styles.langPillWrap}>
      {langs.map((item) => {
        const active = locale === item.code;
        return (
          <Pressable
            key={item.code}
            onPress={() => void setLocale(item.code)}
            style={[
              styles.langPillItem,
              compact && { paddingHorizontal: 7, paddingVertical: 4 },
              active && styles.langPillItemActive,
            ]}
          >
            <Text
              style={[
                styles.langPillText,
                compact && { fontSize: 10 },
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
    <View style={styles.segmentedWrap}>
      {values.map((val, idx) => {
        const active = val === selectedValue;
        return (
          <Pressable
            key={String(val)}
            onPress={() => onValueChanged(val)}
            style={[styles.segmentedItem, active && styles.segmentedItemActive]}
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
      <View style={styles.trackContainer}>
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
        <View style={{ marginTop: 10, gap: 6 }}>
          <View style={styles.stepButtonRow}>
            {stepValues.map((delta) => (
              <Pressable
                key={delta}
                onPress={() =>
                  onChange(Math.max(0, Math.min(200, clamped + delta)))
                }
                style={[
                  styles.stepControlBtn,
                  delta > 0 && styles.stepControlBtnPositive,
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
                    style={[
                      styles.presetChip,
                      selected && {
                        borderColor: activeColor,
                        backgroundColor: "rgba(0, 242, 255, 0.14)",
                      },
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

  return (
    <View style={styles.radarContainer}>
      <View style={{ width: size, height: size, position: "relative" }}>
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
    locale,
    t,
    refreshWorkspace,
    dismissNotification,
    dismissAllNotifications,
    sendTestLocalNotification,
  } = useCoachStore();

  const [notifOpen, setNotifOpen] = useState(false);

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

  return (
    <>
      <View style={styles.execBar}>
        <View style={styles.execBarInner}>
          {/* Coach Logo Mark */}
          <View style={styles.execLogoBox}>
            <Image
              source={AQA_IMAGES.coachLogo}
              style={styles.execLogoImg}
              resizeMode="cover"
            />
          </View>

          {/* Coach Name + Role Pill */}
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.execCoachName}>
              {user?.name || "Coach AQA"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
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
                <Text style={[styles.execRoleText, { color: roleColor }]}>
                  {(user?.roleDisplay || "COACH").toUpperCase()}
                </Text>
              </View>
              {outboxItems.length > 0 ? (
                <View style={styles.offlineQueuePill}>
                  <Text style={styles.offlineQueuePillText}>
                    SYNC: {outboxItems.length}
                  </Text>
                </View>
              ) : null}
              {rejectedItems.length > 0 ? (
                <View style={[styles.offlineQueuePill, { borderColor: aqaColors.danger }]}>
                  <Text style={[styles.offlineQueuePillText, { color: aqaColors.danger }]}>
                    ERR: {rejectedItems.length}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <LanguageSwitcherPill compact />

          {/* Notification Bell */}
          <Pressable
            onPress={() => setNotifOpen(true)}
            style={[
              styles.execIconBtn,
              totalBadgeCount > 0 && { borderColor: "rgba(0, 242, 255, 0.45)" },
            ]}
          >
            <Text
              style={[
                styles.execIconBtnText,
                totalBadgeCount > 0 && { color: aqaColors.accent },
              ]}
            >
              {totalBadgeCount > 0 ? `ALERT (${totalBadgeCount})` : "ALERT"}
            </Text>
            {totalBadgeCount > 0 ? <View style={styles.notifDot} /> : null}
          </Pressable>

          {/* Refresh Button */}
          <Pressable
            onPress={() => void refreshWorkspace()}
            style={styles.execIconBtn}
          >
            <Text style={styles.execIconBtnText}>
              {isRefreshing ? "..." : "SYNC"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Notification Center Modal Sheet */}
      <Modal
        visible={notifOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.notifSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.notifHeaderRow}>
              <Text style={styles.notifHeaderTitle}>
                {t("notif.center_title")}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <AqaIslandButton
                  label={t("notif.test_short")}
                  compact
                  secondary
                  onPress={() => void sendTestLocalNotification()}
                />
                {activeNotifs.length > 0 ? (
                  <Pressable
                    onPress={() =>
                      void dismissAllNotifications(activeNotifs.map((n) => n.id))
                    }
                    style={styles.clearAllBtn}
                  >
                    <Text style={styles.clearAllBtnText}>
                      {t("notif.clear_all")}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => setNotifOpen(false)}
                  style={styles.closeModalBtn}
                >
                  <Text style={styles.closeModalBtnText}>X</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
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
                    {locale === "ar"
                      ? `طلب استخلاف من ${rep.originalCoachName}`
                      : `Demande de remplacement: ${rep.originalCoachName}`}
                  </Text>
                  <Text style={styles.repNotifMeta}>
                    {rep.groupName} • {rep.sessionDate} ({rep.startTime}-{rep.endTime})
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <AqaIslandButton
                      label={t("replacements.decline")}
                      compact
                      secondary
                      style={{ flex: 1 }}
                      onPress={async () => {
                        await coachApiClient.respondReplacement(rep.id, false);
                        await refreshWorkspace();
                      }}
                    />
                    <AqaIslandButton
                      label={t("replacements.accept")}
                      compact
                      success
                      style={{ flex: 1 }}
                      onPress={async () => {
                        await coachApiClient.respondReplacement(rep.id, true);
                        await refreshWorkspace();
                      }}
                    />
                  </View>
                </AqaDoubleBezelCard>
              ))}

              {activeNotifs.map((n) => {
                const isNewClient = n.type.includes("new_client");
                const accent = isNewClient ? aqaColors.success : aqaColors.primaryHover;
                return (
                  <AqaDoubleBezelCard key={n.id} accentColor={accent} padding={12}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          {isNewClient ? <AqaNewClientBadge compact /> : null}
                          <Text style={styles.notifItemTitle}>{n.title}</Text>
                        </View>
                        {n.message ? (
                          <Text style={styles.notifItemBody}>{n.message}</Text>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() => void dismissNotification(n.id)}
                        style={{ padding: 4 }}
                      >
                        <Text style={{ color: aqaColors.textMuted, fontSize: 11, fontWeight: "700" }}>
                          X
                        </Text>
                      </Pressable>
                    </View>
                  </AqaDoubleBezelCard>
                );
              })}

              {announcement.length === 0 &&
              incomingReplacements.length === 0 &&
              activeNotifs.length === 0 ? (
                <View style={styles.notifEmptyWrap}>
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
    backgroundColor: "#0B1120",
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
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sectionTitle: {
    color: aqaColors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    color: aqaColors.textMuted,
    fontSize: 11.5,
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
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  langPillWrap: {
    flexDirection: "row",
    backgroundColor: "#070C18",
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
  },
  langPillItem: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  langPillItemActive: {
    backgroundColor: "rgba(14, 165, 233, 0.24)",
  },
  langPillText: {
    color: aqaColors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  langPillTextActive: {
    color: aqaColors.accent,
  },
  segmentedWrap: {
    flexDirection: "row",
    backgroundColor: "#070C18",
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
  },
  segmentedItemActive: {
    backgroundColor: "#13223D",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 255, 0.38)",
  },
  segmentedText: {
    color: aqaColors.textMuted,
    fontSize: 11.5,
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
    fontSize: 13.5,
    fontWeight: "800",
  },
  strokeBarZoneText: {
    fontSize: 10.5,
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
    fontSize: 8.5,
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
    fontSize: 10,
    fontWeight: "700",
  },
  trackLegendTeal: {
    color: aqaColors.accent,
    fontSize: 10,
    fontWeight: "700",
  },
  trackLegendElite: {
    color: aqaColors.warning,
    fontSize: 10,
    fontWeight: "700",
  },
  stepButtonRow: {
    flexDirection: "row",
    gap: 6,
  },
  stepControlBtn: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingVertical: 7,
    alignItems: "center",
  },
  stepControlBtnPositive: {
    borderColor: "rgba(0, 242, 255, 0.32)",
    backgroundColor: "rgba(0, 242, 255, 0.08)",
  },
  stepControlBtnText: {
    color: aqaColors.textPrimary,
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  presetChip: {
    flex: 1,
    backgroundColor: "#070C18",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingVertical: 5,
    alignItems: "center",
  },
  presetChipText: {
    color: aqaColors.textMuted,
    fontSize: 10,
    fontWeight: "800",
  },
  radarContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  radarAxisLabel: {
    color: aqaColors.textMuted,
    fontSize: 9,
    fontWeight: "800",
  },
  radarAxisValue: {
    fontSize: 10,
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
    gap: 8,
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
    fontSize: 14.5,
    fontWeight: "800",
  },
  execRolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  execRoleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  execRoleText: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  offlineQueuePill: {
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: aqaColors.warning,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  offlineQueuePillText: {
    color: aqaColors.warning,
    fontSize: 8.5,
    fontWeight: "900",
  },
  execIconBtn: {
    backgroundColor: "#0F172A",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 6,
    position: "relative",
  },
  execIconBtnText: {
    color: aqaColors.textMuted,
    fontSize: 10,
    fontWeight: "800",
  },
  notifDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: aqaColors.accent,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.82)",
    justifyContent: "flex-end",
  },
  notifSheet: {
    backgroundColor: "#0B1120",
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
  },
  notifHeaderTitle: {
    color: aqaColors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  clearAllBtnText: {
    color: aqaColors.accent,
    fontSize: 11.5,
    fontWeight: "700",
  },
  closeModalBtn: {
    backgroundColor: "#1E293B",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  closeModalBtnText: {
    color: aqaColors.textPrimary,
    fontSize: 11,
    fontWeight: "800",
  },
  announcementEyebrow: {
    color: aqaColors.primaryHover,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 4,
  },
  announcementBody: {
    color: aqaColors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  repNotifTitle: {
    color: aqaColors.warning,
    fontSize: 13.5,
    fontWeight: "800",
  },
  repNotifMeta: {
    color: aqaColors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  notifItemTitle: {
    color: aqaColors.textPrimary,
    fontSize: 13.5,
    fontWeight: "800",
  },
  notifItemBody: {
    color: aqaColors.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  notifEmptyWrap: {
    paddingVertical: 32,
    alignItems: "center",
  },
  notifEmptyTitle: {
    color: aqaColors.textMuted,
    fontSize: 13.5,
    fontWeight: "700",
  },
});
