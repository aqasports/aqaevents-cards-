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
import { getBadgeImageSource } from "../../src/assets/badges";
import {
  AqaAmbientBackground,
  AqaDoubleBezelCard,
  AqaIslandButton,
  AqaNewClientBadge,
  AqaSegmentedControl,
  AqaScreenHeader,
} from "../../src/components/AqaUi";
import {
  normalizeMember,
  normalizeSession,
  type SwimMemberSummary,
  type SwimSessionSummary,
} from "../../src/contract";
import { useCoachStore } from "../../src/state/CoachStore";
import { aqaColors } from "../../src/theme/tokens";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, isRtl } = useCoachStore();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [groupInfo, setGroupInfo] = useState<{
    name: string;
    category: string;
    pool: string;
    startTime: string;
    endTime: string;
  }>({
    name: "Groupe AQA",
    category: "",
    pool: "Piscine AQA",
    startTime: "18:00",
    endTime: "19:00",
  });
  const [staffList, setStaffList] = useState<
    Array<{ coachName: string; role: string }>
  >([]);
  const [members, setMembers] = useState<SwimMemberSummary[]>([]);
  const [sessions, setSessions] = useState<SwimSessionSummary[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await coachApiClient.getGroupDetail(id);
        const gObj =
          res.group && typeof res.group === "object"
            ? (res.group as Record<string, unknown>)
            : {};
        setGroupInfo({
          name: String(gObj.name || "Groupe AQA"),
          category: String(gObj.category || ""),
          pool: String(gObj.pool || "Bassin Principal"),
          startTime: String(gObj.startTime || "18:00"),
          endTime: String(gObj.endTime || "19:00"),
        });
        setIsViewOnly(Boolean(res.isViewOnly));

        const rawStaff = Array.isArray(res.staff)
          ? (res.staff as Array<Record<string, unknown>>)
          : [];
        setStaffList(
          rawStaff.map((st) => {
            const coachObj =
              st.coach && typeof st.coach === "object"
                ? (st.coach as Record<string, unknown>)
                : null;
            return {
              coachName: String(
                st.coachName || coachObj?.name || "Coach AQA"
              ),
              role: String(st.role || "coach"),
            };
          })
        );

        const rawMembers = Array.isArray(res.members)
          ? (res.members as Array<Record<string, unknown>>)
          : [];
        setMembers(rawMembers.map(normalizeMember));

        const rawSessions = Array.isArray(res.upcomingSessions)
          ? (res.upcomingSessions as Array<Record<string, unknown>>)
          : Array.isArray(res.sessions)
          ? (res.sessions as Array<Record<string, unknown>>)
          : [];
        setSessions(rawSessions.map(normalizeSession));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <AqaAmbientBackground>
        <AqaScreenHeader title={t("common.loading")} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={aqaColors.accent} accessibilityLabel={t("common.loading")} />
        </View>
      </AqaAmbientBackground>
    );
  }

  return (
    <AqaAmbientBackground>
      <AqaScreenHeader title={groupInfo.name} />

      <ScrollView contentContainerStyle={styles.container}>
        {isViewOnly ? (
          <View style={styles.viewOnlyBanner}>
            <Ionicons name="eye-outline" size={18} color={aqaColors.warning} accessible={false} />
            <Text style={styles.viewOnlyText}>{t("common.view_only")}</Text>
          </View>
        ) : null}

        {/* Group Summary Bezel Card */}
        <AqaDoubleBezelCard glowEffect padding={16}>
          <View style={styles.rowBetween}>
            <Text style={styles.groupName}>{groupInfo.name}</Text>
            {groupInfo.category ? (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>
                  {groupInfo.category.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.inlineRow}>
            <Ionicons name="location-outline" size={16} color={aqaColors.textMuted} accessible={false} />
            <Text style={styles.poolScheduleText}>{groupInfo.pool}</Text>
            <Ionicons name="time-outline" size={16} color={aqaColors.textMuted} accessible={false} />
            <Text style={styles.poolScheduleText}>
              {groupInfo.startTime} - {groupInfo.endTime}
            </Text>
          </View>
          {staffList.length > 0 ? (
            <View style={styles.staffWrap}>
              {staffList.map((st, idx) => (
                <View key={idx} style={styles.staffChip}>
                  <Text style={styles.staffChipText}>
                    {st.coachName} ({st.role.toUpperCase()})
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </AqaDoubleBezelCard>

        {/* Segmented Control: Swimmers Roster vs Sessions */}
        <AqaSegmentedControl
          values={[0, 1] as const}
          labels={[
            `${t("groups.roster")} (${members.length})`,
            `${t("groups.recent_sessions")} (${sessions.length})`,
          ]}
          selectedValue={activeTab}
          onValueChanged={setActiveTab}
        />

        {activeTab === 0 && members.length === 0 ? (
          <AqaDoubleBezelCard padding={28}>
            <View style={{ alignItems: "center", gap: 10 }}>
              <Ionicons name="people-outline" size={36} color={aqaColors.textLight} accessible={false} />
              <Text style={styles.emptyText}>{t("groups.empty_roster")}</Text>
            </View>
          </AqaDoubleBezelCard>
        ) : null}
        {activeTab === 1 && sessions.length === 0 ? (
          <AqaDoubleBezelCard padding={28}>
            <View style={{ alignItems: "center", gap: 10 }}>
              <Ionicons name="calendar-clear-outline" size={36} color={aqaColors.textLight} accessible={false} />
              <Text style={styles.emptyText}>{t("groups.empty_sessions")}</Text>
            </View>
          </AqaDoubleBezelCard>
        ) : null}

        {activeTab === 0 ? (
          members.map((m) => (
            <AqaDoubleBezelCard
              key={m.id}
              padding={13}
              onPress={() => router.push(`/members/${m.id}`)}
              accessibilityLabel={`${m.fullName}, ${t("groups.attendance_rate", { rate: m.attendanceRate })}, ${t(
                "groups.pres_abs_spoken",
                { present: m.totalPresences, absent: m.totalAbsences }
              )}`}
              accessibilityHint={t("suivi.open_file")}
            >
              <View style={styles.swimmerRow}>
                <View style={styles.mascotBox}>
                  <Image
                    source={getBadgeImageSource(m.stageAsset || m.badgeAsset)}
                    style={styles.mascotImg}
                    resizeMode="contain"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.rowBetween}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flex: 1,
                      }}
                    >
                      <Text numberOfLines={1} style={styles.swimmerName}>
                        {m.fullName}
                      </Text>
                      {m.isNewClient ? <AqaNewClientBadge compact /> : null}
                    </View>
                    <View style={styles.badgePill}>
                      <Text style={styles.badgePillText}>
                        {m.badgeLabel.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statsRow}>
                    <Text
                      style={[
                        styles.rateText,
                        {
                          color:
                            m.attendanceRate >= 75
                              ? aqaColors.success
                              : aqaColors.warning,
                        },
                      ]}
                    >
                      {t("groups.attendance_rate", { rate: m.attendanceRate })}
                    </Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.presAbsText}>
                      {t("groups.pres_abs", { present: m.totalPresences, absent: m.totalAbsences })}
                    </Text>
                    {m.totalDistanceMeters > 0 ? (
                      <>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.volText}>
                          {m.totalDistanceMeters}m
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>

                <Ionicons
                  name={isRtl ? "chevron-back" : "chevron-forward"}
                  size={20}
                  color={aqaColors.textMuted}
                  accessible={false}
                />
              </View>
            </AqaDoubleBezelCard>
          ))
        ) : (
          sessions.map((s) => (
            <AqaDoubleBezelCard key={s.id} padding={14}>
              <View style={styles.rowBetween}>
                <Text style={styles.sessionDateText}>{s.sessionDate}</Text>
                <Text style={styles.sessionTimeText}>
                  {s.startTime} - {s.endTime}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                {!isViewOnly ? (
                  <AqaIslandButton
                    label={t("today.quick_3_steps")}
                    icon="flash"
                    compact
                    secondary
                    onPress={() => router.push(`/sessions/${s.id}?mode=quick`)}
                    style={{ flex: 1 }}
                  />
                ) : null}
                <AqaIslandButton
                  label={t("today.open_attendance")}
                  icon="list"
                  compact
                  onPress={() => router.push(`/sessions/${s.id}`)}
                  style={{ flex: 1 }}
                />
              </View>
            </AqaDoubleBezelCard>
          ))
        )}
      </ScrollView>
    </AqaAmbientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  viewOnlyBanner: {
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: aqaColors.warning,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewOnlyText: {
    color: aqaColors.warning,
    fontSize: 12,
    fontWeight: "800",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  groupName: {
    flex: 1,
    color: aqaColors.textPrimary,
    fontSize: 17,
    fontWeight: "900",
  },
  catBadge: {
    backgroundColor: "rgba(14, 165, 233, 0.16)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: aqaColors.primaryHover,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  catBadgeText: {
    color: aqaColors.primaryHover,
    fontSize: 12,
    fontWeight: "900",
  },
  poolScheduleText: {
    color: aqaColors.textMuted,
    fontSize: 12.5,
  },
  staffWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  staffChip: {
    backgroundColor: "#060B16",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  staffChipText: {
    color: aqaColors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  swimmerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mascotBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#060B16",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 255, 0.3)",
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotImg: {
    width: "100%",
    height: "100%",
  },
  swimmerName: {
    color: aqaColors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  badgePill: {
    backgroundColor: "rgba(14, 165, 233, 0.14)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.4)",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgePillText: {
    color: aqaColors.primaryHover,
    fontSize: 12,
    fontWeight: "900",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 5,
  },
  rateText: {
    fontSize: 12,
    fontWeight: "800",
  },
  metaDot: {
    color: aqaColors.textLight,
    fontSize: 12,
  },
  presAbsText: {
    color: aqaColors.textMuted,
    fontSize: 12,
  },
  volText: {
    color: aqaColors.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  chevron: {
    color: aqaColors.textLight,
    fontSize: 15,
    fontWeight: "900",
  },
  sessionDateText: {
    color: aqaColors.textPrimary,
    fontSize: 13.5,
    fontWeight: "800",
  },
  sessionTimeText: {
    color: aqaColors.textMuted,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 8,
  },
  emptyText: {
    color: aqaColors.textMuted,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
});
