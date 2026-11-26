import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { coachApiClient } from "../../src/api/client";
import {
  AQA_OFFICIAL_BADGES,
  AQA_PEDAGOGICAL_STAGES,
  AQA_STROKE_BARS,
  getBadgeImageSource,
  getBadgeLabel,
  getStageLabel,
} from "../../src/assets/badges";
import {
  AqaAmbientBackground,
  AqaBiomechanicalRadar,
  AqaDoubleBezelCard,
  AqaIslandButton,
  AqaNewClientBadge,
  AqaSectionHeader,
  AqaStrokeBar200,
  AqaScreenHeader,
} from "../../src/components/AqaUi";
import { normalizeMember, type SwimMemberSummary } from "../../src/contract";
import { useCoachStore } from "../../src/state/CoachStore";
import { aqaColors } from "../../src/theme/tokens";

interface ReviewHistoryItem {
  id: string;
  createdAt: string;
  coachName: string;
  overallLevel: string;
  evaluatorNotes?: string | null;
  sessionVolumeMeters?: number | null;
  bars?: Record<string, number>;
}

export default function SwimmerProfileDossierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale, bootstrap, isRtl } = useCoachStore();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<SwimMemberSummary | null>(null);
  const [reviews, setReviews] = useState<ReviewHistoryItem[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await coachApiClient.getMemberProfile(id);
        const mRaw =
          res.member && typeof res.member === "object"
            ? (res.member as Record<string, unknown>)
            : res;
        setMember(normalizeMember(mRaw));

        const rawRevs = Array.isArray(res.reviews)
          ? (res.reviews as Array<Record<string, unknown>>)
          : Array.isArray(res.techReviews)
          ? (res.techReviews as Array<Record<string, unknown>>)
          : [];

        setReviews(
          rawRevs.map((r, idx) => {
            const skills =
              r.skills && typeof r.skills === "object"
                ? (r.skills as Record<string, unknown>)
                : {};
            const meta =
              skills._meta && typeof skills._meta === "object"
                ? (skills._meta as Record<string, unknown>)
                : {};
            const bars =
              skills.bars && typeof skills.bars === "object"
                ? (skills.bars as Record<string, number>)
                : undefined;
            const coachObj =
              r.coach && typeof r.coach === "object"
                ? (r.coach as Record<string, unknown>)
                : null;
            return {
              id: String(r.id || `rev-${idx}`),
              createdAt: String(r.createdAt || "").slice(0, 10),
              coachName: String(
                r.coachName || coachObj?.name || "Coach AQA"
              ),
              overallLevel: String(
                r.recommendedLevel || r.overallLevel || "Evaluation AQA"
              ),
              evaluatorNotes:
                typeof r.observation === "string"
                  ? r.observation
                  : typeof r.evaluatorNotes === "string"
                  ? r.evaluatorNotes
                  : null,
              sessionVolumeMeters:
                meta.sessionVolumeMeters != null
                  ? Number(meta.sessionVolumeMeters)
                  : null,
              bars,
            };
          })
        );
      } catch {
        const cached = (bootstrap?.swimmers ?? []).find((s) => s.id === id);
        if (cached) setMember(cached);
      } finally {
        setLoading(false);
      }
    })();
  }, [bootstrap?.swimmers, id]);

  if (loading || !member) {
    return (
      <AqaAmbientBackground>
        <AqaScreenHeader title={t("common.loading")} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={aqaColors.accent} />
        </View>
      </AqaAmbientBackground>
    );
  }

  const activeStageIndex = AQA_PEDAGOGICAL_STAGES.findIndex(
    (s) => s.key === member.stageKey
  );
  const unlockedSet = new Set(
    member.unlockedBadges.map((b) => b.toLowerCase())
  );
  unlockedSet.add(member.badgeKey.toLowerCase());

  return (
    <AqaAmbientBackground>
      {/* Top Bar */}
      <AqaScreenHeader
        title={t("member.file_title")}
        rightSlot={
          <AqaIslandButton
            label={t("member.evaluate")}
            icon="create-outline"
            compact
            onPress={() => router.push(`/members/${member.id}/review`)}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* 1. Hero Swimmer Dossier Card */}
        <AqaDoubleBezelCard glowEffect padding={18}>
          <View style={styles.heroTopRow}>
            {/* 72x72 Badge + 28x28 Stage Mascot Overlay */}
            <View style={styles.heroAvatarStack}>
              <View style={styles.heroBadgeBox}>
                <Image
                  source={getBadgeImageSource(member.badgeAsset)}
                  style={styles.heroBadgeImg}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.heroStageOverlay}>
                <Image
                  source={getBadgeImageSource(member.stageAsset)}
                  style={{ width: 20, height: 20 }}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text numberOfLines={1} style={styles.heroName}>
                  {member.fullName}
                </Text>
                {member.isNewClient ? <AqaNewClientBadge compact /> : null}
              </View>
              <Text style={styles.heroSubText}>
                {member.groupName || member.category.toUpperCase()}{" "}
                {member.swimId ? `• #${member.swimId}` : ""}
              </Text>

              <View style={styles.heroPillsRow}>
                <View style={styles.badgeChip}>
                  <Text style={styles.badgeChipText}>
                    {member.badgeLabel.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.stageChip}>
                  <Text style={styles.stageChipText}>{member.stageLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 4-Column KPI Strip */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCell}>
              <Text style={[styles.kpiVal, { color: aqaColors.success }]}>
                {member.totalPresences}
              </Text>
              <Text style={styles.kpiCaption}>{t("attendance.present")}</Text>
            </View>
            <View style={styles.kpiCell}>
              <Text style={[styles.kpiVal, { color: aqaColors.danger }]}>
                {member.totalAbsences}
              </Text>
              <Text style={styles.kpiCaption}>{t("attendance.absent")}</Text>
            </View>
            <View style={styles.kpiCell}>
              <Text style={[styles.kpiVal, { color: aqaColors.primaryHover }]}>
                {member.attendanceRate}%
              </Text>
              <Text style={styles.kpiCaption}>{t("member.kpi_rate")}</Text>
            </View>
            <View style={styles.kpiCell}>
              <Text style={[styles.kpiVal, { color: aqaColors.accent }]}>
                {member.totalDistanceMeters}m
              </Text>
              <Text style={styles.kpiCaption}>{t("member.kpi_volume")}</Text>
            </View>
          </View>
        </AqaDoubleBezelCard>

        {/* 2. Word from your Coach */}
        {member.wordFromCoach ? (
          <AqaDoubleBezelCard accentColor={aqaColors.accent} padding={15}>
            <Text style={styles.coachWordTitle}>
              {t("suivi.word_from_coach")}
            </Text>
            <Text style={styles.coachWordBody}>"{member.wordFromCoach}"</Text>
          </AqaDoubleBezelCard>
        ) : null}

        {/* 3. 5-Axis Biomechanical Radar + 5 Stroke Progress Bars (0-200%) */}
        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow={t("member.biomech_eyebrow")}
            title={t("suivi.bars_title")}
            subtitle={t("member.bars_subtitle")}
          />
          <AqaBiomechanicalRadar bars={member.bars} locale={locale} />
          <View style={{ gap: 10, marginTop: 10 }}>
            {AQA_STROKE_BARS.map((def) => (
              <AqaStrokeBar200
                key={def.key}
                barKey={def.key}
                value={member.bars[def.key] ?? 0}
                locale={locale}
                isLastTouched={member.lastTouchedBar === def.key}
                readOnly
                compact
              />
            ))}
          </View>
        </AqaDoubleBezelCard>

        {/* 4. Bilan & Records Metrics Grid */}
        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow={t("member.records_eyebrow")}
            title={t("member.records_title")}
          />
          <View style={styles.metricsGrid}>
            <View style={styles.metricTile}>
              <Text style={[styles.metricValue, { color: aqaColors.accent }]}>
                {member.totalDistanceMeters} m
              </Text>
              <Text style={styles.metricLabel}>{t("member.volume_total")}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text
                style={[styles.metricValue, { color: aqaColors.primaryHover }]}
              >
                {member.record50m != null ? `${member.record50m} s` : "--"}
              </Text>
              <Text style={styles.metricLabel}>{t("member.record_50m")}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={[styles.metricValue, { color: aqaColors.accent }]}>
                {member.recordApnea != null ? `${member.recordApnea} m` : "--"}
              </Text>
              <Text style={styles.metricLabel}>{t("member.record_apnea")}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={[styles.metricValue, { color: aqaColors.success }]}>
                {member.weightKg != null ? `${member.weightKg} kg` : "--"} /{" "}
                {member.heightCm != null ? `${member.heightCm} cm` : "--"}
              </Text>
              <Text style={styles.metricLabel}>{t("member.weight_height")}</Text>
            </View>
          </View>
        </AqaDoubleBezelCard>

        {/* 5. 6-Stage Pedagogical Pathway Roadmap */}
        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow={t("member.path_eyebrow")}
            title={t("member.path_title")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roadmapRow}
          >
            {AQA_PEDAGOGICAL_STAGES.map((stage, idx) => {
              const isCurrent = stage.key === member.stageKey;
              const isReached =
                activeStageIndex >= 0 ? idx <= activeStageIndex : idx === 0;
              return (
                <React.Fragment key={stage.key}>
                  <View
                    style={styles.roadmapNode}
                    accessible
                    accessibilityLabel={`${getStageLabel(stage, locale)}${
                      isCurrent
                        ? `, ${t("member.stage_current")}`
                        : isReached
                        ? `, ${t("member.stage_reached")}`
                        : ""
                    }`}
                  >
                    <View
                      style={[
                        styles.roadmapCircle,
                        isReached && { borderColor: aqaColors.primaryHover },
                        isCurrent && styles.roadmapCircleActive,
                      ]}
                    >
                      <Image
                        source={getBadgeImageSource(stage.asset)}
                        style={styles.roadmapImg}
                        resizeMode="contain"
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.roadmapLabel,
                        isCurrent && {
                          color: aqaColors.accent,
                          fontWeight: "900",
                        },
                      ]}
                    >
                      {getStageLabel(stage, locale)}
                    </Text>
                  </View>
                  {idx < AQA_PEDAGOGICAL_STAGES.length - 1 ? (
                    <Ionicons
                      name={isRtl ? "chevron-back" : "chevron-forward"}
                      size={16}
                      color={aqaColors.textMuted}
                      style={styles.roadmapArrow}
                      accessible={false}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </ScrollView>
        </AqaDoubleBezelCard>

        {/* 6. 15 Official AQA Suivi Badges Trophy Grid */}
        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow={t("member.trophy_eyebrow")}
            title={t("member.trophy_title")}
            subtitle={t("member.badges_unlocked", { count: unlockedSet.size })}
          />
          <View style={styles.badgeTrophyGrid}>
            {AQA_OFFICIAL_BADGES.map((badge) => {
              const unlocked = unlockedSet.has(badge.key.toLowerCase());
              const isCurrent =
                member.badgeKey.toLowerCase() === badge.key.toLowerCase();
              return (
                <View
                  key={badge.key}
                  accessible
                  accessibilityLabel={`${getBadgeLabel(badge, locale)}, ${
                    unlocked ? t("member.badge_unlocked") : t("member.badge_locked")
                  }`}
                  style={[
                    styles.trophyCell,
                    unlocked && styles.trophyCellUnlocked,
                    isCurrent && styles.trophyCellCurrent,
                  ]}
                >
                  <Image
                    source={getBadgeImageSource(badge.asset)}
                    style={[styles.trophyImg, !unlocked && { opacity: 0.35 }]}
                    resizeMode="contain"
                  />
                  {!unlocked ? (
                    <View style={styles.trophyLock}>
                      <Ionicons name="lock-closed" size={12} color={aqaColors.textMuted} />
                    </View>
                  ) : null}
                  <Text numberOfLines={1} style={styles.trophyName}>
                    {getBadgeLabel(badge, locale)}
                  </Text>
                </View>
              );
            })}
          </View>
        </AqaDoubleBezelCard>

        {/* 7. Evaluation History Timeline */}
        <AqaSectionHeader
          eyebrow={t("member.history_eyebrow")}
          title={t("member.reviews_count", { count: reviews.length })}
        />
        {reviews.length === 0 ? (
          <AqaDoubleBezelCard padding={24}>
            <View style={{ alignItems: "center", gap: 10 }}>
              <Ionicons name="document-text-outline" size={32} color={aqaColors.textLight} accessible={false} />
              <Text style={styles.emptyText}>{t("member.empty_history")}</Text>
            </View>
          </AqaDoubleBezelCard>
        ) : null}
        {reviews.map((rev) => (
          <AqaDoubleBezelCard key={rev.id} padding={14}>
            <View style={styles.rowBetween}>
              <Text style={styles.revDate}>{rev.createdAt}</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {rev.sessionVolumeMeters ? (
                  <View style={styles.revVolChip}>
                    <Text style={styles.revVolChipText}>
                      +{rev.sessionVolumeMeters} m
                    </Text>
                  </View>
                ) : null}
                <View style={styles.revLevelChip}>
                  <Text style={styles.revLevelChipText}>
                    {rev.overallLevel.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.revCoach}>
              {t("member.evaluator")}: {rev.coachName}
            </Text>
            {rev.evaluatorNotes ? (
              <View style={styles.revNotesBox}>
                <Text style={styles.revNotesText}>{rev.evaluatorNotes}</Text>
              </View>
            ) : null}
          </AqaDoubleBezelCard>
        ))}

        <AqaIslandButton
          label={t("suivi.new_review")}
          icon="add-circle-outline"
          onPress={() => router.push(`/members/${member.id}/review`)}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </AqaAmbientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 24,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroAvatarStack: {
    width: 74,
    height: 74,
    position: "relative",
  },
  heroBadgeBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#060B16",
    borderWidth: 1.5,
    borderColor: "rgba(0, 242, 255, 0.45)",
    padding: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeImg: {
    width: "100%",
    height: "100%",
  },
  heroStageOverlay: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0B1120",
    borderWidth: 1.5,
    borderColor: aqaColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroName: {
    flex: 1,
    color: aqaColors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  heroSubText: {
    color: aqaColors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  heroPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  badgeChip: {
    backgroundColor: "rgba(14, 165, 233, 0.16)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: aqaColors.primaryHover,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  badgeChipText: {
    color: aqaColors.primaryHover,
    fontSize: 12,
    fontWeight: "900",
  },
  stageChip: {
    backgroundColor: "rgba(0, 242, 255, 0.14)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: aqaColors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  stageChipText: {
    color: aqaColors.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: aqaColors.borderSubtle,
  },
  kpiCell: {
    flex: 1,
    backgroundColor: "#060B16",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  kpiVal: {
    fontSize: 15,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  kpiCaption: {
    color: aqaColors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  coachWordTitle: {
    color: aqaColors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  coachWordBody: {
    color: aqaColors.textPrimary,
    fontSize: 13.5,
    fontStyle: "italic",
    marginTop: 6,
    lineHeight: 19,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metricTile: {
    width: "48%",
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    padding: 12,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  metricLabel: {
    color: aqaColors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  roadmapRow: {
    alignItems: "center",
    gap: 4,
    marginTop: 14,
  },
  roadmapNode: {
    width: 68,
    alignItems: "center",
    gap: 5,
  },
  roadmapCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#060B16",
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  roadmapCircleActive: {
    borderWidth: 2,
    borderColor: aqaColors.accent,
    backgroundColor: "rgba(0, 242, 255, 0.16)",
  },
  roadmapImg: {
    width: "100%",
    height: "100%",
  },
  roadmapLabel: {
    color: aqaColors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  roadmapArrow: {
    color: aqaColors.textLight,
    fontSize: 13,
    fontWeight: "900",
  },
  badgeTrophyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  trophyCell: {
    width: "31%",
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 5,
    position: "relative",
  },
  trophyCellUnlocked: {
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  trophyCellCurrent: {
    borderColor: aqaColors.accent,
    backgroundColor: "rgba(0, 242, 255, 0.14)",
  },
  trophyImg: {
    width: 38,
    height: 38,
  },
  trophyName: {
    color: aqaColors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  revDate: {
    color: aqaColors.accent,
    fontSize: 13,
    fontWeight: "900",
  },
  revVolChip: {
    backgroundColor: "rgba(0, 242, 255, 0.14)",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  revVolChipText: {
    color: aqaColors.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  revLevelChip: {
    backgroundColor: "rgba(14, 165, 233, 0.16)",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  revLevelChipText: {
    color: aqaColors.primaryHover,
    fontSize: 12,
    fontWeight: "900",
  },
  revCoach: {
    color: aqaColors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  revNotesBox: {
    backgroundColor: "#060B16",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  revNotesText: {
    color: aqaColors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
  },
  trophyLock: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: aqaColors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: aqaColors.textMuted,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
});
