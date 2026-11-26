import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { coachApiClient } from "../../src/api/client";
import {
  AqaAmbientBackground,
  AqaDoubleBezelCard,
  AqaIslandButton,
  AqaPulseIndicator,
  AqaSectionHeader,
  type AqaIconName,
} from "../../src/components/AqaUi";
import type { SwimSessionSummary } from "../../src/contract";
import { useCoachStore } from "../../src/state/CoachStore";
import { AqaTokens, aqaColors } from "../../src/theme/tokens";

const T = AqaTokens;

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** YYYY-MM-DD to DD/MM, always with 0-9 digits. */
function shortDate(iso: string): string {
  const [, month, day] = iso.slice(0, 10).split("-");
  return month && day ? `${day}/${month}` : iso;
}

export default function TodaySessionsScreen() {
  const router = useRouter();
  const { bootstrap, isRefreshing, refreshWorkspace, t } = useCoachStore();

  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("TODAY");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const todayIso = useMemo(
    () =>
      (bootstrap?.todayDate || new Date().toISOString().slice(0, 10)).slice(
        0,
        10
      ),
    [bootstrap?.todayDate]
  );

  const allSessions = useMemo(() => {
    const raw =
      (bootstrap?.sessions?.length ?? 0) > 0
        ? bootstrap!.sessions
        : bootstrap?.todaySessions ?? [];
    return [...raw].sort((a, b) => {
      const cmpDate = a.sessionDate.localeCompare(b.sessionDate);
      if (cmpDate !== 0) return cmpDate;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [bootstrap]);

  const dateFilterOptions = useMemo(() => {
    const uniqueDates = Array.from(
      new Set(allSessions.map((s) => s.sessionDate).filter(Boolean))
    ).sort();
    return ["TODAY", "ALL_WEEK", ...uniqueDates];
  }, [allSessions]);

  const filteredSessions = useMemo(() => {
    if (selectedDateFilter === "ALL_WEEK") return allSessions;
    const targetDate =
      selectedDateFilter === "TODAY" ? todayIso : selectedDateFilter;
    const matches = allSessions.filter((s) => s.sessionDate === targetDate);
    if (selectedDateFilter === "TODAY" && matches.length === 0) {
      return bootstrap?.todaySessions ?? [];
    }
    return matches;
  }, [allSessions, bootstrap?.todaySessions, selectedDateFilter, todayIso]);

  const incomingReplacements = useMemo(
    () =>
      (bootstrap?.pendingRequests ?? []).filter((r) => r.isIncomingRequest),
    [bootstrap?.pendingRequests]
  );

  const handleRespondReplacement = async (id: string, accept: boolean) => {
    setRespondingId(id);
    try {
      await coachApiClient.respondReplacement(id, accept);
      await refreshWorkspace();
    } catch (err) {
      Alert.alert(t("common.error"), err instanceof Error ? err.message : t("common.error"));
    } finally {
      setRespondingId(null);
    }
  };

  const renderDateChipLabel = (opt: string) => {
    if (opt === "TODAY") return t("today.filter_today");
    if (opt === "ALL_WEEK") return t("today.filter_week");
    return shortDate(opt);
  };

  return (
    <AqaAmbientBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshWorkspace}
            tintColor={aqaColors.accent}
            colors={[aqaColors.primary]}
          />
        }
      >
        {/* Urgent Incoming Replacement Requests come first: they need an answer. */}
        {incomingReplacements.length > 0 ? (
          <View style={{ gap: 10, marginBottom: 4 }}>
            <AqaSectionHeader
              eyebrow={t("today.urgent_eyebrow")}
              title={t("replacements.incoming")}
            />
            {incomingReplacements.map((rep) => (
              <AqaDoubleBezelCard
                key={rep.id}
                glowEffect
                accentColor={aqaColors.warning}
                padding={16}
              >
                <View style={styles.repHeaderRow}>
                  <Text style={styles.repCoachName} numberOfLines={2}>
                    {t("today.coverage_for", { name: rep.originalCoachName })}
                  </Text>
                  <View style={styles.urgentBadge}>
                    <Ionicons
                      name="alert-circle"
                      size={T.icon.sm}
                      color={aqaColors.warning}
                      accessible={false}
                    />
                    <Text style={styles.urgentBadgeText}>{t("today.urgent")}</Text>
                  </View>
                </View>
                <Text style={styles.repGroupText}>
                  {rep.groupName} ({rep.category.toUpperCase()})
                </Text>
                <View style={styles.metaLine}>
                  <Ionicons name="time-outline" size={T.icon.sm} color={aqaColors.textMuted} accessible={false} />
                  <Text style={styles.repTimeText}>
                    {shortDate(rep.sessionDate)} • {rep.startTime} - {rep.endTime}
                  </Text>
                </View>
                <View style={styles.metaLine}>
                  <Ionicons name="location-outline" size={T.icon.sm} color={aqaColors.textMuted} accessible={false} />
                  <Text style={styles.repTimeText}>{rep.pool}</Text>
                </View>
                {rep.reason ? (
                  <Text style={styles.repReasonText}>"{rep.reason}"</Text>
                ) : null}
                <View style={styles.repActionRow}>
                  <AqaIslandButton
                    label={t("replacements.decline")}
                    icon="close-circle-outline"
                    secondary
                    loading={respondingId === rep.id}
                    disabled={respondingId !== null && respondingId !== rep.id}
                    onPress={() => void handleRespondReplacement(rep.id, false)}
                    style={{ flex: 1 }}
                  />
                  <AqaIslandButton
                    label={t("replacements.accept")}
                    icon="checkmark-circle-outline"
                    success
                    loading={respondingId === rep.id}
                    disabled={respondingId !== null && respondingId !== rep.id}
                    onPress={() => void handleRespondReplacement(rep.id, true)}
                    style={{ flex: 1 }}
                  />
                </View>
              </AqaDoubleBezelCard>
            ))}
          </View>
        ) : null}

        {/* Schedule Header */}
        <AqaSectionHeader
          eyebrow={t("today.planning_eyebrow")}
          title={t("today.title")}
          subtitle={t("today.sessions_count", { count: filteredSessions.length })}
          rightSlot={
            <View style={styles.datePillBadge}>
              <AqaPulseIndicator color={aqaColors.accent} size={6} />
              <Text style={styles.datePillBadgeText}>{shortDate(todayIso)}</Text>
            </View>
          }
        />

        {/* Horizontal Date Filter Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateChipStrip}
          accessibilityRole="radiogroup"
          accessibilityLabel={t("today.date_filters")}
        >
          {dateFilterOptions.map((opt) => {
            const active = selectedDateFilter === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setSelectedDateFilter(opt)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={renderDateChipLabel(opt)}
                style={({ pressed }) => [
                  styles.dateChip,
                  active && styles.dateChipActive,
                  pressed && { opacity: 0.82 },
                ]}
              >
                {active ? (
                  <Ionicons name="checkmark" size={T.icon.sm} color={aqaColors.accent} accessible={false} />
                ) : null}
                <Text
                  style={[
                    styles.dateChipText,
                    active && styles.dateChipTextActive,
                  ]}
                >
                  {renderDateChipLabel(opt)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Session Cards */}
        {filteredSessions.length === 0 ? (
          <AqaDoubleBezelCard padding={28}>
            <View style={{ alignItems: "center", gap: 10 }}>
              <Ionicons
                name="calendar-clear-outline"
                size={T.icon.lg + 12}
                color={aqaColors.textLight}
                accessible={false}
              />
              <Text style={styles.emptyTitle}>{t("today.empty")}</Text>
              {selectedDateFilter !== "ALL_WEEK" ? (
                <AqaIslandButton
                  label={t("today.filter_week")}
                  icon="calendar-outline"
                  compact
                  secondary
                  onPress={() => setSelectedDateFilter("ALL_WEEK")}
                  style={{ marginTop: 4 }}
                />
              ) : null}
            </View>
          </AqaDoubleBezelCard>
        ) : (
          filteredSessions.map((session) => (
            <SessionExecutiveCard
              key={session.id}
              session={session}
              t={t}
              onOpenAttendance={() => router.push(`/sessions/${session.id}`)}
              onOpenQuickLogger={() =>
                router.push(`/sessions/${session.id}?mode=quick`)
              }
              onOpenQr={() => router.push(`/sessions/${session.id}?qr=1`)}
            />
          ))
        )}
      </ScrollView>
    </AqaAmbientBackground>
  );
}

function SessionExecutiveCard({
  session,
  t,
  onOpenAttendance,
  onOpenQuickLogger,
  onOpenQr,
}: {
  session: SwimSessionSummary;
  t: Translate;
  onOpenAttendance: () => void;
  onOpenQuickLogger: () => void;
  onOpenQr: () => void;
}) {
  const fillRatio =
    session.totalMembers > 0
      ? Math.min(1, session.presentCount / session.totalMembers)
      : session.isCompleted
      ? 1
      : 0;

  // Status uses colour, an icon and a word, so it never relies on colour alone.
  const status: { color: string; icon: AqaIconName; label: string } = session.isCancelled
    ? { color: aqaColors.dangerText, icon: "close-circle", label: t("session.status_cancelled") }
    : session.isCompleted
    ? { color: aqaColors.success, icon: "checkmark-circle", label: t("session.status_completed") }
    : { color: aqaColors.primaryHover, icon: "time", label: t("session.status_scheduled") };

  const progressLabel = t("today.attendance_progress", {
    present: session.presentCount,
    total: session.totalMembers || "--",
  });

  return (
    <AqaDoubleBezelCard
      glowEffect={!session.isCompleted && !session.isCancelled}
      accentColor={session.isReplacement ? aqaColors.warning : undefined}
      padding={16}
    >
      <View style={styles.sessionTopRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeStartText}>{session.startTime}</Text>
          <Text style={styles.timeEndText}>{session.endTime}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={styles.sessionGroupName} accessibilityRole="header">
            {session.groupName}
          </Text>

          <View style={styles.sessionMetaRow}>
            <View
              style={[
                styles.statusPill,
                {
                  borderColor: `${status.color}66`,
                  backgroundColor: `${status.color}1A`,
                },
              ]}
            >
              <Ionicons name={status.icon} size={14} color={status.color} accessible={false} />
              <Text style={[styles.statusPillText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
            {session.category ? (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>
                  {session.category.toUpperCase()}
                </Text>
              </View>
            ) : null}
            {session.isReplacement ? (
              <View style={styles.replacementChip}>
                <Ionicons name="swap-horizontal" size={14} color={aqaColors.warning} accessible={false} />
                <Text style={styles.replacementChipText}>{t("today.replacement")}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.metaLine, { marginTop: 6 }]}>
            <Ionicons name="location-outline" size={T.icon.sm} color={aqaColors.textMuted} accessible={false} />
            <Text numberOfLines={1} style={styles.poolText}>
              {shortDate(session.sessionDate)} • {session.pool}
            </Text>
          </View>
        </View>
      </View>

      {/* Attendance Progress Bar */}
      <View
        style={styles.progressSection}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={progressLabel}
        accessibilityValue={{
          min: 0,
          max: Math.max(1, session.totalMembers),
          now: session.presentCount,
        }}
      >
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(fillRatio * 100)}%`,
                backgroundColor: session.isCompleted
                  ? aqaColors.success
                  : aqaColors.accent,
              },
            ]}
          />
        </View>
        <Text style={styles.progressCounter}>{progressLabel}</Text>
      </View>

      {/* Actions: quick 3-step logger is the primary path, full sheet and QR are secondary. */}
      <View style={styles.actionRow}>
        {!session.isViewOnly ? (
          <AqaIslandButton
            label={t("today.quick_3_steps")}
            icon="flash"
            onPress={onOpenQuickLogger}
            style={{ flex: 1 }}
          />
        ) : null}
        <AqaIslandButton
          label={t("today.open_attendance")}
          icon="list"
          secondary={!session.isViewOnly}
          onPress={onOpenAttendance}
          style={{ flex: 1 }}
        />
        {!session.isViewOnly ? (
          <Pressable
            onPress={onOpenQr}
            accessibilityRole="button"
            accessibilityLabel={t("today.scan_qr")}
            android_ripple={{ color: aqaColors.rippleLight, borderless: true }}
            style={({ pressed }) => [styles.qrIconBtn, pressed && { opacity: 0.82 }]}
          >
            <Ionicons name="qr-code-outline" size={T.icon.lg} color={aqaColors.accent} />
          </Pressable>
        ) : null}
      </View>
    </AqaDoubleBezelCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: T.spacing.md,
    gap: 14,
    paddingBottom: T.spacing.xl,
  },
  repHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  repCoachName: {
    flex: 1,
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.bodyLarge,
    fontWeight: "800",
  },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: aqaColors.warning,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  urgentBadgeText: {
    color: aqaColors.warning,
    fontSize: T.fontSize.caption,
    fontWeight: "900",
  },
  repGroupText: {
    color: aqaColors.accent,
    fontSize: T.fontSize.body,
    fontWeight: "800",
    marginTop: 6,
  },
  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  repTimeText: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.label,
    fontVariant: ["tabular-nums"],
  },
  repReasonText: {
    color: aqaColors.textLight,
    fontSize: T.fontSize.label,
    fontStyle: "italic",
    marginTop: 6,
    lineHeight: 19,
  },
  repActionRow: {
    flexDirection: "row",
    gap: T.touch.gap,
    marginTop: 14,
  },
  datePillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: aqaColors.surfaceSunken,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  datePillBadgeText: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.label,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  dateChipStrip: {
    gap: T.touch.gap,
    paddingVertical: 2,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    backgroundColor: aqaColors.surfaceSunken,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 14,
  },
  dateChipActive: {
    backgroundColor: aqaColors.surfaceSelected,
    borderColor: "rgba(0, 242, 255, 0.45)",
  },
  dateChipText: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.label,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  dateChipTextActive: {
    color: aqaColors.textPrimary,
    fontWeight: "800",
  },
  emptyTitle: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.body,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22,
  },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  timeBlock: {
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 242, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 68,
  },
  timeStartText: {
    color: aqaColors.accent,
    fontSize: T.fontSize.title,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  timeEndText: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.caption,
    fontWeight: "700",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  sessionGroupName: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.title,
    fontWeight: "800",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusPillText: {
    fontSize: T.fontSize.caption,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  sessionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  catBadge: {
    backgroundColor: "rgba(14, 165, 233, 0.16)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  catBadgeText: {
    color: aqaColors.primaryHover,
    fontSize: T.fontSize.caption,
    fontWeight: "800",
  },
  replacementChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  replacementChipText: {
    color: aqaColors.warning,
    fontSize: T.fontSize.caption,
    fontWeight: "900",
  },
  poolText: {
    flex: 1,
    color: aqaColors.textMuted,
    fontSize: T.fontSize.label,
    fontVariant: ["tabular-nums"],
  },
  progressSection: {
    gap: 6,
    marginTop: 14,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#060B16",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressCounter: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.label,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  actionRow: {
    flexDirection: "row",
    gap: T.touch.gap,
    marginTop: 14,
  },
  qrIconBtn: {
    width: T.touch.min,
    height: T.touch.min,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
    backgroundColor: aqaColors.surfaceControl,
    alignItems: "center",
    justifyContent: "center",
  },
});
