import React, { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { coachApiClient } from "../../src/api/client";
import {
  AqaAmbientBackground,
  AqaDoubleBezelCard,
  AqaIslandButton,
  AqaPulseIndicator,
  AqaSectionHeader,
} from "../../src/components/AqaUi";
import type { SwimSessionSummary } from "../../src/contract";
import { useCoachStore } from "../../src/state/CoachStore";
import { aqaColors } from "../../src/theme/tokens";

export default function TodaySessionsScreen() {
  const router = useRouter();
  const { bootstrap, isRefreshing, refreshWorkspace, locale, t } =
    useCoachStore();

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
    } finally {
      setRespondingId(null);
    }
  };

  const renderDateChipLabel = (opt: string) => {
    if (opt === "TODAY") return t("today.filter_today");
    if (opt === "ALL_WEEK") return t("today.filter_week");
    return opt.slice(5); // MM-DD
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
          />
        }
      >
        {/* Urgent Incoming Replacement Requests */}
        {incomingReplacements.length > 0 ? (
          <View style={{ gap: 10, marginBottom: 4 }}>
            <AqaSectionHeader
              eyebrow={
                locale === "ar"
                  ? "طلبات تغطية عاجلة"
                  : locale === "en"
                  ? "URGENT COVERAGE"
                  : "COUVERTURES URGENTES"
              }
              title={t("replacements.incoming")}
            />
            {incomingReplacements.map((rep) => (
              <AqaDoubleBezelCard
                key={rep.id}
                glowEffect
                accentColor={aqaColors.warning}
                padding={15}
              >
                <View style={styles.repHeaderRow}>
                  <Text style={styles.repCoachName}>
                    {locale === "ar"
                      ? `طلب استخلاف من ${rep.originalCoachName}`
                      : locale === "en"
                      ? `Coverage for ${rep.originalCoachName}`
                      : `Demande de ${rep.originalCoachName}`}
                  </Text>
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentBadgeText}>URGENT</Text>
                  </View>
                </View>
                <Text style={styles.repGroupText}>
                  {rep.groupName} ({rep.category.toUpperCase()})
                </Text>
                <Text style={styles.repTimeText}>
                  {rep.sessionDate} • {rep.startTime} - {rep.endTime} •{" "}
                  {rep.pool}
                </Text>
                {rep.reason ? (
                  <Text style={styles.repReasonText}>"{rep.reason}"</Text>
                ) : null}
                <View style={styles.repActionRow}>
                  <AqaIslandButton
                    label={t("replacements.decline")}
                    compact
                    secondary
                    loading={respondingId === rep.id}
                    onPress={() => void handleRespondReplacement(rep.id, false)}
                    style={{ flex: 1 }}
                  />
                  <AqaIslandButton
                    label={t("replacements.accept")}
                    compact
                    success
                    loading={respondingId === rep.id}
                    onPress={() => void handleRespondReplacement(rep.id, true)}
                    style={{ flex: 1 }}
                  />
                </View>
              </AqaDoubleBezelCard>
            ))}
          </View>
        ) : null}

        {/* Schedule Header & KPI */}
        <AqaSectionHeader
          eyebrow="AQA PLANNING & SEANCES"
          title={t("today.title")}
          subtitle={`${filteredSessions.length} ${
            locale === "ar"
              ? "حصة مبرمجة"
              : locale === "en"
              ? "scheduled session(s)"
              : "seance(s) programmee(s)"
          }`}
          rightSlot={
            <View style={styles.datePillBadge}>
              <AqaPulseIndicator color={aqaColors.accent} size={6} />
              <Text style={styles.datePillBadgeText}>{todayIso}</Text>
            </View>
          }
        />

        {/* Horizontal Date Filter Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateChipStrip}
        >
          {dateFilterOptions.map((opt) => {
            const active = selectedDateFilter === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setSelectedDateFilter(opt)}
                style={[styles.dateChip, active && styles.dateChipActive]}
              >
                {active ? (
                  <View style={styles.dateChipDot} />
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
          <AqaDoubleBezelCard padding={32}>
            <View style={{ alignItems: "center", gap: 8 }}>
              <Text style={styles.emptyTitle}>{t("today.empty")}</Text>
              <AqaIslandButton
                label={t("today.filter_week")}
                compact
                secondary
                onPress={() => setSelectedDateFilter("ALL_WEEK")}
                style={{ marginTop: 6 }}
              />
            </View>
          </AqaDoubleBezelCard>
        ) : (
          filteredSessions.map((session) => (
            <SessionExecutiveCard
              key={session.id}
              session={session}
              locale={locale}
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
  locale,
  t,
  onOpenAttendance,
  onOpenQuickLogger,
  onOpenQr,
}: {
  session: SwimSessionSummary;
  locale: string;
  t: (k: string) => string;
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

  const statusColor = session.isCancelled
    ? aqaColors.danger
    : session.isCompleted
    ? aqaColors.success
    : aqaColors.primaryHover;

  const statusLabel = session.isCancelled
    ? locale === "ar"
      ? "ملغاة"
      : "ANNULEE"
    : session.isCompleted
    ? locale === "ar"
      ? "مكتملة"
      : "CLOTUREE"
    : locale === "ar"
    ? "مبرمجة"
    : "PROGRAMMEE";

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
          <View style={styles.sessionTitleRow}>
            <Text numberOfLines={1} style={styles.sessionGroupName}>
              {session.groupName}
            </Text>
            <View
              style={[
                styles.statusPill,
                {
                  borderColor: `${statusColor}66`,
                  backgroundColor: `${statusColor}1A`,
                },
              ]}
            >
              <Text style={[styles.statusPillText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.sessionMetaRow}>
            {session.category ? (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>
                  {session.category.toUpperCase()}
                </Text>
              </View>
            ) : null}
            {session.isReplacement ? (
              <View style={styles.replacementChip}>
                <Text style={styles.replacementChipText}>REMPLACEMENT</Text>
              </View>
            ) : null}
            <Text numberOfLines={1} style={styles.poolText}>
              {session.sessionDate} • {session.pool}
            </Text>
          </View>
        </View>
      </View>

      {/* Attendance Progress Bar */}
      <View style={styles.progressSection}>
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
        <Text style={styles.progressCounter}>
          {session.presentCount} / {session.totalMembers || "--"}{" "}
          {t("attendance.present")}
        </Text>
      </View>

      {/* Action Buttons: 3-Step Quick Logger + Full Sheet + QR Scan */}
      <View style={styles.actionRow}>
        {!session.isViewOnly ? (
          <AqaIslandButton
            label={t("today.quick_3_steps")}
            compact
            onPress={onOpenQuickLogger}
            style={{ flex: 1.25 }}
          />
        ) : null}
        <AqaIslandButton
          label={t("today.open_attendance")}
          compact
          secondary={!session.isViewOnly}
          onPress={onOpenAttendance}
          style={{ flex: 1 }}
        />
        {!session.isViewOnly ? (
          <AqaIslandButton
            label="QR"
            compact
            secondary
            onPress={onOpenQr}
            style={{ paddingHorizontal: 14 }}
          />
        ) : null}
      </View>
    </AqaDoubleBezelCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 110,
  },
  repHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  repCoachName: {
    color: aqaColors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  urgentBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: aqaColors.warning,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  urgentBadgeText: {
    color: aqaColors.warning,
    fontSize: 9,
    fontWeight: "900",
  },
  repGroupText: {
    color: aqaColors.accent,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  repTimeText: {
    color: aqaColors.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  repReasonText: {
    color: aqaColors.textLight,
    fontSize: 11.5,
    fontStyle: "italic",
    marginTop: 4,
  },
  repActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  datePillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#080E1E",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  datePillBadgeText: {
    color: aqaColors.textPrimary,
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  dateChipStrip: {
    gap: 8,
    paddingVertical: 2,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#080E1E",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  dateChipActive: {
    backgroundColor: "#13223D",
    borderColor: "rgba(0, 242, 255, 0.45)",
  },
  dateChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: aqaColors.accent,
  },
  dateChipText: {
    color: aqaColors.textMuted,
    fontSize: 11.5,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  dateChipTextActive: {
    color: aqaColors.textPrimary,
    fontWeight: "800",
  },
  emptyTitle: {
    color: aqaColors.textMuted,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeBlock: {
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 242, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 64,
  },
  timeStartText: {
    color: aqaColors.accent,
    fontSize: 13.5,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  timeEndText: {
    color: aqaColors.textMuted,
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  sessionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  sessionGroupName: {
    flex: 1,
    color: aqaColors.textPrimary,
    fontSize: 15.5,
    fontWeight: "800",
  },
  statusPill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
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
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  catBadgeText: {
    color: aqaColors.primaryHover,
    fontSize: 9.5,
    fontWeight: "800",
  },
  replacementChip: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  replacementChipText: {
    color: aqaColors.warning,
    fontSize: 9,
    fontWeight: "900",
  },
  poolText: {
    color: aqaColors.textMuted,
    fontSize: 11.5,
    fontVariant: ["tabular-nums"],
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
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
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
});
