import React, { useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { coachApiClient } from "../../src/api/client";
import {
  AqaAmbientBackground,
  AqaDoubleBezelCard,
  AqaIslandButton,
  AqaSegmentedControl,
} from "../../src/components/AqaUi";
import { useCoachStore } from "../../src/state/CoachStore";
import { aqaColors } from "../../src/theme/tokens";

export default function ReplacementsScreen() {
  const router = useRouter();
  const { bootstrap, isRefreshing, refreshWorkspace, t, isRtl } =
    useCoachStore();

  const [selectedSegment, setSelectedSegment] = useState<number>(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineModalId, setDeclineModalId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const pending = bootstrap?.pendingRequests ?? [];
  const active = bootstrap?.activeReplacements ?? [];
  const absences = bootstrap?.myAbsences ?? [];

  const handleRespond = async (
    id: string,
    accept: boolean,
    reason?: string
  ) => {
    setBusyId(id);
    try {
      await coachApiClient.respondReplacement(id, accept, reason);
      await refreshWorkspace();
    } catch (err) {
      Alert.alert(t("common.error"), err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusyId(null);
    }
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
        {/* Header Card with Declare Absence CTA */}
        <AqaDoubleBezelCard padding={16}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t("replacements.title")}</Text>
              <Text style={styles.subtitle}>{t("replacements.subtitle")}</Text>
            </View>
            <AqaIslandButton
              label={t("replacements.declare_absence")}
              icon="add-circle-outline"
              compact
              onPress={() => router.push("/absences/new")}
            />
          </View>
        </AqaDoubleBezelCard>

        {/* 3-Tab Segmented Control */}
        <AqaSegmentedControl
          values={[0, 1, 2] as const}
          labels={[
            `${t("replacements.incoming")} (${pending.length})`,
            `${t("replacements.outgoing")} (${active.length})`,
            `${t("replacements.my_absences")} (${absences.length})`,
          ]}
          selectedValue={selectedSegment}
          onValueChanged={setSelectedSegment}
        />

        {/* Segment 0: Pending Requests */}
        {selectedSegment === 0 ? (
          pending.length === 0 ? (
            <AqaDoubleBezelCard padding={32}>
              <View style={styles.emptyWrap}>
                <Ionicons name="mail-open-outline" size={36} color={aqaColors.textLight} accessible={false} />
                <Text style={styles.emptyText}>{t("replacements.empty_pending")}</Text>
              </View>
            </AqaDoubleBezelCard>
          ) : (
            pending.map((rep) => (
              <AqaDoubleBezelCard
                key={rep.id}
                glowEffect
                accentColor={aqaColors.warning}
                padding={16}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>
                    {t("today.coverage_for", { name: rep.originalCoachName })}
                  </Text>
                  <View style={styles.pendingChip}>
                    <Ionicons name="hourglass-outline" size={12} color={aqaColors.warning} accessible={false} />
                    <Text style={styles.pendingChipText}>{t("replacements.pending")}</Text>
                  </View>
                </View>

                <Text style={styles.groupText}>
                  {rep.groupName}{" "}
                  {rep.category ? `(${rep.category.toUpperCase()})` : ""}
                </Text>
                <Text style={styles.metaText}>
                  {rep.sessionDate} • {rep.startTime} - {rep.endTime} •{" "}
                  {rep.pool}
                </Text>
                {rep.reason ? (
                  <Text style={styles.reasonText}>
                    {t("replacements.reason_prefix")} {rep.reason}
                  </Text>
                ) : null}

                <View style={styles.actionRow}>
                  <AqaIslandButton
                    label={t("replacements.decline")}
                    icon="close-circle-outline"
                    secondary
                    loading={busyId === rep.id}
                    onPress={() => {
                      setDeclineReason("");
                      setDeclineModalId(rep.id);
                    }}
                    style={{ flex: 1 }}
                  />
                  <AqaIslandButton
                    label={t("replacements.accept")}
                    icon="checkmark-circle-outline"
                    success
                    loading={busyId === rep.id}
                    onPress={() => void handleRespond(rep.id, true)}
                    style={{ flex: 1 }}
                  />
                </View>
              </AqaDoubleBezelCard>
            ))
          )
        ) : null}

        {/* Segment 1: Active Replacements */}
        {selectedSegment === 1 ? (
          active.length === 0 ? (
            <AqaDoubleBezelCard padding={32}>
              <View style={styles.emptyWrap}>
                <Ionicons name="swap-horizontal-outline" size={36} color={aqaColors.textLight} accessible={false} />
                <Text style={styles.emptyText}>{t("replacements.empty_active")}</Text>
              </View>
            </AqaDoubleBezelCard>
          ) : (
            active.map((rep) => (
              <AqaDoubleBezelCard key={rep.id} padding={16}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{rep.groupName}</Text>
                  <View style={styles.confirmedChip}>
                    <Text style={styles.confirmedChipText}>{rep.status}</Text>
                  </View>
                </View>
                <View style={styles.inlineRow}>
                  <Text style={styles.metaText}>{rep.originalCoachName}</Text>
                  <Ionicons name={isRtl ? "arrow-back" : "arrow-forward"} size={14} color={aqaColors.textMuted} accessible={false} />
                  <Text style={styles.metaText}>{rep.replacementCoachName}</Text>
                </View>
                <Text style={styles.metaText}>
                  {rep.sessionDate} • {rep.startTime} - {rep.endTime} •{" "}
                  {rep.pool}
                </Text>
              </AqaDoubleBezelCard>
            ))
          )
        ) : null}

        {/* Segment 2: My Absences */}
        {selectedSegment === 2 ? (
          absences.length === 0 ? (
            <AqaDoubleBezelCard padding={32}>
              <View style={styles.emptyWrap}>
                <Ionicons name="calendar-clear-outline" size={36} color={aqaColors.textLight} accessible={false} />
                <Text style={styles.emptyText}>{t("replacements.empty_absences")}</Text>
              </View>
            </AqaDoubleBezelCard>
          ) : (
            absences.map((abs) => (
              <AqaDoubleBezelCard key={abs.id} padding={16}>
                <View style={styles.rowBetween}>
                  <View style={[styles.inlineRow, { flex: 1 }]}>
                    <Text style={styles.cardTitle}>{abs.startDate}</Text>
                    <Ionicons name={isRtl ? "arrow-back" : "arrow-forward"} size={14} color={aqaColors.textMuted} accessible={false} />
                    <Text style={styles.cardTitle}>{abs.endDate}</Text>
                  </View>
                  <View style={styles.pendingChip}>
                    <Text style={styles.pendingChipText}>{abs.status}</Text>
                  </View>
                </View>
                <Text style={styles.groupText}>
                  {t("replacements.reason_prefix")} {abs.reason}
                </Text>
                {abs.notes ? (
                  <Text style={styles.reasonText}>{abs.notes}</Text>
                ) : null}
              </AqaDoubleBezelCard>
            ))
          )
        ) : null}
      </ScrollView>

      {/* Decline Reason Modal */}
      <Modal
        visible={declineModalId != null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDeclineModalId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox} accessibilityViewIsModal>
            <Text style={styles.modalTitle} accessibilityRole="header">
              {t("replacements.decline_title")}
            </Text>
            <Text style={styles.modalSub} nativeID="declineReasonLabel">
              {t("replacements.decline_hint")}
            </Text>
            <TextInput
              value={declineReason}
              onChangeText={setDeclineReason}
              accessibilityLabel={t("replacements.decline_hint")}
              accessibilityLabelledBy="declineReasonLabel"
              placeholder={t("replacements.decline_placeholder")}
              placeholderTextColor={aqaColors.textLight}
              style={styles.input}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <AqaIslandButton
                label={t("common.cancel")}
                compact
                secondary
                onPress={() => setDeclineModalId(null)}
                style={{ flex: 1 }}
              />
              <AqaIslandButton
                label={t("replacements.decline")}
                compact
                danger
                onPress={() => {
                  const target = declineModalId;
                  setDeclineModalId(null);
                  if (target) {
                    void handleRespond(target, false, declineReason.trim());
                  }
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AqaAmbientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: aqaColors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    color: aqaColors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: aqaColors.textMuted,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: aqaColors.textPrimary,
    fontSize: 14.5,
    fontWeight: "800",
  },
  pendingChip: {
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: aqaColors.warning,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pendingChipText: {
    color: aqaColors.warning,
    fontSize: 12,
    fontWeight: "900",
  },
  confirmedChip: {
    backgroundColor: "rgba(16, 185, 129, 0.16)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: aqaColors.success,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  confirmedChipText: {
    color: aqaColors.success,
    fontSize: 12,
    fontWeight: "900",
  },
  groupText: {
    color: aqaColors.accent,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 6,
  },
  metaText: {
    color: aqaColors.textMuted,
    fontSize: 12,
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },
  reasonText: {
    color: aqaColors.textLight,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 5,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.82)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#0B1120",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    padding: 18,
  },
  modalTitle: {
    color: aqaColors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  modalSub: {
    color: aqaColors.textMuted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#060B16",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    color: aqaColors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 48,
  },
  emptyWrap: {
    alignItems: "center",
    gap: 10,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
});
